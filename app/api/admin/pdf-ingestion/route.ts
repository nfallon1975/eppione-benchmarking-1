import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeFileHash, estimateExtractionCost } from "@/lib/pdf-extraction";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where = status ? { status: status as "UPLOADED" | "PROCESSING" | "REVIEW_READY" | "APPROVED" | "REJECTED" | "ERROR" } : {};

  const ingestions = await prisma.pDFIngestion.findMany({
    where,
    include: {
      _count: {
        select: { extractedPoints: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(ingestions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const sourceName = formData.get("sourceName") as string;
  const sourceCountry = formData.get("sourceCountry") as string;
  const sourcePublisher = formData.get("sourcePublisher") as string;
  const sourceYear = formData.get("sourceYear") as string;
  const sourceType = formData.get("sourceType") as string;
  const licenseNotes = (formData.get("licenseNotes") as string) || "";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!sourceName || !sourceCountry || !sourcePublisher || !sourceYear || !sourceType) {
    return NextResponse.json(
      { error: "Missing required fields: sourceName, sourceCountry, sourcePublisher, sourceYear, sourceType" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = computeFileHash(buffer);

  // Check for duplicate
  const existing = await prisma.pDFIngestion.findFirst({
    where: { fileHash },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Duplicate file detected", existingIngestionId: existing.id },
      { status: 409 }
    );
  }

  // Save file to uploads directory
  const uploadsDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const uniqueName = `${randomUUID()}_${file.name}`;
  const filePath = path.join(uploadsDir, uniqueName);
  await writeFile(filePath, buffer);

  const costEstimate = estimateExtractionCost(0); // page count determined during processing

  const ingestion = await prisma.pDFIngestion.create({
    data: {
      filename: file.name,
      fileHash,
      filePath,
      pageCount: 0,
      uploadedById: session.user.id,
      status: "UPLOADED",
      sourceName,
      sourceCountry,
      sourcePublisher,
      sourceYear: parseInt(sourceYear, 10),
      sourceType: sourceType as "INDUSTRY_SURVEY" | "INSURER_REPORT" | "GOVERNMENT_DATA" | "CONSULTANCY_REPORT" | "TRADE_BODY" | "OTHER",
      licenseNotes,
      processingCost: 0,
    },
  });

  return NextResponse.json({ ...ingestion, costEstimate }, { status: 201 });
}
