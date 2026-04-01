import { BenefitCategory } from "@prisma/client";

export const STANDARD_HEALTH_LIMIT_TYPES = [
  { value: "INPATIENT", label: "Inpatient" },
  { value: "OUTPATIENT", label: "Outpatient" },
  { value: "DENTAL", label: "Dental" },
  { value: "MENTAL_HEALTH", label: "Mental Health" },
  { value: "OPTICAL", label: "Optical" },
  { value: "MATERNITY", label: "Maternity" },
] as const;

export interface HealthLimitFormData {
  tempId: string;
  limitType: string;
  customLimitName: string;
  hasLimit: boolean;
  limitAmount: number | null;
  limitCurrency: string;
}

export function createEmptyHealthLimit(currency: string = "EUR"): HealthLimitFormData {
  return {
    tempId: crypto.randomUUID(),
    limitType: "",
    customLimitName: "",
    hasLimit: true,
    limitAmount: null,
    limitCurrency: currency,
  };
}

export interface BenefitFormData {
  tempId: string;
  benefitName: string;
  coverLevel: string;
  employerFunded: boolean;
  employeeContributionPercent: number | null;
  coversSpouse: boolean;
  coversDependents: boolean;
  maxDependents: number | null;
  isFlexible: boolean;
  flexFundAmount: number | null;
  flexFundCurrency: string;
  provider: string;
  annualCostPerEmployee: number | null;
  costCurrency: string;
  notes: string;
  healthExcess: number | null;
  healthExcessCurrency: string;
  healthCopayPercent: number | null;
  healthInpatientLimit: number | null;
  healthOutpatientLimit: number | null;
  healthLimitCurrency: string;
  healthLimits: HealthLimitFormData[];
  // Life Insurance
  lifeCoverMultiple: number | null;
  lifeFixedCoverAmount: number | null;
  lifeCoverAmountCurrency: string;
  lifeFreeCoverLimit: number | null;
  // Income Protection
  ipBenefitPercent: number | null;
  ipWaitingPeriodWeeks: number | null;
  ipMaxBenefitAge: number | null;
  // Critical Illness
  ciCoverMultiple: number | null;
  ciFixedCoverAmount: number | null;
  ciCoverAmountCurrency: string;
  // Dental
  dentalAnnualLimit: number | null;
  dentalAnnualLimitCurrency: string;
  dentalOrthoIncluded: boolean | null;
  // Pension
  pensionEmployerPct: number | null;
  pensionEmployeePct: number | null;
  pensionPlanType: string;
  pensionContributionRateEmployer: number | null;
  pensionContributionRateEmployee: number | null;
  pensionDeathBenefitMultiple: number | null;
  pensionDeathBenefitType: string;
  pensionFormulaType: string;
  // Annual Leave
  leaveDaysEntitlement: number | null;
  leaveIncludesPublicHolidays: boolean | null;
  leaveIncreasesWithTenure: boolean | null;
  leaveMaxDays: number | null;
  leaveBuySellDays: boolean | null;
  leaveCarryOverDays: number | null;
  leaveBirthdayOff: boolean | null;
  leaveVolunteerDays: number | null;
  leaveChristmasClosureDays: number | null;
  // Sick Pay
  sickPayFullPayWeeks: number | null;
  sickPayHalfPayWeeks: number | null;
  sickPayPartialPayPercent: number | null;
  sickPayWaitingDays: number | null;
  sickPayAboveStatutory: boolean | null;
  // Maternity Pay
  maternityFullPayWeeks: number | null;
  maternityPartialPayWeeks: number | null;
  maternityPartialPayPercent: number | null;
  maternityTotalLeaveWeeks: number | null;
  maternityAboveStatutory: boolean | null;
  maternityKitDays: number | null;
  maternityGradualReturn: boolean | null;
  // Paternity Pay
  paternityFullPayWeeks: number | null;
  paternityPartialPayWeeks: number | null;
  paternityPartialPayPercent: number | null;
  paternityTotalLeaveWeeks: number | null;
  paternityAboveStatutory: boolean | null;
  paternitySharedParentalLeave: boolean | null;
  // Broker
  brokerName: string;
  brokerSatisfactionScore: number | null;
  // Renewal / Satisfaction
  renewalDate: string;
  benefitSatisfactionScore: number | null;
  // Plan Design (cross-category)
  mandatoryClassification: string | null;
  sumInsured: number | null;
  sumInsuredCurrency: string;
  coverMultiple: number | null;
  coverMultipleBase: string | null;
  taxTreatment: string | null;
  coverageScope: string | null;
  insuredLives: number | null;
  dependentCoverageType: string | null;
  employeeEligibility: string | null;
  eligibilityNotes: string | null;
  // Health plan design
  deductibleAmount: number | null;
  deductibleCurrency: string;
  coPayPercent: number | null;
  coPayMaxAmount: number | null;
  reimbursementPercent: number | null;
  roomCategory: string | null;
  hospitalLevel: string | null;
  networkType: string | null;
  benefitMaxAnnual: number | null;
  benefitMaxCurrency: string;
  maternityNormalDelivery: number | null;
  maternityCSection: number | null;
  maternityCurrency: string;
  // Dental plan design
  dentalAnnualMax: number | null;
  dentalPreventiveCoverage: boolean | null;
  dentalMajorCoverage: boolean | null;
  // Vision
  visionAnnualMax: number | null;
  visionExamCovered: boolean | null;
  // Income protection plan design
  eliminationPeriodDays: number | null;
  benefitDurationDays: number | null;
  // Critical illness plan design
  waitingPeriodDays: number | null;
  // Risk riders
  isRider: boolean;
  parentBenefitEntryId: string | null;
  riderDescription: string | null;
  // Carrier & broker detail
  brokerCommissionPercent: number | null;
  brokerFee: number | null;
  brokerFeeCurrency: string;
  carrierTerminationNoticeDays: number | null;
  // Multinational pooling
  inMultinationalPool: boolean;
  poolProviderName: string | null;
  // Policy metadata
  policyContractLength: number | null;
  lastRenewalOutcome: string | null;
}

