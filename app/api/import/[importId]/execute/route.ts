import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { executeImport } from "@/lib/import-executor";

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

    if (
      !isAdmin &&
      brokerImport.uploadedByBrokerId !== session.user.id &&
      brokerImport.assignedBrokerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (brokerImport.status !== "APPROVED") {
      return NextResponse.json(
        { error: `Cannot execute import in status: ${brokerImport.status}` },
        { status: 400 }
      );
    }

    // Set status to IMPORTING
    await prisma.brokerImport.update({
      where: { id: brokerImport.id },
      data: { status: "IMPORTING" },
    });

    try {
      const result = await executeImport(brokerImport.id);

      // Update import with results
      await prisma.brokerImport.update({
        where: { id: brokerImport.id },
        data: {
          status: "COMPLETED",
          companiesCreated: result.companiesCreated,
          companiesUpdated: result.companiesUpdated,
          entriesCreated: result.entriesCreated,
          validRows: result.entriesCreated,
          errorRows: result.errorRows,
          errorLog: result.errors.length > 0 ? JSON.parse(JSON.stringify(result.errors)) : undefined,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        status: "COMPLETED",
        ...result,
      });
    } catch (execError) {
      await prisma.brokerImport.update({
        where: { id: brokerImport.id },
        data: {
          status: "FAILED",
          errorLog: { error: String(execError) },
        },
      });

      console.error("Import execution error:", execError);
      return NextResponse.json(
        { error: "Import failed. Check error log for details." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Execute import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
