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
  // Plan Design
  deductibleAmount: number | null;
  deductibleCurrency: string | null;
  coPayPercent: number | null;
  coPayMaxAmount: number | null;
  sumInsured: number | null;
  sumInsuredCurrency: string | null;
  coverMultiple: number | null;
  coverMultipleBase: string | null;
  roomCategory: string | null;
  waitingPeriodDays: number | null;
  benefitMaxAnnual: number | null;
  benefitMaxCurrency: string | null;
  reimbursementPercent: number | null;
  benefitDurationDays: number | null;
  eliminationPeriodDays: number | null;
  // Coverage Scope
  insuredLives: number | null;
  dependentCoverageType: string | null;
  maxDependentsPerEmployee: number | null;
  coverageScope: string | null;
  networkType: string | null;
  hospitalLevel: string | null;
  // Regulatory & Tax
  mandatoryClassification: string | null;
  taxTreatment: string | null;
  taxRatePercent: number | null;
  employeeEligibility: string | null;
  eligibilityNotes: string | null;
  // Carrier & Broker Detail
  carrierTerminationNoticeDays: number | null;
  brokerCommissionPercent: number | null;
  brokerFee: number | null;
  brokerFeeCurrency: string | null;
  // Multinational Pooling
  inMultinationalPool: boolean;
  poolProviderName: string | null;
  // Bundling / Riders
  isRider: boolean;
  parentBenefitEntryId: string | null;
  riderDescription: string | null;
  // Maternity Specific
  maternityNormalDelivery: number | null;
  maternityCSection: number | null;
  maternityCurrency: string | null;
  // Dental Specific
  dentalAnnualMax: number | null;
  dentalPreventiveCoverage: boolean | null;
  dentalMajorCoverage: boolean | null;
  // Vision Specific
  visionAnnualMax: number | null;
  visionExamCovered: boolean | null;
  // Policy Metadata
  policyContractLength: number | null;
  lastRenewalOutcome: string | null;
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

export interface AnnualLeaveCategoryStats {
  daysEntitlementStats: PercentileStats | null;
  carryOverDaysStats: PercentileStats | null;
  maxDaysStats: PercentileStats | null;
  volunteerDaysStats: PercentileStats | null;
  christmasClosureDaysStats: PercentileStats | null;
  pctIncludesPublicHolidays: number;
  pctIncreasesWithTenure: number;
  pctBuySellDays: number;
  pctBirthdayOff: number;
}

export interface SickPayCategoryStats {
  fullPayWeeksStats: PercentileStats | null;
  halfPayWeeksStats: PercentileStats | null;
  partialPayPercentStats: PercentileStats | null;
  waitingDaysStats: PercentileStats | null;
  pctAboveStatutory: number;
}

export interface MaternityPayCategoryStats {
  fullPayWeeksStats: PercentileStats | null;
  partialPayWeeksStats: PercentileStats | null;
  partialPayPercentStats: PercentileStats | null;
  totalLeaveWeeksStats: PercentileStats | null;
  kitDaysStats: PercentileStats | null;
  pctAboveStatutory: number;
  pctGradualReturn: number;
}

export interface PaternityPayCategoryStats {
  fullPayWeeksStats: PercentileStats | null;
  partialPayWeeksStats: PercentileStats | null;
  partialPayPercentStats: PercentileStats | null;
  totalLeaveWeeksStats: PercentileStats | null;
  pctAboveStatutory: number;
  pctSharedParentalLeave: number;
}

// ─── Plan Design Stats ───

export type DistributionEntry = { type: string; count: number; percentage: number };

export interface PlanDesignCategoryStats {
  deductibleStats: PercentileStats | null;
  coPayPercentStats: PercentileStats | null;
  coPayMaxStats: PercentileStats | null;
  sumInsuredStats: PercentileStats | null;
  coverMultipleStats: PercentileStats | null;
  reimbursementPercentStats: PercentileStats | null;
  benefitMaxAnnualStats: PercentileStats | null;
  waitingPeriodDaysStats: PercentileStats | null;
  benefitDurationDaysStats: PercentileStats | null;
  eliminationPeriodDaysStats: PercentileStats | null;
  insuredLivesStats: PercentileStats | null;
  roomCategoryBreakdown: DistributionEntry[];
  coverMultipleBaseBreakdown: DistributionEntry[];
  networkTypeBreakdown: DistributionEntry[];
  coverageScopeBreakdown: DistributionEntry[];
  hospitalLevelBreakdown: DistributionEntry[];
  dependentCoverageTypeBreakdown: DistributionEntry[];
  detailedCompanyCount: number; // companies with plan design data
}

export interface GenerosityIndex {
  scores: number[]; // all company scores in peer group
  stats: PercentileStats | null;
}

export interface MaternitySpecificStats {
  normalDeliveryStats: PercentileStats | null;
  cSectionStats: PercentileStats | null;
}

export interface DentalSpecificStats {
  dentalAnnualMaxStats: PercentileStats | null;
  pctPreventiveCoverage: number;
  pctMajorCoverage: number;
}

export interface VisionCategoryStats {
  annualMaxStats: PercentileStats | null;
  pctExamCovered: number;
}

export interface BrokerCarrierStats {
  brokerCommissionStats: PercentileStats | null;
  brokerFeeStats: PercentileStats | null;
  terminationNoticeDaysStats: PercentileStats | null;
  pctInMultinationalPool: number;
  poolProviderBreakdown: DistributionEntry[];
  carrierBreakdown: DistributionEntry[];
}

export interface PolicyMetadataStats {
  contractLengthStats: PercentileStats | null;
  lastRenewalOutcomeBreakdown: DistributionEntry[];
}

