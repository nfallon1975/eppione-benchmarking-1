import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const link = await prisma.dataPointSourceLink.create({
      data: {
        sourceId: body.sourceId,
        linkedType: body.linkedType,
        linkedId: body.linkedId,
        relevance: body.relevance,
        specificCitation: body.specificCitation ?? null,
        extractedValue: body.extractedValue ?? null,
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/sources/link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    await prisma.dataPointSourceLink.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/sources/link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
