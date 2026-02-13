import { BenefitCategory } from "@prisma/client";

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
  // Broker
  brokerName: string;
  brokerSatisfactionScore: number | null;
  // Renewal / Satisfaction
  renewalDate: string;
  benefitSatisfactionScore: number | null;
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
    brokerName: "",
    brokerSatisfactionScore: null,
    renewalDate: "",
    benefitSatisfactionScore: null,
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
