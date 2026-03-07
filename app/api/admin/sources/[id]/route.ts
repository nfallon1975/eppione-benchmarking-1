import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const source = await prisma.dataSourceReference.findUnique({
      where: { id: params.id },
      include: {
        sourceLinks: true,
        addedBy: { select: { id: true, name: true, email: true } },
        lastVerifiedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    return NextResponse.json(source);
  } catch (error) {
    console.error("GET /api/admin/sources/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { verify, ...fields } = body;

    const data: Record<string, unknown> = { ...fields };
    if (fields.publicationDate) {
      data.publicationDate = new Date(fields.publicationDate);
    }
    if (verify) {
      data.lastVerifiedAt = new Date();
      data.lastVerifiedById = session.user.id;
    }

    const source = await prisma.dataSourceReference.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(source);
  } catch (error) {
    console.error("PATCH /api/admin/sources/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.dataSourceReference.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/sources/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
