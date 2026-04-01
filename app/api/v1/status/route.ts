import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-key";

const BASIC_FIELDS: (string)[] = [
  "benefitName", "coverLevel", "provider", "annualCostPerEmployee",
  "costCurrency", "benefitCategory", "country",
];

const PLAN_DESIGN_FIELDS: string[] = [
  "deductibleAmount", "coPayPercent", "sumInsured", "coverMultiple",
  "coverMultipleBase", "reimbursementPercent", "benefitMaxAnnual",
  "roomCategory", "coverageScope", "networkType", "hospitalLevel",
  "insuredLives", "dependentCoverageType", "mandatoryClassification",
  "taxTreatment", "employeeEligibility", "waitingPeriodDays",
  "benefitDurationDays", "eliminationPeriodDays",
];

const BROKER_FIELDS: string[] = [
  "brokerName", "brokerCommissionPercent", "brokerFee",
  "carrierTerminationNoticeDays", "inMultinationalPool",
];

function countFilledFields(entry: Record<string, unknown>, fields: string[]): number {
  let count = 0;
  for (const field of fields) {
    const val = entry[field];
    if (val !== null && val !== undefined && val !== "" && val !== false) {
      count++;
    }
  }
  return count;
}

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
  }

  if (!auth.companyId) {
    return NextResponse.json({ error: "No company associated with this account" }, { status: 404 });
  }

  const companyId = auth.companyId;

  const [company, benefits, countryProfiles] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.benefitEntry.findMany({ where: { companyId } }),
    prisma.companyCountryProfile.findMany({ where: { companyId } }),
  ]);

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Calculate data richness
  let totalBasicFilled = 0;
  let totalBasicPossible = 0;
  let totalPlanDesignFilled = 0;
  let totalPlanDesignPossible = 0;
  let totalBrokerFilled = 0;
  let totalBrokerPossible = 0;

  for (const b of benefits) {
    const entry = b as unknown as Record<string, unknown>;
    totalBasicFilled += countFilledFields(entry, BASIC_FIELDS);
    totalBasicPossible += BASIC_FIELDS.length;
    totalPlanDesignFilled += countFilledFields(entry, PLAN_DESIGN_FIELDS);
    totalPlanDesignPossible += PLAN_DESIGN_FIELDS.length;
    totalBrokerFilled += countFilledFields(entry, BROKER_FIELDS);
    totalBrokerPossible += BROKER_FIELDS.length;
  }

  const basicPercent = totalBasicPossible > 0
    ? Math.round((totalBasicFilled / totalBasicPossible) * 100) : 0;
  const planDesignPercent = totalPlanDesignPossible > 0
    ? Math.round((totalPlanDesignFilled / totalPlanDesignPossible) * 100) : 0;
  const brokerPercent = totalBrokerPossible > 0
    ? Math.round((totalBrokerFilled / totalBrokerPossible) * 100) : 0;

  const totalPossible = totalBasicPossible + totalPlanDesignPossible + totalBrokerPossible;
  const totalFilled = totalBasicFilled + totalPlanDesignFilled + totalBrokerFilled;
  const avgCompletion = totalPossible > 0
    ? Math.round((totalFilled / totalPossible) * 100) : 0;

  const uniqueCountries = Array.from(new Set(benefits.map((b) => b.country).filter(Boolean)));

  return NextResponse.json({
    companyId,
    companyName: company.name,
    surveyCompletedAt: company.surveyCompletedAt?.toISOString() ?? null,
    totalBenefitEntries: benefits.length,
    countriesCovered: uniqueCountries,
    countryProfileCount: countryProfiles.length,
    dataRichness: {
      basicFieldsComplete: basicPercent,
      planDesignComplete: planDesignPercent,
      brokerDataComplete: brokerPercent,
      totalBenefitEntries: benefits.length,
      countriesCovered: uniqueCountries.length,
      averageFieldCompletion: avgCompletion,
    },
  });
}
