import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadCurrencyRates } from "@/lib/currency";
import {
  calculateCategoryBenchmarks,
  calculateCompanyPosition,
  filterCompanyIds,
} from "@/lib/benchmarking";
import type {
  BenchmarkFilters,
  BenchmarkGrouping,
} from "@/lib/benchmarking-types";
import { prismaEntryToCompanyBenefitData } from "@/lib/benefit-data-mapping";
import { calculateBenefitHealthScore } from "@/lib/benefit-health-score";
import { buildReferenceCategories } from "@/lib/reference-benchmarking";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "No company linked" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        country: true,
        industry: true,
        employeeCountRange: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Use query param country if provided, otherwise fall back to primary
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country") || company.country;
    const industry = company.industry;

    // Determine target currency
    let targetCurrency = "EUR";
    const countryConfig = await prisma.countryConfig.findUnique({
      where: { countryCode: country },
      select: { currency: true },
    });
    if (countryConfig) targetCurrency = countryConfig.currency;

    const rates = await loadCurrencyRates();

    // Only include companies from APPROVED users
    const approvedUsers = await prisma.user.findMany({
      where: { status: "APPROVED", companyId: { not: null } },
      select: { companyId: true },
    });
    const approvedCompanyIds = new Set(
      approvedUsers.map((u) => u.companyId).filter((id): id is string => id !== null)
    );

    // Get all companies that have completed the survey
    const allCompanies = approvedCompanyIds.size > 0
      ? await prisma.company.findMany({
          where: {
            id: { in: Array.from(approvedCompanyIds) },
            surveyCompletedAt: { not: null },
          },
          select: {
            id: true,
            country: true,
            industry: true,
            employeeCount: true,
            employeeCountRange: true,
            surveyCompletedAt: true,
          },
        })
      : [];

    // Multi-country: companies with benefits in the target country
    const companiesWithBenefitsInCountry = approvedCompanyIds.size > 0
      ? await prisma.benefitEntry.findMany({
          where: {
            companyId: { in: Array.from(approvedCompanyIds) },
            country: country,
          },
          select: { companyId: true },
          distinct: ["companyId"],
        })
      : [];
    const countryBenefitCompanyIds = new Set(
      companiesWithBenefitsInCountry.map((b) => b.companyId)
    );

    const filters: BenchmarkFilters = {
      country,
      industry: industry || undefined,
    };
    const grouping: BenchmarkGrouping = "country_industry";

    const companiesInScope = allCompanies.filter(
      (c) => c.country === country || countryBenefitCompanyIds.has(c.id)
    );

    const matchingIds = filterCompanyIds(
      companiesInScope.map((c) => ({
        ...c,
        country: countryBenefitCompanyIds.has(c.id) ? country : c.country,
      })),
      filters,
      grouping
    );

    // Fetch the user's own benefits (needed for both peer and reference paths)
    const myBenefitEntries = await prisma.benefitEntry.findMany({
      where: { companyId },
      include: { company: { select: { country: true } } },
    });
    const myBenefits = myBenefitEntries
      .filter((e) => {
        const entryCountry = e.country || e.company.country;
        return entryCountry === country || e.country === "";
      })
      .map((e) => prismaEntryToCompanyBenefitData(e));

    if (matchingIds.size === 0) {
      // Fallback to reference data
      const referenceCategories = await buildReferenceCategories(
        country,
        targetCurrency,
        rates
      );
      if (referenceCategories.length === 0 || myBenefits.length === 0) {
        return NextResponse.json({ error: "Insufficient data" }, { status: 404 });
      }

      const companyPositions = calculateCompanyPosition(
        myBenefits,
        referenceCategories,
        targetCurrency,
        rates
      );
      const score = calculateBenefitHealthScore(
        companyPositions,
        referenceCategories,
        myBenefits
      );

      return NextResponse.json({
        ...score,
        country,
        totalCompanies: 0,
        dataQuality: "reference",
        dataAsOf: new Date().toISOString(),
      });
    }

    const totalCompanies = matchingIds.size;

    // Fetch benefit entries filtered by country
    const benefitEntries = await prisma.benefitEntry.findMany({
      where: {
        companyId: { in: Array.from(matchingIds) },
      },
      include: {
        company: { select: { country: true } },
      },
    });

    const filteredBenefits = benefitEntries
      .filter((e) => {
        const entryCountry = e.country || e.company.country;
        return entryCountry === country;
      })
      .map((e) => prismaEntryToCompanyBenefitData(e));

    // Category benchmarks
    const categories = calculateCategoryBenchmarks(
      filteredBenefits,
      totalCompanies,
      targetCurrency,
      rates
    );

    // Company's own benefits & position
    const peerMyBenefits = filteredBenefits.filter((b) => b.companyId === companyId);
    const companyPositions = calculateCompanyPosition(
      peerMyBenefits,
      categories,
      targetCurrency,
      rates
    );

    // Calculate health score
    const score = calculateBenefitHealthScore(
      companyPositions,
      categories,
      peerMyBenefits
    );

    // Data as of
    const matchingCompanies = companiesInScope.filter((c) => matchingIds.has(c.id));
    const latestDate = matchingCompanies.reduce((latest, c) => {
      if (c.surveyCompletedAt && (!latest || c.surveyCompletedAt > latest)) {
        return c.surveyCompletedAt;
      }
      return latest;
    }, null as Date | null);

    return NextResponse.json({
      ...score,
      country,
      totalCompanies,
      dataAsOf: latestDate?.toISOString() || new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error calculating benefit health score:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
