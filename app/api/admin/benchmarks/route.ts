import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Submission counts by country
    const companiesByCountry = await prisma.company.groupBy({
      by: ["country"],
      where: { surveyCompletedAt: { not: null } },
      _count: { id: true },
    });

    // Submission counts by industry
    const companiesByIndustry = await prisma.company.groupBy({
      by: ["industry"],
      where: { surveyCompletedAt: { not: null } },
      _count: { id: true },
    });

    // Submission counts by size band
    const companiesBySize = await prisma.company.groupBy({
      by: ["employeeCountRange"],
      where: { surveyCompletedAt: { not: null } },
      _count: { id: true },
    });

    // Total approved companies
    const totalApproved = await prisma.user.count({
      where: { status: "APPROVED", companyId: { not: null } },
    });

    // Total companies with completed surveys
    const totalSubmitted = await prisma.company.count({
      where: { surveyCompletedAt: { not: null } },
    });

    // Total benefit entries
    const totalBenefitEntries = await prisma.benefitEntry.count();

    // Data quality: companies missing salary data
    const missingSalary = await prisma.company.count({
      where: { surveyCompletedAt: { not: null }, averageSalary: null },
    });

    // Companies missing platform info
    const allSubmittedCompanyIds = await prisma.company.findMany({
      where: { surveyCompletedAt: { not: null } },
      select: { id: true },
    });
    const companiesWithPlatform = await prisma.platformInfo.findMany({
      where: { companyId: { in: allSubmittedCompanyIds.map((c) => c.id) } },
      select: { companyId: true },
      distinct: ["companyId"],
    });
    const missingPlatform = totalSubmitted - companiesWithPlatform.length;

    // Benefit entries with zero or null cost
    const entriesWithoutCost = await prisma.benefitEntry.count({
      where: {
        OR: [
          { annualCostPerEmployee: null },
          { annualCostPerEmployee: 0 },
        ],
      },
    });

    // Coverage: country x category matrix
    // Group benefit entries by country and category
    const coverageRaw = await prisma.benefitEntry.groupBy({
      by: ["country", "benefitCategory"],
      _count: { companyId: true },
    });

    // Also aggregate by company.country for legacy entries (country="")
    const legacyCoverage = await prisma.benefitEntry.findMany({
      where: { country: "" },
      include: { company: { select: { country: true } } },
    });
    const legacyMap = new Map<string, Set<string>>();
    for (const entry of legacyCoverage) {
      const key = `${entry.company.country}_${entry.benefitCategory}`;
      if (!legacyMap.has(key)) legacyMap.set(key, new Set());
      legacyMap.get(key)!.add(entry.companyId);
    }

    const coverage: { country: string; category: string; count: number }[] = coverageRaw
      .filter((r) => r.country !== "")
      .map((r) => ({
        country: r.country,
        category: r.benefitCategory as string,
        count: r._count.companyId,
      }));

    // Merge legacy
    for (const [key, companyIds] of Array.from(legacyMap.entries())) {
      const [ctry, cat] = key.split("_");
      const existing = coverage.find((c) => c.country === ctry && c.category === cat);
      if (existing) {
        existing.count += companyIds.size;
      } else {
        coverage.push({ country: ctry, category: cat, count: companyIds.size });
      }
    }

    return NextResponse.json({
      totalApproved,
      totalSubmitted,
      totalBenefitEntries,
      dataQuality: {
        missingSalary,
        missingPlatform,
        entriesWithoutCost,
      },
      byCountry: companiesByCountry.map((c) => ({
        country: c.country,
        count: c._count.id,
      })),
      byIndustry: companiesByIndustry.map((c) => ({
        industry: c.industry,
        count: c._count.id,
      })),
      bySize: companiesBySize.map((c) => ({
        sizeBand: c.employeeCountRange || "Unknown",
        count: c._count.id,
      })),
      coverage,
    });
  } catch (error) {
    console.error("Error fetching admin benchmarks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
