import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");
    const type = searchParams.get("type");
    const reliability = searchParams.get("reliability");
    const isActiveParam = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (country) where.country = country;
    if (type) where.type = type;
    if (reliability) where.reliability = reliability;
    if (isActiveParam !== null) where.isActive = isActiveParam === "true";

    const sources = await prisma.dataSourceReference.findMany({
      where,
      include: { _count: { select: { sourceLinks: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(sources);
  } catch (error) {
    console.error("GET /api/admin/sources error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const source = await prisma.dataSourceReference.create({
      data: {
        type: body.type,
        title: body.title,
        publisher: body.publisher,
        country: body.country ?? null,
        url: body.url ?? null,
        publicationDate: body.publicationDate ? new Date(body.publicationDate) : null,
        isPubliclyAccessible: body.isPubliclyAccessible ?? true,
        summary: body.summary,
        reliability: body.reliability,
        verificationNotes: body.notes ?? null,
        addedById: session.user.id,
      },
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/sources error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
