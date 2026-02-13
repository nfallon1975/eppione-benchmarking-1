import type { CompanyBenefitData } from "./benchmarking-types";

/**
 * Map a Prisma BenefitEntry (with company.country) to CompanyBenefitData.
 * Eliminates triple-maintenance across benchmarking routes.
 */
export function prismaEntryToCompanyBenefitData(
  e: {
    companyId: string;
    benefitCategory: string;
    country: string;
    annualCostPerEmployee: number | null;
    costCurrency: string;
    employerFunded: boolean;
    employeeContributionPercent: number | null;
    coversSpouse: boolean;
    coversDependents: boolean;
    isCore: boolean;
    isVoluntary: boolean;
    isFlexible: boolean;
    healthExcess: number | null;
    healthExcessCurrency: string;
    healthCopayPercent: number | null;
    healthInpatientLimit: number | null;
    healthOutpatientLimit: number | null;
    healthLimitCurrency: string;
    lifeCoverMultiple: number | null;
    lifeFixedCoverAmount: number | null;
    lifeCoverAmountCurrency: string;
    lifeFreeCoverLimit: number | null;
    ipBenefitPercent: number | null;
    ipWaitingPeriodWeeks: number | null;
    ipMaxBenefitAge: number | null;
    ciCoverMultiple: number | null;
    ciFixedCoverAmount: number | null;
    ciCoverAmountCurrency: string;
    dentalAnnualLimit: number | null;
    dentalAnnualLimitCurrency: string;
    dentalOrthoIncluded: boolean | null;
    pensionEmployerPct: number | null;
    pensionEmployeePct: number | null;
    company?: { country: string };
  },
  fallbackCountry?: string
): CompanyBenefitData {
  return {
    companyId: e.companyId,
    benefitCategory: e.benefitCategory,
    country: e.country || e.company?.country || fallbackCountry || "",
    annualCostPerEmployee: e.annualCostPerEmployee,
    costCurrency: e.costCurrency,
    employerFunded: e.employerFunded,
    employeeContributionPercent: e.employeeContributionPercent,
    coversSpouse: e.coversSpouse,
    coversDependents: e.coversDependents,
    isCore: e.isCore,
    isVoluntary: e.isVoluntary,
    isFlexible: e.isFlexible,
    healthExcess: e.healthExcess,
    healthExcessCurrency: e.healthExcessCurrency,
    healthCopayPercent: e.healthCopayPercent,
    healthInpatientLimit: e.healthInpatientLimit,
    healthOutpatientLimit: e.healthOutpatientLimit,
    healthLimitCurrency: e.healthLimitCurrency,
    lifeCoverMultiple: e.lifeCoverMultiple,
    lifeFixedCoverAmount: e.lifeFixedCoverAmount,
    lifeCoverAmountCurrency: e.lifeCoverAmountCurrency,
    lifeFreeCoverLimit: e.lifeFreeCoverLimit,
    ipBenefitPercent: e.ipBenefitPercent,
    ipWaitingPeriodWeeks: e.ipWaitingPeriodWeeks,
    ipMaxBenefitAge: e.ipMaxBenefitAge,
    ciCoverMultiple: e.ciCoverMultiple,
    ciFixedCoverAmount: e.ciFixedCoverAmount,
    ciCoverAmountCurrency: e.ciCoverAmountCurrency,
    dentalAnnualLimit: e.dentalAnnualLimit,
    dentalAnnualLimitCurrency: e.dentalAnnualLimitCurrency,
    dentalOrthoIncluded: e.dentalOrthoIncluded,
    pensionEmployerPct: e.pensionEmployerPct,
    pensionEmployeePct: e.pensionEmployeePct,
  };
}