export interface RegulatoryStats {
  mandatoryClassificationBreakdown: DistributionEntry[];
  taxTreatmentBreakdown: DistributionEntry[];
  employeeEligibilityBreakdown: DistributionEntry[];
  pctRiders: number;
}

// ─── Label Maps ───

export const ROOM_CATEGORY_LABELS: Record<string, string> = {
  PRIVATE: "Private", SEMI_PRIVATE: "Semi-Private", STANDARD: "Standard", ANY: "Any", NA: "N/A",
};

export const NETWORK_TYPE_LABELS: Record<string, string> = {
  PANEL: "Panel", NON_PANEL: "Non-Panel", BOTH: "Both", OPEN_ACCESS: "Open Access",
};

export const COVERAGE_SCOPE_LABELS: Record<string, string> = {
  LOCAL: "Local", NATIONAL: "National", REGIONAL: "Regional", WORLDWIDE: "Worldwide",
};

export const HOSPITAL_LEVEL_LABELS: Record<string, string> = {
  EXECUTIVE: "Executive", PRIVATE: "Private", SEMI_PRIVATE: "Semi-Private", STANDARD: "Standard", ANY: "Any",
};

export const DEPENDENT_COVERAGE_TYPE_LABELS: Record<string, string> = {
  NONE: "None", SPOUSE_ONLY: "Spouse Only", FAMILY: "Family", CHILDREN_ONLY: "Children Only",
};

export const MANDATORY_CLASSIFICATION_LABELS: Record<string, string> = {
  MANDATORY: "Mandatory", SUPPLEMENTAL: "Supplemental", HYBRID: "Hybrid",
};

export const TAX_TREATMENT_LABELS: Record<string, string> = {
  INCLUDES_TAX: "Includes Tax", EXCLUDES_TAX: "Excludes Tax", TAX_EXEMPT: "Tax Exempt",
};

export const RENEWAL_OUTCOME_LABELS: Record<string, string> = {
  RENEWED_AS_IS: "Renewed As-Is", RENEWED_WITH_CHANGES: "Renewed with Changes",
  REMARKET: "Remarketed", NEW_PLACEMENT: "New Placement",
};

export const COVER_MULTIPLE_BASE_LABELS: Record<string, string> = {
  BASIC_SALARY: "Basic Salary", ANNUAL_CTC: "Annual CTC", FIXED_AMOUNT: "Fixed Amount",
};

export const EMPLOYEE_ELIGIBILITY_LABELS: Record<string, string> = {
  ALL_EMPLOYEES: "All Employees", MANAGERS_ONLY: "Managers Only",
  DIRECTORS_ONLY: "Directors Only", CUSTOM: "Custom",
};

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
  annualLeaveStats: AnnualLeaveCategoryStats | null;
  sickPayStats: SickPayCategoryStats | null;
  maternityPayStats: MaternityPayCategoryStats | null;
  paternityPayStats: PaternityPayCategoryStats | null;
  pctEmployerFunded: number;
  pctCoversSpouse: number;
  pctCoversDependents: number;
  pctCore: number;
  pctVoluntary: number;
  pctFlexible: number;
  // Plan design stats
  planDesignStats: PlanDesignCategoryStats | null;
  generosityIndex: GenerosityIndex | null;
  maternitySpecificStats: MaternitySpecificStats | null;
  dentalSpecificStats: DentalSpecificStats | null;
  visionStats: VisionCategoryStats | null;
  brokerCarrierStats: BrokerCarrierStats | null;
  policyMetadataStats: PolicyMetadataStats | null;
  regulatoryStats: RegulatoryStats | null;
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
  // Plan Design
  deductibleAmount: number | null;
  deductibleCurrency: string | null;
  coPayPercent: number | null;
  coPayMaxAmount: number | null;
  sumInsured: number | null;
  sumInsuredCurrency: string | null;
  coverMultiple: number | null;
  coverMultipleBase: string | null;
  roomCategory: string | null;
  waitingPeriodDays: number | null;
  benefitMaxAnnual: number | null;
  benefitMaxCurrency: string | null;
  reimbursementPercent: number | null;
  benefitDurationDays: number | null;
  eliminationPeriodDays: number | null;
  // Coverage Scope
  insuredLives: number | null;
  dependentCoverageType: string | null;
  maxDependentsPerEmployee: number | null;
  coverageScope: string | null;
  networkType: string | null;
  hospitalLevel: string | null;
  // Regulatory & Tax
  mandatoryClassification: string | null;
  taxTreatment: string | null;
  taxRatePercent: number | null;
  employeeEligibility: string | null;
  eligibilityNotes: string | null;
  // Carrier & Broker Detail
  carrierTerminationNoticeDays: number | null;
  brokerCommissionPercent: number | null;
  brokerFee: number | null;
  brokerFeeCurrency: string | null;
  // Multinational Pooling
  inMultinationalPool: boolean;
  poolProviderName: string | null;
  // Bundling / Riders
  isRider: boolean;
  parentBenefitEntryId: string | null;
  riderDescription: string | null;
  // Maternity Specific
  maternityNormalDelivery: number | null;
  maternityCSection: number | null;
  maternityCurrency: string | null;
  // Dental Specific
  dentalAnnualMax: number | null;
  dentalPreventiveCoverage: boolean | null;
  dentalMajorCoverage: boolean | null;
  // Vision Specific
  visionAnnualMax: number | null;
  visionExamCovered: boolean | null;
  // Policy Metadata
  policyContractLength: number | null;
  lastRenewalOutcome: string | null;
  // Generosity
  generosityScore: number | null;
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
