// Types for the benchmarking engine — safe to import from client components

export interface BenchmarkFilters {
  country: string;
  industry?: string;
  sizeBand?: string;
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

export interface HealthCategoryStats {
  excessStats: PercentileStats | null;
  copayStats: PercentileStats | null;
  inpatientLimitStats: PercentileStats | null;
  outpatientLimitStats: PercentileStats | null;
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

export interface BenchmarkResult {
  country: string;
  industry: string | null;
  sizeBand: string | null;
  grouping: BenchmarkGrouping;
  targetCurrency: string;
  totalCompanies: number;
  avgEmployeeCount: number;
  avgSalary: number | null;
  categories: CategoryBenchmark[];
  companyPosition: CompanyPosition[] | null;
  platform: PlatformBenchmark;
  dataAsOf: string; // ISO date string of most recent surveyCompletedAt
  dataQuality?: DataQuality;
  dataQualityMessage?: string;
}
