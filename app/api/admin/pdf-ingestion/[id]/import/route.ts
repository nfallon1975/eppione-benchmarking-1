import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { importConfirmedPoints } from "@/lib/pdf-extraction";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ingestion = await prisma.pDFIngestion.findUnique({
    where: { id: params.id },
  });

  if (!ingestion) {
    return NextResponse.json({ error: "Ingestion not found" }, { status: 404 });
  }

  try {
    const result = await importConfirmedPoints(params.id);

    return NextResponse.json({
      imported: result.imported,
      skipped: result.skipped,
      conflicts: result.conflicts,
    });
  } catch (err) {
    console.error(`Import failed for ingestion ${params.id}:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
