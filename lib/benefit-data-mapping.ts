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
    healthLimits?: { limitType: string; hasLimit: boolean; limitAmount: number | null; limitCurrency: string }[];
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
    pensionPlanType: string | null;
    pensionContributionRateEmployer: number | null;
    pensionContributionRateEmployee: number | null;
    pensionDeathBenefitMultiple: number | null;
    pensionDeathBenefitType: string | null;
    pensionFormulaType: string | null;
    leaveDaysEntitlement: number | null;
    leaveIncludesPublicHolidays: boolean | null;
    leaveIncreasesWithTenure: boolean | null;
    leaveMaxDays: number | null;
    leaveBuySellDays: boolean | null;
    leaveCarryOverDays: number | null;
    leaveBirthdayOff: boolean | null;
    leaveVolunteerDays: number | null;
    leaveChristmasClosureDays: number | null;
    sickPayFullPayWeeks: number | null;
    sickPayHalfPayWeeks: number | null;
    sickPayPartialPayPercent: number | null;
    sickPayWaitingDays: number | null;
    sickPayAboveStatutory: boolean | null;
    maternityFullPayWeeks: number | null;
    maternityPartialPayWeeks: number | null;
    maternityPartialPayPercent: number | null;
    maternityTotalLeaveWeeks: number | null;
    maternityAboveStatutory: boolean | null;
    maternityKitDays: number | null;
    maternityGradualReturn: boolean | null;
    paternityFullPayWeeks: number | null;
    paternityPartialPayWeeks: number | null;
    paternityPartialPayPercent: number | null;
    paternityTotalLeaveWeeks: number | null;
    paternityAboveStatutory: boolean | null;
    paternitySharedParentalLeave: boolean | null;
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
    healthLimits: (e.healthLimits ?? []).map((hl) => ({
      limitType: hl.limitType,
      hasLimit: hl.hasLimit,
      limitAmount: hl.limitAmount,
      limitCurrency: hl.limitCurrency,
    })),
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
    pensionPlanType: e.pensionPlanType,
    pensionContributionRateEmployer: e.pensionContributionRateEmployer,
    pensionContributionRateEmployee: e.pensionContributionRateEmployee,
    pensionDeathBenefitMultiple: e.pensionDeathBenefitMultiple,
    pensionDeathBenefitType: e.pensionDeathBenefitType,
    pensionFormulaType: e.pensionFormulaType,
    leaveDaysEntitlement: e.leaveDaysEntitlement,
    leaveIncludesPublicHolidays: e.leaveIncludesPublicHolidays,
    leaveIncreasesWithTenure: e.leaveIncreasesWithTenure,
    leaveMaxDays: e.leaveMaxDays,
    leaveBuySellDays: e.leaveBuySellDays,
    leaveCarryOverDays: e.leaveCarryOverDays,
    leaveBirthdayOff: e.leaveBirthdayOff,
    leaveVolunteerDays: e.leaveVolunteerDays,
    leaveChristmasClosureDays: e.leaveChristmasClosureDays,
    sickPayFullPayWeeks: e.sickPayFullPayWeeks,
    sickPayHalfPayWeeks: e.sickPayHalfPayWeeks,
    sickPayPartialPayPercent: e.sickPayPartialPayPercent,
    sickPayWaitingDays: e.sickPayWaitingDays,
    sickPayAboveStatutory: e.sickPayAboveStatutory,
    maternityFullPayWeeks: e.maternityFullPayWeeks,
    maternityPartialPayWeeks: e.maternityPartialPayWeeks,
    maternityPartialPayPercent: e.maternityPartialPayPercent,
    maternityTotalLeaveWeeks: e.maternityTotalLeaveWeeks,
    maternityAboveStatutory: e.maternityAboveStatutory,
    maternityKitDays: e.maternityKitDays,
    maternityGradualReturn: e.maternityGradualReturn,
    paternityFullPayWeeks: e.paternityFullPayWeeks,
    paternityPartialPayWeeks: e.paternityPartialPayWeeks,
    paternityPartialPayPercent: e.paternityPartialPayPercent,
    paternityTotalLeaveWeeks: e.paternityTotalLeaveWeeks,
    paternityAboveStatutory: e.paternityAboveStatutory,
    paternitySharedParentalLeave: e.paternitySharedParentalLeave,
  };
}
