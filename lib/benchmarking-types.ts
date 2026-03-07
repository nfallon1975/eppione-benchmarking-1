// Types for the benchmarking engine — safe to import from client components

export interface BenchmarkFilters {
  country: string;
  industry?: string;
  sizeBand?: string;
  salaryBand?: string;
}

export type BenchmarkGrouping = "country_industry" | "country_only" | "industry_only";

export interface CompanyBenefitData {
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
  healthLimits: { limitType: string; hasLimit: boolean; limitAmount: number | null; limitCurrency: string }[];
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
  pensionPlanType: string | null;
  pensionContributionRateEmployer: number | null;
  pensionContributionRateEmployee: number | null;
  pensionDeathBenefitMultiple: number | null;
  pensionDeathBenefitType: string | null;
  pensionFormulaType: string | null;
}

export const SALARY_BAND_LABELS: Record<string, string> = {
  UNDER_35K: "Under 35,000",
  BAND_35K_50K: "35,000 - 50,000",
  BAND_50K_75K: "50,000 - 75,000",
  BAND_75K_100K: "75,000 - 100,000",
  OVER_100K: "100,000+",
};

export const PLAN_TYPE_LABELS: Record<string, string> = {
  DC: "Defined Contribution",
  DB: "Defined Benefit",
  CASH_BALANCE: "Cash Balance",
  HYBRID: "Hybrid",
};

export const DEATH_BENEFIT_TYPE_LABELS: Record<string, string> = {
  ACCUMULATED_RESERVES: "Accumulated Reserves",
  FIXED_MULTIPLE: "Fixed Multiple",
  MIXED: "Mixed",
  NONE: "None",
};

export const PENSION_FORMULA_TYPE_LABELS: Record<string, string> = {
  FLAT_RATE: "Flat Rate",
  STEP_RATE: "Step Rate",
  SALARY_LINKED: "Salary Linked",
  OTHER: "Other",
};

export function classifySalaryBand(salary: number): string {
  if (salary < 35000) return "UNDER_35K";
  if (salary < 50000) return "BAND_35K_50K";
  if (salary < 75000) return "BAND_50K_75K";
  if (salary < 100000) return "BAND_75K_100K";
  return "OVER_100K";
}

export interface PlatformData {
  companyId: string;
  usesPlatform: boolean;
  platformType: string | null;
  annualPlatformFee: number | null;
  feeCurrency: string;
  feeModel: string | null;
  platformSatisfactionScore: number | null;
}

export interface PercentileStats {
  p25: number;
  median: number;
  p75: number;
  mean: number;
  min: number;
  max: number;
  count: number;
}

export interface HealthLimitTypeStats {
  limitType: string;
  limitTypeLabel: string;
  totalCompanies: number;
  companiesWithLimit: number;
  companiesFullCover: number;
  limitStats: PercentileStats | null;
}

export interface HealthCategoryStats {
  excessStats: PercentileStats | null;
  copayStats: PercentileStats | null;
  inpatientLimitStats: PercentileStats | null;
  outpatientLimitStats: PercentileStats | null;
  limitTypeStats: HealthLimitTypeStats[];
}

export interface LifeCategoryStats {
  coverMultipleStats: PercentileStats | null;
  fixedCoverAmountStats: PercentileStats | null;
  freeCoverLimitStats: PercentileStats | null;
}

export interface IpCategoryStats {
  benefitPercentStats: PercentileStats | null;
  waitingPeriodStats: PercentileStats | null;
  maxBenefitAgeStats: PercentileStats | null;
}

export interface CiCategoryStats {
  coverMultipleStats: PercentileStats | null;
  fixedCoverAmountStats: PercentileStats | null;
}

export interface DentalCategoryStats {
  annualLimitStats: PercentileStats | null;
}

export interface PensionCategoryStats {
  employerPctStats: PercentileStats | null;
  employeePctStats: PercentileStats | null;
  totalContributionStats: PercentileStats | null;
  deathBenefitMultipleStats: PercentileStats | null;
  planTypeBreakdown: { type: string; count: number; percentage: number }[];
  employerOnlyPct: number;
  employerPlusEmployeePct: number;
  belowThresholdPct: number; // % below 3% employer contribution
  formulaTypeBreakdown: { type: string; count: number; percentage: number }[];
  deathBenefitTypeBreakdown: { type: string; count: number; percentage: number }[];
}

