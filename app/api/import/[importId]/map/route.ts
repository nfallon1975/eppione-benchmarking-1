import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mapColumnsWithAI } from "@/lib/ai-column-mapper";

export async function POST(
  req: NextRequest,
  { params }: { params: { importId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "ADMIN";

    const brokerImport = await prisma.brokerImport.findUnique({
      where: { id: params.importId },
    });

    if (!brokerImport) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    // Auth check: must be the uploading broker, assigned broker, or admin
    if (
      !isAdmin &&
      brokerImport.uploadedByBrokerId !== session.user.id &&
      brokerImport.assignedBrokerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (brokerImport.status !== "PARSED") {
      return NextResponse.json(
        { error: `Cannot map import in status: ${brokerImport.status}` },
        { status: 400 }
      );
    }

    // Set status to MAPPING
    await prisma.brokerImport.update({
      where: { id: brokerImport.id },
      data: { status: "MAPPING" },
    });

    try {
      // Build column info from stored data
      const sampleData = brokerImport.sampleData as Record<string, string>[] | null;
      const columns = brokerImport.rawHeaders.map((header, index) => {
        const sampleValues = sampleData
          ? sampleData
              .map((row) => row[header] || "")
              .filter((v) => v.length > 0)
              .slice(0, 5)
          : [];

        // Simple type detection from samples
        let detectedType = "string";
        if (sampleValues.length > 0) {
          const numCount = sampleValues.filter(
            (v) => !isNaN(Number(v.replace(/,/g, "")))
          ).length;
          const boolCount = sampleValues.filter((v) =>
            ["yes", "no", "y", "n", "true", "false"].includes(v.toLowerCase())
          ).length;
          if (numCount > sampleValues.length / 2) detectedType = "number";
          else if (boolCount > sampleValues.length / 2)
            detectedType = "boolean";
        }

        return { header, index, sampleValues, detectedType };
      });

      // Call AI
      const mappings = await mapColumnsWithAI(columns, brokerImport.totalRows);

      // Delete any existing column mappings (in case of re-mapping)
      await prisma.columnMapping.deleteMany({
        where: { importId: brokerImport.id },
      });

      // Create ColumnMapping records
      for (const mapping of mappings) {
        const colIndex = columns.findIndex(
          (c) => c.header === mapping.sourceColumn
        );
        if (colIndex === -1) continue;

        await prisma.columnMapping.create({
          data: {
            importId: brokerImport.id,
            sourceColumn: mapping.sourceColumn,
            sourceColumnIndex: colIndex,
            targetField: mapping.targetField,
            targetFieldLabel: mapping.targetFieldLabel,
            targetBenefitCategory: mapping.targetBenefitCategory as never,
            confidence: mapping.confidence,
            status: "AI_MAPPED",
            sampleValues: columns[colIndex].sampleValues,
            detectedType: mapping.detectedType,
            transformRule: mapping.transformRule,
            aiReasoning: mapping.reasoning,
          },
        });
      }

      // Also create UNMAPPED entries for any columns the AI didn't return
      const mappedColumns = new Set(mappings.map((m) => m.sourceColumn));
      for (const col of columns) {
        if (!mappedColumns.has(col.header)) {
          await prisma.columnMapping.create({
            data: {
              importId: brokerImport.id,
              sourceColumn: col.header,
              sourceColumnIndex: col.index,
              targetField: null,
              targetFieldLabel: null,
              confidence: 0,
              status: "UNMAPPED",
              sampleValues: col.sampleValues,
              detectedType: col.detectedType,
              aiReasoning: "Column not matched by AI",
            },
          });
        }
      }

      // Update status to REVIEW
      await prisma.brokerImport.update({
        where: { id: brokerImport.id },
        data: { status: "REVIEW" },
      });

      // Return mappings
      const savedMappings = await prisma.columnMapping.findMany({
        where: { importId: brokerImport.id },
        orderBy: { sourceColumnIndex: "asc" },
      });

      return NextResponse.json({
        importId: brokerImport.id,
        status: "REVIEW",
        mappings: savedMappings,
      });
    } catch (aiError) {
      // If AI fails, set status back to PARSED so user can retry
      await prisma.brokerImport.update({
        where: { id: brokerImport.id },
        data: { status: "PARSED", errorLog: { aiError: String(aiError) } },
      });
      throw aiError;
    }
  } catch (error) {
    console.error("AI mapping error:", error);
    return NextResponse.json(
      { error: "Failed to map columns. Please try again." },
      { status: 500 }
    );
  }
}
