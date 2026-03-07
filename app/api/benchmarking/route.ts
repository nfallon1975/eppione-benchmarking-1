import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadCurrencyRates } from "@/lib/currency";
import {
  calculateCategoryBenchmarks,
  calculatePlatformBenchmarks,
  calculateCompanyPosition,
  calculatePensionSalaryBandStats,
  filterCompanyIds,
  ANONYMITY_MINIMUM,
} from "@/lib/benchmarking";
import type {
  BenchmarkFilters,
  BenchmarkGrouping,
  BenchmarkResult,
  DataQuality,
  PlatformData,
} from "@/lib/benchmarking-types";
import { prismaEntryToCompanyBenefitData } from "@/lib/benefit-data-mapping";
import { buildReferenceCategories } from "@/lib/reference-benchmarking";
import { buildBaselineCategories } from "@/lib/baseline-benchmarking";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");
    let industry = searchParams.get("industry");
    const sizeBand = searchParams.get("sizeBand");
    const salaryBand = searchParams.get("salaryBand");
    const grouping = (searchParams.get("grouping") || "country_industry") as BenchmarkGrouping;
    const currency = searchParams.get("currency");

    // Admin override: allow viewing benchmarks for any company
    const overrideCompanyId = searchParams.get("companyId");

    // CLIENT users are locked to their company's industry
    // ADMIN users can override to view as a specific company
    let userCompanyId: string | null = null;
    if (session.user.role === "ADMIN" && overrideCompanyId) {
      userCompanyId = overrideCompanyId;
      const company = await prisma.company.findUnique({
        where: { id: overrideCompanyId },
        select: { industry: true },
      });
      if (company?.industry) {
        industry = company.industry;
      }
    } else if (session.user.role === "CLIENT" && session.user.companyId) {
      userCompanyId = session.user.companyId;
      const company = await prisma.company.findUnique({
        where: { id: session.user.companyId },
        select: { industry: true },
      });
      if (company?.industry) {
        industry = company.industry;
      }
    }

    if (!country) {
      return NextResponse.json({ error: "Country parameter is required" }, { status: 400 });
    }

    // Determine target currency (default to country's currency)
    let targetCurrency = currency || "EUR";
    if (!currency) {
      const countryConfig = await prisma.countryConfig.findUnique({
        where: { countryCode: country },
        select: { currency: true },
      });
      if (countryConfig) targetCurrency = countryConfig.currency;
    }

    const rates = await loadCurrencyRates();

    // Only include companies from APPROVED users
    const approvedUsers = await prisma.user.findMany({
      where: { status: "APPROVED", companyId: { not: null } },
      select: { companyId: true },
    });
    const approvedCompanyIds = new Set(
      approvedUsers.map((u) => u.companyId).filter((id): id is string => id !== null)
    );

    if (approvedCompanyIds.size === 0) {
      // No approved companies at all — try reference data, then baseline
      const fallbackResult = await buildFallbackResult(
        country, industry, sizeBand, grouping, targetCurrency, rates, userCompanyId
      );
      if (fallbackResult) return NextResponse.json(fallbackResult);
      return NextResponse.json(emptyResult(country, industry, sizeBand, grouping, targetCurrency));
    }

    // Get all companies that have completed the survey
    const allCompanies = await prisma.company.findMany({
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
        averageSalary: true,
        averageSalaryCurrency: true,
        surveyCompletedAt: true,
      },
    });

    // Also include companies that have benefits in the target country via BenefitEntry.country
    // (multi-country companies)
    const companiesWithBenefitsInCountry = await prisma.benefitEntry.findMany({
      where: {
        companyId: { in: Array.from(approvedCompanyIds) },
        country: country,
      },
      select: { companyId: true },
      distinct: ["companyId"],
    });
    const countryBenefitCompanyIds = new Set(companiesWithBenefitsInCountry.map((b) => b.companyId));

    // Build the filter
    const filters: BenchmarkFilters = {
      country,
      industry: industry || undefined,
      sizeBand: sizeBand || undefined,
      salaryBand: salaryBand || undefined,
    };

    // For filtering: include companies that are either in the target country or have benefits there
    const companiesInScope = allCompanies.filter(
      (c) => c.country === country || countryBenefitCompanyIds.has(c.id)
    );

    // Fetch salary bands from CompanyCountryProfiles for filtering
    const countryProfiles = await prisma.companyCountryProfile.findMany({
      where: {
        companyId: { in: companiesInScope.map((c) => c.id) },
        country: country,
      },
      select: { companyId: true, salaryBand: true },
    });
    const salaryBandMap = new Map(countryProfiles.map((p) => [p.companyId, p.salaryBand]));

    const scopeForFilter = companiesInScope.map((c) => ({
      ...c,
      // For multi-country companies, treat them as being in the country where they have benefits
      country: countryBenefitCompanyIds.has(c.id) ? country : c.country,
      salaryBand: salaryBandMap.get(c.id) ?? null,
    }));

    let matchingIds = filterCompanyIds(scopeForFilter, filters, grouping);
    let dataQuality: DataQuality = "industry";
    let dataQualityMessage = "";
    let effectiveGrouping = grouping;

    // --- Three-tier fallback ---

    // Tier 1 → Tier 2: If not enough industry peers, try cross-industry
    if (
      matchingIds.size < ANONYMITY_MINIMUM &&
      effectiveGrouping === "country_industry" &&
      filters.industry &&
      filters.industry !== "all"
    ) {
      const crossFilters: BenchmarkFilters = {
        country,
        industry: undefined,
        sizeBand: filters.sizeBand,
      };
      const crossIds = filterCompanyIds(scopeForFilter, crossFilters, "country_only");
      if (crossIds.size >= ANONYMITY_MINIMUM) {
        matchingIds = crossIds;
        dataQuality = "cross_industry";
        effectiveGrouping = "country_only";
      }
    }

    // Tier 2 → Tier 3: If still not enough, try reference/baseline data
    if (matchingIds.size < ANONYMITY_MINIMUM) {
      const fallbackResult = await buildFallbackResult(
        country, industry, sizeBand, effectiveGrouping, targetCurrency, rates, userCompanyId
      );
      if (fallbackResult) return NextResponse.json(fallbackResult);
      return NextResponse.json(
        emptyResult(country, industry, sizeBand, grouping, targetCurrency)
      );
    }

    // --- We have enough companies, proceed with real data ---

    const matchingCompanies = companiesInScope.filter((c) => matchingIds.has(c.id));
    const totalCompanies = matchingCompanies.length;

    if (dataQuality === "industry") {
      dataQualityMessage = `Industry-specific benchmarks from ${totalCompanies} peer companies`;
    } else {
      dataQualityMessage = `Limited industry data \u2014 showing cross-industry benchmarks from ${totalCompanies} companies`;
    }

    // Avg employee count
    const totalEmployees = matchingCompanies.reduce((sum, c) => sum + c.employeeCount, 0);
    const avgEmployeeCount = Math.round(totalEmployees / totalCompanies);

    // Avg salary (converted to target currency)
    const companiesWithSalary = matchingCompanies.filter((c) => c.averageSalary !== null);
    let avgSalary: number | null = null;
    if (companiesWithSalary.length > 0) {
      const totalSalary = companiesWithSalary.reduce((sum, c) => {
        const salCurrency = c.averageSalaryCurrency || "EUR";
        return sum + (c.averageSalary ? convertAmount(c.averageSalary, salCurrency, targetCurrency, rates) : 0);
      }, 0);
      avgSalary = Math.round(totalSalary / companiesWithSalary.length);
    }

    // Fetch benefit entries — filter by country on the BenefitEntry itself
    // Legacy data has country="" so fall back to Company.country
    const benefitEntries = await prisma.benefitEntry.findMany({
      where: {
        companyId: { in: Array.from(matchingIds) },
      },
      include: {
        company: { select: { country: true } },
        healthLimits: true,
      },
    });

    // Filter: entry.country matches OR (entry.country == "" AND company.country matches)
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

    // Platform benchmarks
    const platformEntries = await prisma.platformInfo.findMany({
      where: { companyId: { in: Array.from(matchingIds) } },
    });
    const platformData: PlatformData[] = platformEntries.map((p) => ({
      companyId: p.companyId,
      usesPlatform: p.usesPlatform,
      platformType: p.platformType,
      annualPlatformFee: p.annualPlatformFee,
      feeCurrency: p.feeCurrency,
      feeModel: p.feeModel,
      platformSatisfactionScore: p.platformSatisfactionScore,
    }));
    const platform = calculatePlatformBenchmarks(platformData, targetCurrency, rates);

    // Pension salary band stats
    const pensionEntries = filteredBenefits.filter((b) => b.benefitCategory === "PENSION");
    const pensionSalaryBandStats = calculatePensionSalaryBandStats(
      pensionEntries,
      countryProfiles.map((p) => ({ companyId: p.companyId, salaryBand: p.salaryBand }))
    );

    // Company position (for CLIENT users)
    let companyPosition = null;
    if (userCompanyId && matchingIds.has(userCompanyId)) {
      const myBenefits = filteredBenefits.filter((b) => b.companyId === userCompanyId);
      companyPosition = calculateCompanyPosition(myBenefits, categories, targetCurrency, rates);
    }

    // Data as of
    const latestDate = matchingCompanies.reduce((latest, c) => {
      if (c.surveyCompletedAt && (!latest || c.surveyCompletedAt > latest)) {
        return c.surveyCompletedAt;
      }
      return latest;
    }, null as Date | null);

    const result: BenchmarkResult = {
      country,
      industry: industry || null,
      sizeBand: sizeBand || null,
      salaryBand: salaryBand || null,
      grouping: effectiveGrouping,
      targetCurrency,
      totalCompanies,
      avgEmployeeCount,
      avgSalary,
      categories,
      companyPosition,
      platform,
      pensionSalaryBandStats: pensionSalaryBandStats.length > 0 ? pensionSalaryBandStats : undefined,
      dataAsOf: latestDate?.toISOString() || new Date().toISOString(),
      dataQuality,
      dataQualityMessage,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching benchmarking data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;
  const key = `${fromCurrency}_${toCurrency}`;
  if (rates[key]) return amount * rates[key];
  const inverseKey = `${toCurrency}_${fromCurrency}`;
  if (rates[inverseKey]) return amount / rates[inverseKey];
  return amount;
}

