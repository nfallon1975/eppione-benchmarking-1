import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unlink } from "fs/promises";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ingestion = await prisma.pDFIngestion.findUnique({
    where: { id: params.id },
    include: {
      extractedPoints: {
        orderBy: [
          { pageNumber: "asc" },
          { aiConfidence: "desc" },
        ],
      },
    },
  });

  if (!ingestion) {
    return NextResponse.json({ error: "Ingestion not found" }, { status: 404 });
  }

  return NextResponse.json(ingestion);
}

export async function DELETE(
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

  if (ingestion.status === "PROCESSING") {
    return NextResponse.json(
      { error: "Cannot delete an ingestion that is currently processing" },
      { status: 400 }
    );
  }

  // Delete extracted points first
  await prisma.extractedDataPoint.deleteMany({
    where: { ingestionId: params.id },
  });

  // Delete the ingestion record
  await prisma.pDFIngestion.delete({
    where: { id: params.id },
  });

  // Remove file from disk
  try {
    if (ingestion.filePath) await unlink(ingestion.filePath);
  } catch {
    // File may already be gone; continue
  }

  return NextResponse.json({ success: true });
}
