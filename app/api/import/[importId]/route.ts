import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
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
      include: {
        columnMappings: { orderBy: { sourceColumnIndex: "asc" } },
        uploadedByBroker: { select: { name: true, email: true } },
        assignedBroker: { select: { id: true, name: true, email: true } },
        template: { select: { id: true, name: true } },
      },
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

    return NextResponse.json(brokerImport);
  } catch (error) {
    console.error("Get import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.anonymise === "boolean") {
      updates.anonymise = body.anonymise;
    }
    if (body.assignedBrokerId !== undefined && isAdmin) {
      updates.assignedBrokerId = body.assignedBrokerId || null;
    }
    if (body.status === "APPROVED" && brokerImport.status === "REVIEW") {
      updates.status = "APPROVED";
    }
    if (body.status === "CANCELLED") {
      updates.status = "CANCELLED" as never; // We'll allow cancellation
    }
    if (body.sheetName) {
      updates.sheetName = body.sheetName;
    }

    const updated = await prisma.brokerImport.update({
      where: { id: params.importId },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
