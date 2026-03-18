import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  parseSpreadsheet,
  analyseColumns,
  computeFileHash,
  computeHeaderHash,
} from "@/lib/spreadsheet-parser";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel", // xls
  "text/csv",
  "text/tab-separated-values",
  "application/octet-stream", // fallback
];

function getFileType(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls") return ext;
  if (ext === "csv") return "csv";
  if (ext === "tsv") return "tsv";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isBroker = session.user.role === "BROKER";

    if (!isAdmin && !isBroker) {
      return NextResponse.json(
        { error: "Only brokers and admins can import data" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sheetName = formData.get("sheetName") as string | null;
    const assignedBrokerId = formData.get("assignedBrokerId") as string | null;
    const anonymise = formData.get("anonymise") !== "false"; // default true

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const fileType = getFileType(file.name);
    if (!fileType) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload .xlsx, .csv, or .tsv" },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compute file hash for duplicate detection
    const fileHash = computeFileHash(buffer);

    // Check for duplicate upload
    const existingImport = await prisma.brokerImport.findFirst({
      where: { fileHash, status: { not: "FAILED" } },
    });
    if (existingImport) {
      return NextResponse.json(
        {
          error: "This file has already been uploaded",
          existingImportId: existingImport.id,
        },
        { status: 409 }
      );
    }

    // Save file to disk
    const uploadsDir = path.join(process.cwd(), "uploads", "imports");
    await mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, `${fileHash}-${file.name}`);
    await writeFile(filePath, buffer);

    // Parse spreadsheet
    const parsed = parseSpreadsheet(buffer, fileType, sheetName || undefined);
    const columns = analyseColumns(parsed.headers, parsed.rows);

    // Build sample data (first 5 rows)
    const sampleData = parsed.rows.slice(0, 5);

    // Determine broker IDs
    const uploadedByBrokerId = isBroker ? session.user.id : null;
    const uploadedByAdminId = isAdmin ? session.user.id : null;
    const effectiveBrokerId = isBroker
      ? session.user.id
      : assignedBrokerId || null;

    // Check for matching template
    const headerHash = computeHeaderHash(parsed.headers);
    const templateBrokerId = effectiveBrokerId;
    let matchedTemplate = null;

    if (templateBrokerId) {
      matchedTemplate = await prisma.brokerMappingTemplate.findUnique({
        where: {
          brokerId_headerHash: {
            brokerId: templateBrokerId,
            headerHash,
          },
        },
      });
    }

    // Create BrokerImport record
    const brokerImport = await prisma.brokerImport.create({
      data: {
        filename: file.name,
        fileHash,
        filePath,
        fileType,
        sheetName: parsed.selectedSheet,
        uploadedByBrokerId,
        uploadedByAdminId,
        assignedBrokerId: effectiveBrokerId,
        status: matchedTemplate ? "REVIEW" : "PARSED",
        headerRow: parsed.headerRow,
        totalRows: parsed.totalRows,
        rawHeaders: parsed.headers,
        sampleData: JSON.parse(JSON.stringify(sampleData)),
        templateId: matchedTemplate?.id || null,
        anonymise,
      },
    });

    // If template matched, create column mappings from template
    if (matchedTemplate) {
      const templateMappings = matchedTemplate.mappings as Array<{
        sourceColumn: string;
        sourceColumnIndex: number;
        targetField: string | null;
        targetFieldLabel: string | null;
        targetBenefitCategory: string | null;
        transformRule: string | null;
        detectedType: string;
      }>;

      for (const tm of templateMappings) {
        const colInfo = columns.find((c) => c.header === tm.sourceColumn);
        await prisma.columnMapping.create({
          data: {
            importId: brokerImport.id,
            sourceColumn: tm.sourceColumn,
            sourceColumnIndex: tm.sourceColumnIndex,
            targetField: tm.targetField,
            targetFieldLabel: tm.targetFieldLabel,
            targetBenefitCategory: tm.targetBenefitCategory as never,
            confidence: 1.0,
            status: "USER_CONFIRMED",
            sampleValues: colInfo?.sampleValues || [],
            detectedType: colInfo?.detectedType || tm.detectedType || "string",
            transformRule: tm.transformRule,
            aiReasoning: "Loaded from saved mapping template",
          },
        });
      }

      // Increment template usage
      await prisma.brokerMappingTemplate.update({
        where: { id: matchedTemplate.id },
        data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
      });
    }

    return NextResponse.json({
      importId: brokerImport.id,
      status: brokerImport.status,
      filename: file.name,
      sheetNames: parsed.sheetNames,
      selectedSheet: parsed.selectedSheet,
      headerRow: parsed.headerRow,
      totalRows: parsed.totalRows,
      headers: parsed.headers,
      columns: columns.map((c) => ({
        header: c.header,
        index: c.index,
        detectedType: c.detectedType,
        sampleValues: c.sampleValues,
        completeness: Math.round(
          ((c.totalCount - c.emptyCount) / c.totalCount) * 100
        ),
      })),
      templateMatched: !!matchedTemplate,
      templateName: matchedTemplate?.name || null,
    });
  } catch (error) {
    console.error("Import upload error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
