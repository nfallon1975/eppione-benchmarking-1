import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { adminBenefitRowSchema, type AdminBenefitUploadRow } from "@/lib/upload-schemas";
import { BenefitCategory } from "@prisma/client";
import { ensureCountryConfigs } from "@/lib/country-config";

const requestSchema = z.object({
  rows: z.array(adminBenefitRowSchema),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { rows } = requestSchema.parse(body);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided" },
        { status: 400 }
      );
    }

    // Ensure CountryConfig exists for all countries in the upload
    const allCountries = Array.from(new Set(rows.map((r) => r.country.toUpperCase())));
    await ensureCountryConfigs(allCountries);

    // Collect unique company names (case-insensitive)
    const uniqueNames = Array.from(new Set(rows.map((r) => r.companyName.toLowerCase())));

    // Look up all companies
    const companies = await prisma.company.findMany({
      where: {
        name: { in: uniqueNames, mode: "insensitive" },
      },
    });

    // Build a map: lowercase company name -> company record
    const companyMap = new Map<string, typeof companies[0]>();
    for (const company of companies) {
      companyMap.set(company.name.toLowerCase(), company);
    }

    // Identify not-found company names
    const notFound: string[] = [];
    for (const name of uniqueNames) {
      if (!companyMap.has(name)) {
        // Use original casing from first matching row
        const originalName = rows.find((r) => r.companyName.toLowerCase() === name)!.companyName;
        notFound.push(originalName);
      }
    }

    // Filter to valid rows (company exists)
    const validRows = rows.filter((r) => companyMap.has(r.companyName.toLowerCase()));

    if (validRows.length === 0) {
      return NextResponse.json({
        success: true,
        companiesProcessed: 0,
        entriesCreated: 0,
        companies: [],
        notFound,
      });
    }

    // Group valid rows by companyId
    const byCompany = new Map<string, { company: typeof companies[0]; rows: AdminBenefitUploadRow[] }>();
    for (const row of validRows) {
      const company = companyMap.get(row.companyName.toLowerCase())!;
      if (!byCompany.has(company.id)) {
        byCompany.set(company.id, { company, rows: [] });
      }
      byCompany.get(company.id)!.rows.push(row);
    }

    let entriesCreated = 0;
    const uploadedCompanies: { name: string; benefitCount: number }[] = [];

    await prisma.$transaction(async (tx) => {
      for (const [companyId, { company, rows: companyRows }] of Array.from(byCompany.entries())) {
        // Get unique countries from rows for this company
        const countries = Array.from(new Set(companyRows.map((r) => r.country.toUpperCase())));

        // Create/update CompanyCountryProfiles
        for (const country of countries) {
          await tx.companyCountryProfile.upsert({
            where: { companyId_country: { companyId, country } },
            create: { companyId, country },
            update: {},
          });
        }

        // Delete existing BenefitEntries for this company where countries overlap
        await tx.benefitEntry.deleteMany({
          where: { companyId, country: { in: countries } },
        });

        // Create new BenefitEntries
        let companyEntries = 0;
        for (const row of companyRows) {
          const createdEntry = await tx.benefitEntry.create({
            data: {
              companyId,
              benefitCategory: row.benefitCategory as BenefitCategory,
              country: row.country.toUpperCase(),
              benefitName: row.benefitName,
              coverLevel: row.coverLevel,
              employerFunded: row.employerFunded,
              employeeContributionPercent: row.employeeContributionPercent,
              coversSpouse: row.coversSpouse,
              coversDependents: row.coversDependents,
              isCore: row.isCore,
              isVoluntary: row.isVoluntary,
              isFlexible: row.isFlexible,
              surveySource: false,
              provider: row.provider || null,
              annualCostPerEmployee: row.annualCostPerEmployee,
              costCurrency: row.costCurrency || "EUR",
              notes: row.notes || null,
              healthExcess: row.healthExcess,
              healthCopayPercent: row.healthCopayPercent,
              healthInpatientLimit: row.healthInpatientLimit,
              healthOutpatientLimit: row.healthOutpatientLimit,
              lifeCoverMultiple: row.lifeCoverMultiple,
              lifeFixedCoverAmount: row.lifeFixedCoverAmount,
              ipBenefitPercent: row.ipBenefitPercent,
              ipWaitingPeriodWeeks: row.ipWaitingPeriodWeeks,
              ciCoverMultiple: row.ciCoverMultiple,
              ciFixedCoverAmount: row.ciFixedCoverAmount,
              dentalAnnualLimit: row.dentalAnnualLimit,
              dentalOrthoIncluded: row.dentalOrthoIncluded,
              pensionEmployerPct: row.pensionEmployerPct,
              pensionEmployeePct: row.pensionEmployeePct,
            },
          });
          if (row.benefitCategory === "HEALTH") {
            if (row.healthInpatientLimit != null) {
              await tx.healthLimit.create({ data: { benefitEntryId: createdEntry.id, limitType: "INPATIENT", hasLimit: true, limitAmount: row.healthInpatientLimit, limitCurrency: row.costCurrency || "EUR" } });
            }
            if (row.healthOutpatientLimit != null) {
              await tx.healthLimit.create({ data: { benefitEntryId: createdEntry.id, limitType: "OUTPATIENT", hasLimit: true, limitAmount: row.healthOutpatientLimit, limitCurrency: row.costCurrency || "EUR" } });
            }
          }
          entriesCreated++;
          companyEntries++;
        }

        // Set surveyCompletedAt
        await tx.company.update({
          where: { id: companyId },
          data: { surveyCompletedAt: new Date() },
        });

        uploadedCompanies.push({
          name: company.name,
          benefitCount: companyEntries,
        });
      }
    });

    return NextResponse.json({
      success: true,
      companiesProcessed: byCompany.size,
      entriesCreated,
      companies: uploadedCompanies,
      notFound,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error uploading admin benefits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
