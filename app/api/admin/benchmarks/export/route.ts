import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BENEFIT_CATEGORY_LABELS, COUNTRY_LABELS, NACE_INDUSTRIES } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "benefits";

    if (type === "benefits") {
      const entries = await prisma.benefitEntry.findMany({
        include: {
          company: {
            select: { name: true, country: true, industry: true, employeeCount: true },
          },
        },
      });

      const rows = entries.map((e) => [
        e.company.name,
        COUNTRY_LABELS[e.company.country] || e.company.country,
        NACE_INDUSTRIES[e.company.industry] || e.company.industry,
        e.company.employeeCount,
        BENEFIT_CATEGORY_LABELS[e.benefitCategory] || e.benefitCategory,
        e.country || e.company.country,
        e.benefitName,
        e.annualCostPerEmployee || "",
        e.costCurrency,
        e.employerFunded ? "Yes" : "No",
        e.employeeContributionPercent || "",
        e.coversSpouse ? "Yes" : "No",
        e.coversDependents ? "Yes" : "No",
        e.isCore ? "Yes" : "No",
        e.isVoluntary ? "Yes" : "No",
        e.isFlexible ? "Yes" : "No",
        e.provider || "",
      ]);

      const headers = [
        "Company", "Company Country", "Industry", "Employees",
        "Category", "Benefit Country", "Benefit Name",
        "Annual Cost/Employee", "Cost Currency",
        "Employer Funded", "Employee Contribution %",
        "Covers Spouse", "Covers Dependents",
        "Core", "Voluntary", "Flexible", "Provider",
      ];

      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          r.map((v) => {
            const s = String(v);
            return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          }).join(",")
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="benefits-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (type === "companies") {
      const companies = await prisma.company.findMany({
        where: { surveyCompletedAt: { not: null } },
        include: { _count: { select: { benefitEntries: true } } },
      });

      const headers = [
        "Company", "Country", "Industry", "Employees", "Size Band",
        "Avg Salary", "Salary Currency", "Bonus %",
        "Survey Completed", "Benefit Count",
      ];

      const rows = companies.map((c) => [
        c.name,
        COUNTRY_LABELS[c.country] || c.country,
        NACE_INDUSTRIES[c.industry] || c.industry,
        c.employeeCount,
        c.employeeCountRange || "",
        c.averageSalary || "",
        c.averageSalaryCurrency || "",
        c.averageBonusPercent || "",
        c.surveyCompletedAt?.toISOString().split("T")[0] || "",
        c._count.benefitEntries,
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          r.map((v) => {
            const s = String(v);
            return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          }).join(",")
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="companies-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