export interface CategoryData {
  notOffered: boolean;
  benefits: BenefitFormData[];
}

export interface CountryProfile {
  country: string;
  employeeCountRange: string;
  averageSalary: number | null;
  averageSalaryCurrency: string;
  averageBonusPercent: number | null;
  financialYearEndMonth: number | null;
}

export interface SurveyStep1 {
  industrySector: string;
  industryCode: string;
  countries: CountryProfile[];
  benefitBudget: number | null;
  benefitBudgetCurrency: string;
  averageWorkforceAge: number | null;
  desiredNewBenefits: string;
}

export interface SurveyStep2 {
  countriesData: Record<string, Partial<Record<BenefitCategory, CategoryData>>>;
}

export interface SurveyStep3 {
  countriesData: Record<string, Partial<Record<BenefitCategory, CategoryData>>>;
}

export interface SurveyStep4 {
  usesPlatform: boolean;
  platformName: string;
  platformType: string;
  annualPlatformFee: number | null;
  feeCurrency: string;
  feeModel: string;
  platformSatisfactionScore: number | null;
  usesTotalRewardPlatform: boolean;
  totalRewardPlatformName: string;
  otherHRTechPlatforms: string;
}

export interface SurveyData {
  step1: SurveyStep1;
  step2: SurveyStep2;
  step3: SurveyStep3;
  step4: SurveyStep4;
}

export interface CountryConfigData {
  id: string;
  countryCode: string;
  countryName: string;
  currency: string;
  availableBenefitCategories: BenefitCategory[];
  regulatoryNotes: string | null;
}