export interface CategoryBenchmark {
  category: string;
  categoryLabel: string;
  companyCount: number;
  totalCompanies: number;
  prevalence: number; // percentage 0-100
  meetsMinimum: boolean;
  costStats: PercentileStats | null;
  healthStats: HealthCategoryStats | null;
  lifeStats: LifeCategoryStats | null;
  ipStats: IpCategoryStats | null;
  ciStats: CiCategoryStats | null;
  dentalStats: DentalCategoryStats | null;
  pensionStats: PensionCategoryStats | null;
  pctEmployerFunded: number;
  pctCoversSpouse: number;
  pctCoversDependents: number;
  pctCore: number;
  pctVoluntary: number;
  pctFlexible: number;
  // Reference data metadata (only present when dataQuality === "reference")
  confidenceLevel?: string | null;
  sourceDescription?: string | null;
  sourceUrls?: string[];
  coverageNotes?: string | null;
}

export interface CompanyPosition {
  category: string;
  yourCost: number | null;
  yourCostConverted: number | null;
  percentileRank: number | null; // 0-100, where 50 = median
  vsMedian: number | null; // percentage above/below median
  healthExcess: number | null;
  healthExcessConverted: number | null;
  healthCopayPercent: number | null;
  healthInpatientLimit: number | null;
  healthInpatientLimitConverted: number | null;
  healthOutpatientLimit: number | null;
  healthOutpatientLimitConverted: number | null;
  healthLimitPositions: { limitType: string; hasLimit: boolean; limitAmount: number | null; limitAmountConverted: number | null }[];
  // Life Insurance
  lifeCoverMultiple: number | null;
  lifeFixedCoverAmount: number | null;
  lifeFixedCoverAmountConverted: number | null;
  lifeFreeCoverLimit: number | null;
  lifeFreeCoverLimitConverted: number | null;
  // Income Protection
  ipBenefitPercent: number | null;
  ipWaitingPeriodWeeks: number | null;
  ipMaxBenefitAge: number | null;
  // Critical Illness
  ciCoverMultiple: number | null;
  ciFixedCoverAmount: number | null;
  ciFixedCoverAmountConverted: number | null;
  // Dental
  dentalAnnualLimit: number | null;
  dentalAnnualLimitConverted: number | null;
  dentalOrthoIncluded: boolean | null;
  // Pension
  pensionEmployerPct: number | null;
  pensionEmployeePct: number | null;
  pensionPlanType: string | null;
  pensionContributionRateEmployer: number | null;
  pensionContributionRateEmployee: number | null;
  pensionTotalContributionRate: number | null;
  pensionDeathBenefitMultiple: number | null;
  pensionDeathBenefitType: string | null;
  pensionFormulaType: string | null;
}

export interface PlatformBenchmark {
  adoptionRate: number; // % of companies using a platform
  totalCompanies: number;
  meetsMinimum: boolean;
  avgFee: PercentileStats | null;
  satisfactionStats: PercentileStats | null;
  platformTypes: { type: string; count: number; percentage: number }[];
  feeModels: { model: string; count: number; percentage: number }[];
}

export type DataQuality = "industry" | "cross_industry" | "reference";

export interface PensionSalaryBandStats {
  salaryBand: string;
  salaryBandLabel: string;
  contributionStats: PercentileStats | null;
  deathBenefitStats: PercentileStats | null;
  companyCount: number;
}

export interface BenchmarkResult {
  country: string;
  industry: string | null;
  sizeBand: string | null;
  salaryBand: string | null;
  grouping: BenchmarkGrouping;
  targetCurrency: string;
  totalCompanies: number;
  avgEmployeeCount: number;
  avgSalary: number | null;
  categories: CategoryBenchmark[];
  companyPosition: CompanyPosition[] | null;
  yourBenefitEntryCount?: number | null; // total individual benefit entries for this country
  platform: PlatformBenchmark;
  pensionSalaryBandStats?: PensionSalaryBandStats[];
  dataAsOf: string; // ISO date string of most recent surveyCompletedAt
  dataQuality?: DataQuality;
  dataQualityMessage?: string;
  baselineSources?: string[]; // attribution for baseline data
}
