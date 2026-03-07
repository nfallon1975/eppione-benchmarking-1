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

    const { source, benchmarks } = await req.json();

    if (!source || !benchmarks || !Array.isArray(benchmarks)) {
      return NextResponse.json(
        { error: "source (object) and benchmarks (array) are required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const newSource = await tx.baselineDataSource.create({
        data: { ...source, importedById: session.user.id },
      });

      if (benchmarks.length > 0) {
        await tx.baselineBenchmark.createMany({
          data: benchmarks.map((b: any) => ({ ...b, sourceId: newSource.id })),
        });
      }

      return await tx.baselineDataSource.findUnique({
        where: { id: newSource.id },
        include: { benchmarks: true },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/baseline/import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
