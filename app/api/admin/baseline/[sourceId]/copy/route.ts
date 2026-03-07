import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { sourceId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { year } = await req.json();
    if (!year || typeof year !== "number") {
      return NextResponse.json({ error: "year (number) is required" }, { status: 400 });
    }

    const existing = await prisma.baselineDataSource.findUnique({
      where: { id: params.sourceId },
      include: { benchmarks: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newSource = await tx.baselineDataSource.create({
        data: {
          name: existing.name,
          publisher: existing.publisher,
          country: existing.country,
          year,
          sampleSize: existing.sampleSize,
          sourceUrl: existing.sourceUrl,
          sourceType: existing.sourceType,
          importedById: session.user.id,
          notes: existing.notes,
          licenseNotes: existing.licenseNotes,
        },
      });

      if (existing.benchmarks.length > 0) {
        await tx.baselineBenchmark.createMany({
          data: existing.benchmarks.map((b) => ({
            sourceId: newSource.id,
            country: b.country,
            industry: b.industry,
            industryNACE: b.industryNACE,
            companySize: b.companySize,
            salaryBand: b.salaryBand,
            benefitCategory: b.benefitCategory,
            metricType: b.metricType,
            metricLabel: b.metricLabel,
            value: b.value,
            unit: b.unit,
            currency: b.currency,
            percentile25: b.percentile25,
            percentile75: b.percentile75,
            notes: b.notes,
          })),
        });
      }

      return await tx.baselineDataSource.findUnique({
        where: { id: newSource.id },
        include: { benchmarks: true },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/baseline/[sourceId]/copy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
