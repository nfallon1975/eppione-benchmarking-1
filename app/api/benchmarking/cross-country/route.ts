import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadCurrencyRates } from "@/lib/currency";
import {
  calculateCategoryBenchmarks,
  filterCompanyIds,
} from "@/lib/benchmarking";
import { prismaEntryToCompanyBenefitData } from "@/lib/benefit-data-mapping";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const currency = searchParams.get("currency") || "EUR";
    const overrideCompanyId = searchParams.get("companyId");

    // Admin override: allow viewing cross-country data for any company
    const effectiveCompanyId =
      session.user.role === "ADMIN" && overrideCompanyId
        ? overrideCompanyId
        : session.user.companyId;

    if (!effectiveCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rates = await loadCurrencyRates();

    // Get user's company and its countries
    const company = await prisma.company.findUnique({
      where: { id: effectiveCompanyId },
      include: {
        countryProfiles: true,
        benefitEntries: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Determine company's countries
    const companyCountries: string[] = [];
    if (company.countryProfiles.length > 0) {
      companyCountries.push(...company.countryProfiles.map((p) => p.country));
    } else {
      companyCountries.push(company.country);
    }

    if (companyCountries.length < 2) {
      return NextResponse.json({ countries: companyCountries, benchmarks: {} });
    }

    // Get approved company IDs
    const approvedUsers = await prisma.user.findMany({
      where: { status: "APPROVED", companyId: { not: null } },
      select: { companyId: true },
    });
    const approvedIds = new Set(
      approvedUsers.map((u) => u.companyId).filter((id): id is string => id !== null)
    );

    const allCompanies = await prisma.company.findMany({
      where: { id: { in: Array.from(approvedIds) }, surveyCompletedAt: { not: null } },
      select: { id: true, country: true, industry: true, employeeCountRange: true },
    });

    // Calculate benchmarks for each country
    const benchmarksByCountry: Record<string, ReturnType<typeof calculateCategoryBenchmarks>> = {};

    for (const country of companyCountries) {
      const matchingIds = filterCompanyIds(
        allCompanies,
        { country, industry: company.industry },
        "country_industry"
      );

      // Also include companies with benefit entries in this country
      const extraCompanies = await prisma.benefitEntry.findMany({
        where: { companyId: { in: Array.from(approvedIds) }, country },
        select: { companyId: true },
        distinct: ["companyId"],
      });
      for (const ec of extraCompanies) matchingIds.add(ec.companyId);

      const totalCompanies = matchingIds.size;

      // Get benefit entries for this country
      const entries = await prisma.benefitEntry.findMany({
        where: { companyId: { in: Array.from(matchingIds) } },
        include: { company: { select: { country: true } } },
      });

      const filtered = entries
        .filter((e) => (e.country || e.company.country) === country)
        .map((e) => prismaEntryToCompanyBenefitData(e));

      benchmarksByCountry[country] = calculateCategoryBenchmarks(
        filtered,
        totalCompanies,
        currency,
        rates
      );
    }

    return NextResponse.json({
      countries: companyCountries,
      targetCurrency: currency,
      benchmarks: benchmarksByCountry,
    });
  } catch (error) {
    console.error("Error fetching cross-country data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
