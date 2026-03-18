import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * PUT - Bulk update column mappings for an import.
 */
export async function PUT(
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

    if (
      !isAdmin &&
      brokerImport.uploadedByBrokerId !== session.user.id &&
      brokerImport.assignedBrokerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (brokerImport.status !== "REVIEW") {
      return NextResponse.json(
        { error: "Mappings can only be updated in REVIEW status" },
        { status: 400 }
      );
    }

    const { mappings } = await req.json();

    if (!Array.isArray(mappings)) {
      return NextResponse.json(
        { error: "mappings must be an array" },
        { status: 400 }
      );
    }

    // Update each mapping
    for (const m of mappings) {
      if (!m.id) continue;

      const updateData: Record<string, unknown> = {};

      if (m.targetField !== undefined) updateData.targetField = m.targetField;
      if (m.targetFieldLabel !== undefined) updateData.targetFieldLabel = m.targetFieldLabel;
      if (m.targetBenefitCategory !== undefined) updateData.targetBenefitCategory = m.targetBenefitCategory || null;
      if (m.transformRule !== undefined) updateData.transformRule = m.transformRule;

      // Set status based on whether user changed the AI mapping
      if (m.targetField === null) {
        updateData.status = "UNMAPPED";
      } else if (m.userOverridden) {
        updateData.status = "USER_OVERRIDDEN";
      } else {
        updateData.status = "USER_CONFIRMED";
      }

      await prisma.columnMapping.update({
        where: { id: m.id },
        data: updateData,
      });
    }

    const updated = await prisma.columnMapping.findMany({
      where: { importId: params.importId },
      orderBy: { sourceColumnIndex: "asc" },
    });

    return NextResponse.json({ mappings: updated });
  } catch (error) {
    console.error("Update mappings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
