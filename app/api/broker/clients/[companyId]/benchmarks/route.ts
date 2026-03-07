import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { brokerHasCountryAccess } from "@/lib/broker-access";
import { loadCurrencyRates } from "@/lib/currency";
import {
  calculateCategoryBenchmarks,
  calculatePlatformBenchmarks,
  calculateCompanyPosition,
  filterCompanyIds,
} from "@/lib/benchmarking";
import type {
  BenchmarkFilters,
  BenchmarkGrouping,
  BenchmarkResult,
  PlatformData,
} from "@/lib/benchmarking-types";
import { prismaEntryToCompanyBenefitData } from "@/lib/benefit-data-mapping";

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "BROKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate broker has ACTIVE relationship with this company
    const relationship = await prisma.brokerClientRelationship.findFirst({
      where: {
        brokerId: session.user.id,
        companyId: params.companyId,
        status: "ACTIVE",
      },
    });

    if (!relationship) {
      return NextResponse.json(
        { error: "No active relationship with this client" },
        { status: 403 }
      );
    }

    const allowedCountries: string[] = relationship.countries;

    // Get company directly
    const company = await prisma.company.findUnique({
      where: { id: params.companyId },
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

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const userCompanyId = company.id;
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country") || company.country;
    const currency = searchParams.get("currency");
    const industry = company.industry;

    // Enforce per-country access
    if (!brokerHasCountryAccess(allowedCountries, country)) {
      return NextResponse.json(
        { error: "You do not have access to this country's data" },
        { status: 403 }
      );
    }

    let targetCurrency = currency || "EUR";
    if (!currency) {
      const countryConfig = await prisma.countryConfig.findUnique({
        where: { countryCode: country },
        select: { currency: true },
      });
      if (countryConfig) targetCurrency = countryConfig.currency;
    }

    const rates = await loadCurrencyRates();

    const approvedUsers = await prisma.user.findMany({
      where: { status: "APPROVED", companyId: { not: null } },
      select: { companyId: true },
    });
    const approvedCompanyIds = new Set(
      approvedUsers.map((u) => u.companyId).filter((id): id is string => id !== null)
    );

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

    const companiesWithBenefitsInCountry = await prisma.benefitEntry.findMany({
      where: {
        companyId: { in: Array.from(approvedCompanyIds) },
        country: country,
      },
      select: { companyId: true },
      distinct: ["companyId"],
    });
    const countryBenefitCompanyIds = new Set(companiesWithBenefitsInCountry.map((b) => b.companyId));

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

    if (matchingIds.size === 0) {
      return NextResponse.json({
        country,
        industry,
        sizeBand: null,
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
      });
    }

    const matchingCompanies = companiesInScope.filter((c) => matchingIds.has(c.id));
    const totalCompanies = matchingCompanies.length;
    const totalEmployees = matchingCompanies.reduce((sum, c) => sum + c.employeeCount, 0);
    const avgEmployeeCount = Math.round(totalEmployees / totalCompanies);

    const companiesWithSalary = matchingCompanies.filter((c) => c.averageSalary !== null);
    let avgSalary: number | null = null;
    if (companiesWithSalary.length > 0) {
      const totalSalary = companiesWithSalary.reduce((sum, c) => {
        const salCurrency = c.averageSalaryCurrency || "EUR";
        return sum + (c.averageSalary ? convertAmount(c.averageSalary, salCurrency, targetCurrency, rates) : 0);
      }, 0);
      avgSalary = Math.round(totalSalary / companiesWithSalary.length);
    }

    const benefitEntries = await prisma.benefitEntry.findMany({
      where: { companyId: { in: Array.from(matchingIds) } },
      include: { company: { select: { country: true } } },
    });

    const filteredBenefits = benefitEntries
      .filter((e) => {
        const entryCountry = e.country || e.company.country;
        return entryCountry === country;
      })
      .map((e) => prismaEntryToCompanyBenefitData(e));

    const categories = calculateCategoryBenchmarks(
      filteredBenefits,
      totalCompanies,
      targetCurrency,
      rates
    );

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

    let companyPosition = null;
    if (matchingIds.has(userCompanyId)) {
      const myBenefits = filteredBenefits.filter((b) => b.companyId === userCompanyId);
      companyPosition = calculateCompanyPosition(myBenefits, categories, targetCurrency, rates);
    }

    const latestDate = matchingCompanies.reduce((latest, c) => {
      if (c.surveyCompletedAt && (!latest || c.surveyCompletedAt > latest)) {
        return c.surveyCompletedAt;
      }
      return latest;
    }, null as Date | null);

    const result: BenchmarkResult = {
      country,
      industry,
      sizeBand: null,
      salaryBand: null,
      grouping,
      targetCurrency,
      totalCompanies,
      avgEmployeeCount,
      avgSalary,
      categories,
      companyPosition,
      platform,
      dataAsOf: latestDate?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching client benchmarks:", error);
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
