import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeHeaderHash } from "@/lib/spreadsheet-parser";

/**
 * POST - Save current column mappings as a reusable template.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { importId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brokerImport = await prisma.brokerImport.findUnique({
      where: { id: params.importId },
      include: { columnMappings: { orderBy: { sourceColumnIndex: "asc" } } },
    });

    if (!brokerImport) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    const brokerId = brokerImport.assignedBrokerId || brokerImport.uploadedByBrokerId;
    if (!brokerId) {
      return NextResponse.json({ error: "No broker associated with this import" }, { status: 400 });
    }

    const { name } = await req.json();
    const templateName = name || `Import template from ${brokerImport.filename}`;
    const headerHash = computeHeaderHash(brokerImport.rawHeaders);

    // Upsert template
    const mappingsData = brokerImport.columnMappings.map((m) => ({
      sourceColumn: m.sourceColumn,
      sourceColumnIndex: m.sourceColumnIndex,
      targetField: m.targetField,
      targetFieldLabel: m.targetFieldLabel,
      targetBenefitCategory: m.targetBenefitCategory,
      transformRule: m.transformRule,
      detectedType: m.detectedType,
    }));

    const template = await prisma.brokerMappingTemplate.upsert({
      where: { brokerId_headerHash: { brokerId, headerHash } },
      update: {
        name: templateName,
        mappings: JSON.parse(JSON.stringify(mappingsData)),
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
      create: {
        brokerId,
        name: templateName,
        headerHash,
        mappings: JSON.parse(JSON.stringify(mappingsData)),
        usageCount: 1,
        lastUsedAt: new Date(),
      },
    });

    // Link template to import
    await prisma.brokerImport.update({
      where: { id: brokerImport.id },
      data: { templateId: template.id },
    });

    return NextResponse.json({
      templateId: template.id,
      name: template.name,
      message: "Template saved. Future uploads with the same columns will auto-match.",
    });
  } catch (error) {
    console.error("Save template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
