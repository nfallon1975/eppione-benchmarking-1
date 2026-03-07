import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_REVIEW_STATUSES = ["CONFIRMED", "EDITED", "REJECTED"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { pointId, status, adminEditedValue, notes } = body;

  if (!pointId || !status) {
    return NextResponse.json(
      { error: "pointId and status are required" },
      { status: 400 }
    );
  }

  if (!VALID_REVIEW_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_REVIEW_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  if (status === "EDITED" && (adminEditedValue === undefined || adminEditedValue === null)) {
    return NextResponse.json(
      { error: "adminEditedValue is required when status is EDITED" },
      { status: 400 }
    );
  }

  // Verify the point belongs to this ingestion
  const point = await prisma.extractedDataPoint.findFirst({
    where: { id: pointId, ingestionId: params.id },
  });

  if (!point) {
    return NextResponse.json(
      { error: "Data point not found for this ingestion" },
      { status: 404 }
    );
  }

  const updateData: any = { status };
  if (adminEditedValue !== undefined) {
    updateData.adminEditedValue = parseFloat(adminEditedValue);
  }
  if (notes !== undefined) {
    updateData.notes = notes;
  }

  const updated = await prisma.extractedDataPoint.update({
    where: { id: pointId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  if (action !== "confirm_all" && action !== "reject_all") {
    return NextResponse.json(
      { error: "action must be 'confirm_all' or 'reject_all'" },
      { status: 400 }
    );
  }

  // Verify ingestion exists
  const ingestion = await prisma.pDFIngestion.findUnique({
    where: { id: params.id },
  });

  if (!ingestion) {
    return NextResponse.json({ error: "Ingestion not found" }, { status: 404 });
  }

  const newStatus = action === "confirm_all" ? "CONFIRMED" : "REJECTED";

  const result = await prisma.extractedDataPoint.updateMany({
    where: {
      ingestionId: params.id,
      status: "EXTRACTED",
    },
    data: {
      status: newStatus,
    },
  });

  return NextResponse.json({
    updated: result.count,
    newStatus,
  });
}