export function createEmptyBenefit(currency: string = "EUR"): BenefitFormData {
  return {
    tempId: crypto.randomUUID(),
    benefitName: "",
    coverLevel: "",
    employerFunded: true,
    employeeContributionPercent: null,
    coversSpouse: false,
    coversDependents: false,
    maxDependents: null,
    isFlexible: false,
    flexFundAmount: null,
    flexFundCurrency: currency,
    provider: "",
    annualCostPerEmployee: null,
    costCurrency: currency,
    notes: "",
    healthExcess: null,
    healthExcessCurrency: currency,
    healthCopayPercent: null,
    healthInpatientLimit: null,
    healthOutpatientLimit: null,
    healthLimitCurrency: currency,
    healthLimits: [],
    lifeCoverMultiple: null,
    lifeFixedCoverAmount: null,
    lifeCoverAmountCurrency: currency,
    lifeFreeCoverLimit: null,
    ipBenefitPercent: null,
    ipWaitingPeriodWeeks: null,
    ipMaxBenefitAge: null,
    ciCoverMultiple: null,
    ciFixedCoverAmount: null,
    ciCoverAmountCurrency: currency,
    dentalAnnualLimit: null,
    dentalAnnualLimitCurrency: currency,
    dentalOrthoIncluded: null,
    pensionEmployerPct: null,
    pensionEmployeePct: null,
    pensionPlanType: "",
    pensionContributionRateEmployer: null,
    pensionContributionRateEmployee: null,
    pensionDeathBenefitMultiple: null,
    pensionDeathBenefitType: "",
    pensionFormulaType: "",
    leaveDaysEntitlement: null,
    leaveIncludesPublicHolidays: null,
    leaveIncreasesWithTenure: null,
    leaveMaxDays: null,
    leaveBuySellDays: null,
    leaveCarryOverDays: null,
    leaveBirthdayOff: null,
    leaveVolunteerDays: null,
    leaveChristmasClosureDays: null,
    sickPayFullPayWeeks: null,
    sickPayHalfPayWeeks: null,
    sickPayPartialPayPercent: null,
    sickPayWaitingDays: null,
    sickPayAboveStatutory: null,
    maternityFullPayWeeks: null,
    maternityPartialPayWeeks: null,
    maternityPartialPayPercent: null,
    maternityTotalLeaveWeeks: null,
    maternityAboveStatutory: null,
    maternityKitDays: null,
    maternityGradualReturn: null,
    paternityFullPayWeeks: null,
    paternityPartialPayWeeks: null,
    paternityPartialPayPercent: null,
    paternityTotalLeaveWeeks: null,
    paternityAboveStatutory: null,
    paternitySharedParentalLeave: null,
    brokerName: "",
    brokerSatisfactionScore: null,
    renewalDate: "",
    benefitSatisfactionScore: null,
    // Plan Design
    mandatoryClassification: null,
    sumInsured: null,
    sumInsuredCurrency: currency,
    coverMultiple: null,
    coverMultipleBase: null,
    taxTreatment: null,
    coverageScope: null,
    insuredLives: null,
    dependentCoverageType: null,
    employeeEligibility: null,
    eligibilityNotes: null,
    deductibleAmount: null,
    deductibleCurrency: currency,
    coPayPercent: null,
    coPayMaxAmount: null,
    reimbursementPercent: null,
    roomCategory: null,
    hospitalLevel: null,
    networkType: null,
    benefitMaxAnnual: null,
    benefitMaxCurrency: currency,
    maternityNormalDelivery: null,
    maternityCSection: null,
    maternityCurrency: currency,
    dentalAnnualMax: null,
    dentalPreventiveCoverage: null,
    dentalMajorCoverage: null,
    visionAnnualMax: null,
    visionExamCovered: null,
    eliminationPeriodDays: null,
    benefitDurationDays: null,
    waitingPeriodDays: null,
    isRider: false,
    parentBenefitEntryId: null,
    riderDescription: null,
    brokerCommissionPercent: null,
    brokerFee: null,
    brokerFeeCurrency: currency,
    carrierTerminationNoticeDays: null,
    inMultinationalPool: false,
    poolProviderName: null,
    policyContractLength: null,
    lastRenewalOutcome: null,
  };
}

export function createEmptyCategory(): CategoryData {
  return {
    notOffered: false,
    benefits: [],
  };
}

export function createEmptyCountryProfile(country: string = "", currency: string = "EUR"): CountryProfile {
  return {
    country,
    employeeCountRange: "",
    averageSalary: null,
    averageSalaryCurrency: currency,
    averageBonusPercent: null,
    financialYearEndMonth: null,
  };
}

export function createEmptySurveyData(): SurveyData {
  return {
    step1: {
      industrySector: "",
      industryCode: "",
      countries: [],
      benefitBudget: null,
      benefitBudgetCurrency: "EUR",
      averageWorkforceAge: null,
      desiredNewBenefits: "",
    },
    step2: { countriesData: {} },
    step3: { countriesData: {} },
    step4: {
      usesPlatform: false,
      platformName: "",
      platformType: "",
      annualPlatformFee: null,
      feeCurrency: "EUR",
      feeModel: "",
      platformSatisfactionScore: null,
      usesTotalRewardPlatform: false,
      totalRewardPlatformName: "",
      otherHRTechPlatforms: "",
    },
  };
}
