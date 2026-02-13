import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadCurrencyRates } from "@/lib/currency";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "BROKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const brokerId = session.user.id;

    // 1. All relationships for this broker (for acquisition timeline)
    const relationships = await prisma.brokerClientRelationship.findMany({
      where: { brokerId },
      orderBy: { invitedAt: "asc" },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            country: true,
            industry: true,
            employeeCount: true,
          },
        },
      },
    });

    // -- Client acquisition over time (monthly) --
    const acquisitionMap = new Map<string, { invited: number; active: number }>();
    for (const r of relationships) {
      const invitedMonth = r.invitedAt.toISOString().slice(0, 7); // YYYY-MM
      if (!acquisitionMap.has(invitedMonth)) {
        acquisitionMap.set(invitedMonth, { invited: 0, active: 0 });
      }
      acquisitionMap.get(invitedMonth)!.invited++;
      if (r.status === "ACTIVE" && r.acceptedAt) {
        const activeMonth = r.acceptedAt.toISOString().slice(0, 7);
        if (!acquisitionMap.has(activeMonth)) {
          acquisitionMap.set(activeMonth, { invited: 0, active: 0 });
        }
        acquisitionMap.get(activeMonth)!.active++;
      }
    }
    // Build cumulative timeline
    const sortedMonths = Array.from(acquisitionMap.keys()).sort();
    let cumInvited = 0;
    let cumActive = 0;
    const acquisitionTimeline = sortedMonths.map((month) => {
      const d = acquisitionMap.get(month)!;
      cumInvited += d.invited;
      cumActive += d.active;
      return { month, invited: d.invited, active: d.active, cumInvited, cumActive };
    });

    // 2. Active client company IDs + allowed countries map
    const activeClients = relationships.filter(
      (r) => r.status === "ACTIVE" && r.company
    );
    const clientCompanyIds = activeClients
      .map((r) => r.company!.id)
      .filter((id): id is string => !!id);

    // Map companyId → allowed countries (empty array = all)
    const allowedCountriesByCompany = new Map<string, string[]>();
    for (const r of activeClients) {
      const companyId = r.company!.id;
      if (companyId) {
        allowedCountriesByCompany.set(companyId, r.countries);
      }
    }

    // 3. Compliance gaps across client base
    const complianceResults = await prisma.complianceCheckResult.findMany({
      where: {
        companyId: { in: clientCompanyIds },
        status: { in: ["NON_COMPLIANT", "PARTIALLY_COMPLIANT"] },
      },
      include: {
        requirement: {
          select: {
            benefitCategory: true,
            requirementType: true,
            description: true,
            country: true,
          },
        },
      },
    });

    // Filter compliance results by allowed countries per client
    const filteredComplianceResults = complianceResults.filter((cr) => {
      const allowed = allowedCountriesByCompany.get(cr.companyId);
      if (!allowed || allowed.length === 0) return true; // all countries
      return allowed.includes(cr.requirement.country);
    });

    // Aggregate gaps by category
    const gapsByCategory = new Map<string, { count: number; mandatory: number; countries: Set<string> }>();
    for (const cr of filteredComplianceResults) {
      const cat = cr.requirement.benefitCategory;
      if (!gapsByCategory.has(cat)) {
        gapsByCategory.set(cat, { count: 0, mandatory: 0, countries: new Set() });
      }
      const entry = gapsByCategory.get(cat)!;
      entry.count++;
      if (cr.requirement.requirementType === "MANDATORY" || cr.requirement.requirementType === "QUASI_MANDATORY") {
        entry.mandatory++;
      }
      entry.countries.add(cr.requirement.country);
    }
    const complianceGaps = Array.from(gapsByCategory.entries())
      .map(([category, data]) => ({
        category,
        totalGaps: data.count,
        mandatoryGaps: data.mandatory,
        countriesAffected: data.countries.size,
      }))
      .sort((a, b) => b.totalGaps - a.totalGaps);

    // 4. Benefit trends among clients
    const clientBenefits = await prisma.benefitEntry.findMany({
      where: { companyId: { in: clientCompanyIds } },
      select: {
        companyId: true,
        benefitCategory: true,
        annualCostPerEmployee: true,
        costCurrency: true,
        employerFunded: true,
        coversSpouse: true,
        coversDependents: true,
        country: true,
      },
    });

    // Filter benefits by allowed countries per client
    const filteredClientBenefits = clientBenefits.filter((b) => {
      const allowed = allowedCountriesByCompany.get(b.companyId);
      if (!allowed || allowed.length === 0) return true; // all countries
      return allowed.includes(b.country);
    });

    // Prevalence & avg cost by category across broker's clients
    const rates = await loadCurrencyRates();
    const categoryStats = new Map<string, {
      companies: Set<string>;
      totalCost: number;
      costCount: number;
      employerFunded: number;
      total: number;
    }>();

    for (const b of filteredClientBenefits) {
      const cat = b.benefitCategory;
      if (!categoryStats.has(cat)) {
        categoryStats.set(cat, {
          companies: new Set(),
          totalCost: 0,
          costCount: 0,
          employerFunded: 0,
          total: 0,
        });
      }
      const s = categoryStats.get(cat)!;
      s.companies.add(b.companyId);
      s.total++;
      if (b.employerFunded) s.employerFunded++;
      if (b.annualCostPerEmployee) {
        const cost = convertToEur(b.annualCostPerEmployee, b.costCurrency, rates);
        s.totalCost += cost;
        s.costCount++;
      }
    }

    const totalClientCompanies = clientCompanyIds.length;
    const benefitTrends = Array.from(categoryStats.entries())
      .map(([category, s]) => ({
        category,
        clientCount: s.companies.size,
        prevalence: totalClientCompanies > 0
          ? Math.round((s.companies.size / totalClientCompanies) * 100)
          : 0,
        avgCost: s.costCount > 0 ? Math.round(s.totalCost / s.costCount) : null,
        pctEmployerFunded: s.total > 0
          ? Math.round((s.employerFunded / s.total) * 100)
          : 0,
      }))
      .sort((a, b) => b.prevalence - a.prevalence);

    // 5. Clients vs wider market comparison
    // Get market-wide stats for all approved companies
    const approvedUsers = await prisma.user.findMany({
      where: { status: "APPROVED", companyId: { not: null } },
      select: { companyId: true },
    });
    const allApprovedCompanyIds = new Set(
      approvedUsers.map((u) => u.companyId).filter((id): id is string => !!id)
    );

    const marketBenefits = await prisma.benefitEntry.findMany({
      where: {
        companyId: { in: Array.from(allApprovedCompanyIds) },
      },
      select: {
        companyId: true,
        benefitCategory: true,
        annualCostPerEmployee: true,
        costCurrency: true,
      },
    });

    const marketCategoryStats = new Map<string, {
      companies: Set<string>;
      totalCost: number;
      costCount: number;
    }>();

    for (const b of marketBenefits) {
      const cat = b.benefitCategory;
      if (!marketCategoryStats.has(cat)) {
        marketCategoryStats.set(cat, { companies: new Set(), totalCost: 0, costCount: 0 });
      }
      const s = marketCategoryStats.get(cat)!;
      s.companies.add(b.companyId);
      if (b.annualCostPerEmployee) {
        const cost = convertToEur(b.annualCostPerEmployee, b.costCurrency, rates);
        s.totalCost += cost;
        s.costCount++;
      }
    }

    const totalMarketCompanies = allApprovedCompanyIds.size;
    const clientVsMarket = Array.from(
      new Set([...Array.from(categoryStats.keys()), ...Array.from(marketCategoryStats.keys())])
    ).map((category) => {
      const client = categoryStats.get(category);
      const market = marketCategoryStats.get(category);
      return {
        category,
        clientPrevalence: client && totalClientCompanies > 0
          ? Math.round((client.companies.size / totalClientCompanies) * 100)
          : 0,
        marketPrevalence: market && totalMarketCompanies > 0
          ? Math.round((market.companies.size / totalMarketCompanies) * 100)
          : 0,
        clientAvgCost: client && client.costCount > 0
          ? Math.round(client.totalCost / client.costCount)
          : null,
        marketAvgCost: market && market.costCount > 0
          ? Math.round(market.totalCost / market.costCount)
          : null,
      };
    }).sort((a, b) => b.marketPrevalence - a.marketPrevalence);

    return NextResponse.json({
      acquisitionTimeline,
      complianceGaps,
      benefitTrends,
      clientVsMarket,
      summary: {
        totalClients: activeClients.length,
        totalMarketCompanies,
        totalComplianceGaps: filteredComplianceResults.length,
        mandatoryGapsCount: filteredComplianceResults.filter(
          (r) => r.requirement.requirementType === "MANDATORY" || r.requirement.requirementType === "QUASI_MANDATORY"
        ).length,
        avgBenefitsPerClient: totalClientCompanies > 0
          ? Math.round(filteredClientBenefits.length / totalClientCompanies)
          : 0,
        categoriesCoveredByClients: categoryStats.size,
      },
    });
  } catch (error) {
    console.error("Error fetching broker analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function convertToEur(
  amount: number,
  fromCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === "EUR") return amount;
  const key = `${fromCurrency}_EUR`;
  if (rates[key]) return amount * rates[key];
  const inverseKey = `EUR_${fromCurrency}`;
  if (rates[inverseKey]) return amount / rates[inverseKey];
  return amount;
}
