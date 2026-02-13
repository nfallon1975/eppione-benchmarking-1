import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-key";
import { z } from "zod";
import { clientBenefitRowSchema } from "@/lib/upload-schemas";
import { BenefitCategory } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
  }

  if (!auth.scopes.includes("benefits:read")) {
    return NextResponse.json({ error: "Insufficient scope. Required: benefits:read" }, { status: 403 });
  }

  if (!auth.companyId) {
    return NextResponse.json({ error: "No company associated with this account" }, { status: 404 });
  }

  const country = req.nextUrl.searchParams.get("country");
  const category = req.nextUrl.searchParams.get("category");

  const where: Record<string, unknown> = { companyId: auth.companyId };
  if (country) where.country = country.toUpperCase();
  if (category) where.benefitCategory = category.toUpperCase();

  const benefits = await prisma.benefitEntry.findMany({
    where,
    orderBy: [{ country: "asc" }, { benefitCategory: "asc" }, { benefitName: "asc" }],
  });

  return NextResponse.json({ benefits, total: benefits.length });
}

const postSchema = z.object({
  benefits: z.array(clientBenefitRowSchema),
  replaceExisting: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
  }

  if (!auth.scopes.includes("benefits:write")) {
    return NextResponse.json({ error: "Insufficient scope. Required: benefits:write" }, { status: 403 });
  }

  if (!auth.companyId) {
    return NextResponse.json({ error: "No company associated with this account" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { benefits, replaceExisting } = postSchema.parse(body);

    if (benefits.length === 0) {
      return NextResponse.json({ error: "No benefit rows provided" }, { status: 400 });
    }

    const companyId = auth.companyId;
    const countries = Array.from(new Set(benefits.map((b) => b.country.toUpperCase())));
    let entriesCreated = 0;

    await prisma.$transaction(async (tx) => {
      for (const country of countries) {
        await tx.companyCountryProfile.upsert({
          where: { companyId_country: { companyId, country } },
          create: { companyId, country },
          update: {},
        });
      }

      if (replaceExisting) {
        await tx.benefitEntry.deleteMany({
          where: { companyId, country: { in: countries } },
        });
      }

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
    console.error("Error in API v1 benefits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
