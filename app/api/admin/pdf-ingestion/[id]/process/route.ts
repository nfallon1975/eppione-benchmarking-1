import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processPdfIngestion } from "@/lib/pdf-extraction";

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

  if (ingestion.status !== "UPLOADED" && ingestion.status !== "ERROR") {
    return NextResponse.json(
      { error: "Ingestion must be in UPLOADED or ERROR status to process" },
      { status: 400 }
    );
  }

  // Fire and forget
  processPdfIngestion(params.id).catch(async (err) => {
    console.error(`PDF processing failed for ingestion ${params.id}:`, err);
    await prisma.pDFIngestion.update({
      where: { id: params.id },
      data: {
        status: "ERROR",
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
  });

  return NextResponse.json(
    { message: "Processing started", ingestionId: params.id },
    { status: 202 }
  );
}
