import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { clientBenefitRowSchema, type ClientBenefitUploadRow } from "@/lib/upload-schemas";
import { BenefitCategory } from "@prisma/client";
import { ensureCountryConfigs } from "@/lib/country-config";

const requestSchema = z.object({
  benefits: z.array(clientBenefitRowSchema),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = session.user;
    if (!companyId) {
      return NextResponse.json(
        { error: "No company associated with this account" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { benefits } = requestSchema.parse(body);

    if (benefits.length === 0) {
      return NextResponse.json(
        { error: "No benefit rows provided" },
        { status: 400 }
      );
    }

    // Ensure CountryConfig exists for all countries in the upload
    const allCountries = Array.from(new Set(benefits.map((b) => b.country)));
    await ensureCountryConfigs(allCountries);

    // Group rows by country
    const byCountry = new Map<string, ClientBenefitUploadRow[]>();
    for (const row of benefits) {
      const country = row.country.toUpperCase();
      if (!byCountry.has(country)) byCountry.set(country, []);
      byCountry.get(country)!.push(row);
    }

    const countries = Array.from(byCountry.keys());

    let entriesCreated = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Auto-create/update CompanyCountryProfile per country
      for (const country of countries) {
        await tx.companyCountryProfile.upsert({
          where: { companyId_country: { companyId, country } },
          create: { companyId, country },
          update: {},
        });
      }

      // 2. Delete existing BenefitEntries for this company where countries overlap
      await tx.benefitEntry.deleteMany({
        where: { companyId, country: { in: countries } },
      });

      // 3. Create new BenefitEntries
      for (const row of benefits) {
        await tx.benefitEntry.create({
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
        entriesCreated++;
      }

      // 4. Update Company.surveyCompletedAt
      await tx.company.update({
        where: { id: companyId },
        data: { surveyCompletedAt: new Date() },
      });
    });

    return NextResponse.json({
      success: true,
      entriesCreated,
      countriesProcessed: countries.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error uploading client benefits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