async function buildFallbackResult(
  country: string,
  industry: string | null,
  sizeBand: string | null,
  grouping: BenchmarkGrouping,
  targetCurrency: string,
  rates: Record<string, number>,
  userCompanyId: string | null
): Promise<BenchmarkResult | null> {
  // Try reference data first
  let categories = await buildReferenceCategories(country, targetCurrency, rates);
  let quality: DataQuality = "reference";
  let qualityMessage =
    "Reference benchmarks based on published market data. As more companies join, you\u2019ll see live peer benchmarks.";

  // If no reference data, try baseline data
  let baselineSources: string[] = [];
  if (categories.length === 0) {
    const baseline = await buildBaselineCategories(country, targetCurrency, rates, industry || undefined);
    categories = baseline.categories;
    baselineSources = baseline.sources;
    if (categories.length === 0) return null;
    quality = "reference";
    qualityMessage = baseline.sources.length > 0
      ? `Baseline benchmarks sourced from: ${baseline.sources.join("; ")}`
      : "Baseline benchmarks based on published industry data.";
  }

  // Calculate company position against fallback data
  let companyPosition = null;
  if (userCompanyId) {
    const myBenefits = await prisma.benefitEntry.findMany({
      where: { companyId: userCompanyId },
      include: { company: { select: { country: true } }, healthLimits: true },
    });
    const myFiltered = myBenefits
      .filter((e) => {
        const entryCountry = e.country || e.company.country;
        return entryCountry === country || e.country === "";
      })
      .map((e) => prismaEntryToCompanyBenefitData(e));
    if (myFiltered.length > 0) {
      companyPosition = calculateCompanyPosition(myFiltered, categories, targetCurrency, rates);
    }
  }

  return {
    country,
    industry: industry || null,
    sizeBand: sizeBand || null,
    salaryBand: null,
    grouping,
    targetCurrency,
    totalCompanies: 0,
    avgEmployeeCount: 0,
    avgSalary: null,
    categories,
    companyPosition,
    platform: {
      adoptionRate: 0,
      totalCompanies: 0,
      meetsMinimum: false,
      avgFee: null,
      satisfactionStats: null,
      platformTypes: [],
      feeModels: [],
    },
    dataAsOf: new Date().toISOString(),
    dataQuality: quality,
    dataQualityMessage: qualityMessage,
    baselineSources: baselineSources.length > 0 ? baselineSources : undefined,
  };
}

function emptyResult(
  country: string,
  industry: string | null,
  sizeBand: string | null,
  grouping: BenchmarkGrouping,
  targetCurrency: string
): BenchmarkResult {
  return {
    country,
    industry: industry || null,
    sizeBand: sizeBand || null,
    salaryBand: null,
    grouping,
    targetCurrency,
    totalCompanies: 0,
    avgEmployeeCount: 0,
    avgSalary: null,
    categories: [],
    companyPosition: null,
    platform: {
      adoptionRate: 0,
      totalCompanies: 0,
      meetsMinimum: false,
      avgFee: null,
      satisfactionStats: null,
      platformTypes: [],
      feeModels: [],
    },
    dataAsOf: new Date().toISOString(),
  };
}
