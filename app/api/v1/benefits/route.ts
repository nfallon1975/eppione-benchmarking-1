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
    include: { riders: { select: { benefitName: true } } },
    orderBy: [{ country: "asc" }, { benefitCategory: "asc" }, { benefitName: "asc" }],
  });

  // Shape response with new plan design fields
  const shaped = benefits.map((b) => ({
    id: b.id,
    category: b.benefitCategory,
    benefitName: b.benefitName,
    coverLevel: b.coverLevel,
    employerFunded: b.employerFunded,
    employeeContributionPercent: b.employeeContributionPercent,
    costPerEmployee: b.annualCostPerEmployee,
    costCurrency: b.costCurrency,
    provider: b.provider,
    country: b.country,
    isCore: b.isCore,
    isVoluntary: b.isVoluntary,
    isFlexible: b.isFlexible,
    coversSpouse: b.coversSpouse,
    coversDependents: b.coversDependents,
    renewalDate: b.renewalDate?.toISOString().split("T")[0] ?? null,
    notes: b.notes,
    // Plan design fields
    deductibleAmount: b.deductibleAmount,
    deductibleCurrency: b.deductibleCurrency,
    coPayPercent: b.coPayPercent,
    coPayMaxAmount: b.coPayMaxAmount,
    sumInsured: b.sumInsured,
    sumInsuredCurrency: b.sumInsuredCurrency,
    coverMultiple: b.coverMultiple,
    coverMultipleBase: b.coverMultipleBase,
    roomCategory: b.roomCategory,
    reimbursementPercent: b.reimbursementPercent,
    benefitMaxAnnual: b.benefitMaxAnnual,
    benefitMaxCurrency: b.benefitMaxCurrency,
    waitingPeriodDays: b.waitingPeriodDays,
    benefitDurationDays: b.benefitDurationDays,
    eliminationPeriodDays: b.eliminationPeriodDays,
    // Coverage scope
    coverageScope: b.coverageScope,
    networkType: b.networkType,
    hospitalLevel: b.hospitalLevel,
    insuredLives: b.insuredLives,
    dependentCoverageType: b.dependentCoverageType,
    maxDependentsPerEmployee: b.maxDependentsPerEmployee,
    // Regulatory & tax
    mandatoryClassification: b.mandatoryClassification,
    taxTreatment: b.taxTreatment,
    taxRatePercent: b.taxRatePercent,
    employeeEligibility: b.employeeEligibility,
    eligibilityNotes: b.eligibilityNotes,
    // Carrier & broker
    carrierTerminationNoticeDays: b.carrierTerminationNoticeDays,
    brokerName: b.brokerName,
    brokerCommissionPercent: b.brokerCommissionPercent,
    brokerFee: b.brokerFee,
    brokerFeeCurrency: b.brokerFeeCurrency,
    // Pooling
    inMultinationalPool: b.inMultinationalPool,
    poolProviderName: b.poolProviderName,
    // Riders
    isRider: b.isRider,
    riderOf: b.parentBenefitEntryId,
    riderDescription: b.riderDescription,
    riders: b.riders.map((r) => r.benefitName),
    // Category-specific
    maternityNormalDelivery: b.maternityNormalDelivery,
    maternityCSection: b.maternityCSection,
    maternityCurrency: b.maternityCurrency,
    dentalAnnualMax: b.dentalAnnualMax,
    dentalPreventiveCoverage: b.dentalPreventiveCoverage,
    dentalMajorCoverage: b.dentalMajorCoverage,
    visionAnnualMax: b.visionAnnualMax,
    visionExamCovered: b.visionExamCovered,
    // Policy metadata
    policyContractLength: b.policyContractLength,
    lastRenewalOutcome: b.lastRenewalOutcome,
  }));

  return NextResponse.json({ benefits: shaped, total: shaped.length });
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
            // Plan design fields
            deductibleAmount: row.deductibleAmount ?? null,
            deductibleCurrency: row.deductibleCurrency || null,
            coPayPercent: row.coPayPercent ?? null,
            coPayMaxAmount: row.coPayMaxAmount ?? null,
            sumInsured: row.sumInsured ?? null,
            sumInsuredCurrency: row.sumInsuredCurrency || null,
            coverMultiple: row.coverMultiple ?? null,
            coverMultipleBase: row.coverMultipleBase || null,
            roomCategory: row.roomCategory || null,
            reimbursementPercent: row.reimbursementPercent ?? null,
            benefitMaxAnnual: row.benefitMaxAnnual ?? null,
            benefitMaxCurrency: row.benefitMaxCurrency || null,
            waitingPeriodDays: row.waitingPeriodDays ?? null,
            benefitDurationDays: row.benefitDurationDays ?? null,
            eliminationPeriodDays: row.eliminationPeriodDays ?? null,
            coverageScope: row.coverageScope || null,
            networkType: row.networkType || null,
            hospitalLevel: row.hospitalLevel || null,
            insuredLives: row.insuredLives ?? null,
            dependentCoverageType: row.dependentCoverageType || null,
            maxDependentsPerEmployee: row.maxDependentsPerEmployee ?? null,
            mandatoryClassification: row.mandatoryClassification || null,
            taxTreatment: row.taxTreatment || null,
            taxRatePercent: row.taxRatePercent ?? null,
            employeeEligibility: row.employeeEligibility || null,
            eligibilityNotes: row.eligibilityNotes || null,
            carrierTerminationNoticeDays: row.carrierTerminationNoticeDays ?? null,
            brokerCommissionPercent: row.brokerCommissionPercent ?? null,
            brokerFee: row.brokerFee ?? null,
            brokerFeeCurrency: row.brokerFeeCurrency || null,
            inMultinationalPool: row.inMultinationalPool ?? false,
            poolProviderName: row.poolProviderName || null,
            isRider: row.isRider ?? false,
            parentBenefitEntryId: row.parentBenefitEntryId || null,
            riderDescription: row.riderDescription || null,
            maternityNormalDelivery: row.maternityNormalDelivery ?? null,
            maternityCSection: row.maternityCSection ?? null,
            maternityCurrency: row.maternityCurrency || null,
            dentalAnnualMax: row.dentalAnnualMax ?? null,
            dentalPreventiveCoverage: row.dentalPreventiveCoverage ?? null,
            dentalMajorCoverage: row.dentalMajorCoverage ?? null,
            visionAnnualMax: row.visionAnnualMax ?? null,
            visionExamCovered: row.visionExamCovered ?? null,
            policyContractLength: row.policyContractLength ?? null,
            lastRenewalOutcome: row.lastRenewalOutcome || null,
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
