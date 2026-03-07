import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sourceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const benchmarks = await prisma.baselineBenchmark.findMany({
      where: { sourceId: params.sourceId },
    });

    return NextResponse.json(benchmarks);
  } catch (error) {
    console.error("GET /api/admin/baseline/[sourceId]/benchmarks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { sourceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    const benchmarks = await prisma.baselineBenchmark.createMany({
      data: items.map((item: any) => ({ ...item, sourceId: params.sourceId })),
    });

    return NextResponse.json(benchmarks, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/baseline/[sourceId]/benchmarks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
