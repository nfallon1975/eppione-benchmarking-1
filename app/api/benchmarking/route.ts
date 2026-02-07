import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BenefitCategory } from "@prisma/client";

const CATEGORY_LABELS: Record<string, string> = {
  HEALTH: "Health Insurance",
  LIFE: "Life Insurance / Death in Service",
  DISABILITY: "Disability Insurance",
  PENSION: "Pension / Retirement",
  DENTAL: "Dental Insurance",
  VISION: "Vision / Optical",
  EAP: "Employee Assistance Programme",
  WELLNESS: "Wellness / Wellbeing",
  INCOME_PROTECTION: "Income Protection",
  CRITICAL_ILLNESS: "Critical Illness Cover",
  TRAVEL: "Travel Insurance",
  MEAL_VOUCHERS: "Meal Vouchers / Allowance",
  TRANSPORT: "Transport / Commuter Benefits",
  CHILDCARE: "Childcare Benefits",
  EDUCATION: "Education / Training",
  OTHER: "Other Benefits",
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");
    let industry = searchParams.get("industry");
    const benefitCategory = searchParams.get("benefitCategory");

    // CLIENT users are locked to their company's industry
    if (session.user.role === "CLIENT" && session.user.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: session.user.companyId },
        select: { industry: true },
      });
      if (company?.industry) {
        industry = company.industry;
      }
    }

    if (!country) {
      return NextResponse.json(
        { error: "Country parameter is required" },
        { status: 400 }
      );
    }

    // Only include companies from APPROVED users
    const approvedCompanyIds = await prisma.user.findMany({
      where: { status: "APPROVED" },
      select: { companyId: true },
    });

    const companyIds = approvedCompanyIds
      .map((u) => u.companyId)
      .filter((id): id is string => id !== null);

    const emptyResponse = {
      country,
      industry: industry || null,
      totalCompanies: 0,
      avgEmployeeCount: 0,
      avgSalary: null,
      categories: [],
    };

    if (companyIds.length === 0) {
      return NextResponse.json(emptyResponse);
    }

    // Build company filter
    const companyWhere: Record<string, unknown> = {
      id: { in: companyIds },
      country,
    };

    if (industry && industry !== "all") {
      companyWhere.industry = industry;
    }

    const companies = await prisma.company.findMany({
      where: companyWhere,
      select: {
        id: true,
        employeeCount: true,
        averageSalary: true,
      },
    });

    const matchingCompanyIds = companies.map((c) => c.id);

    if (matchingCompanyIds.length === 0) {
      return NextResponse.json(emptyResponse);
    }

    const totalEmployees = companies.reduce(
      (sum, c) => sum + c.employeeCount,
      0
    );
    const avgEmployeeCount = Math.round(totalEmployees / companies.length);

    const companiesWithSalary = companies.filter(
      (c) => c.averageSalary !== null
    );
    const avgSalary =
      companiesWithSalary.length > 0
        ? Math.round(
            companiesWithSalary.reduce(
              (sum, c) => sum + (c.averageSalary ?? 0),
              0
            ) / companiesWithSalary.length
          )
        : null;

    // Build benefit entry filter
    const benefitWhere: Record<string, unknown> = {
      companyId: { in: matchingCompanyIds },
    };

    if (benefitCategory) {
      benefitWhere.benefitCategory = benefitCategory as BenefitCategory;
    }

    const benefitEntries = await prisma.benefitEntry.findMany({
      where: benefitWhere,
      select: {
        benefitCategory: true,
        companyId: true,
        annualCostPerEmployee: true,
        employerFunded: true,
        coversSpouse: true,
        coversDependents: true,
      },
    });

    // Aggregate by benefit category
    const categoryMap = new Map<
      string,
      {
        companyIds: Set<string>;
        costs: number[];
        employerFundedCount: number;
        coversSpouseCount: number;
        coversDependentsCount: number;
        totalEntries: number;
      }
    >();

    for (const entry of benefitEntries) {
      const cat = entry.benefitCategory;
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, {
          companyIds: new Set(),
          costs: [],
          employerFundedCount: 0,
          coversSpouseCount: 0,
          coversDependentsCount: 0,
          totalEntries: 0,
        });
      }

      const agg = categoryMap.get(cat)!;
      agg.companyIds.add(entry.companyId);
      agg.totalEntries++;

      if (entry.annualCostPerEmployee !== null) {
        agg.costs.push(entry.annualCostPerEmployee);
      }
      if (entry.employerFunded) agg.employerFundedCount++;
      if (entry.coversSpouse) agg.coversSpouseCount++;
      if (entry.coversDependents) agg.coversDependentsCount++;
    }

    const categories = Array.from(categoryMap.entries()).map(
      ([category, agg]) => {
        const avgCost =
          agg.costs.length > 0
            ? Math.round(
                agg.costs.reduce((a, b) => a + b, 0) / agg.costs.length
              )
            : 0;
        const minCost =
          agg.costs.length > 0 ? Math.min(...agg.costs) : 0;
        const maxCost =
          agg.costs.length > 0 ? Math.max(...agg.costs) : 0;

        return {
          category,
          categoryLabel: CATEGORY_LABELS[category] ?? category,
          companyCount: agg.companyIds.size,
          avgCostPerEmployee: avgCost,
          minCost,
          maxCost,
          pctEmployerFunded:
            agg.totalEntries > 0
              ? Math.round(
                  (agg.employerFundedCount / agg.totalEntries) * 100
                )
              : 0,
          pctCoversSpouse:
            agg.totalEntries > 0
              ? Math.round(
                  (agg.coversSpouseCount / agg.totalEntries) * 100
                )
              : 0,
          pctCoversDependents:
            agg.totalEntries > 0
              ? Math.round(
                  (agg.coversDependentsCount / agg.totalEntries) * 100
                )
              : 0,
        };
      }
    );

    return NextResponse.json({
      country,
      industry: industry || null,
      totalCompanies: matchingCompanyIds.length,
      avgEmployeeCount,
      avgSalary,
      categories,
    });
  } catch (error) {
    console.error("Error fetching benchmarking data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
