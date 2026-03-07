import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sources = await prisma.baselineDataSource.findMany({
      orderBy: [{ year: "desc" }, { country: "asc" }],
      include: { _count: { select: { benchmarks: true } } },
    });

    return NextResponse.json(sources);
  } catch (error) {
    console.error("GET /api/admin/baseline error:", error);
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
    const source = await prisma.baselineDataSource.create({
      data: { ...body, importedById: session.user.id },
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/baseline error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
