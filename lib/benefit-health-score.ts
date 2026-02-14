// Benefit Health Score — pure scoring engine (no DB access)
// Takes the same CompanyPosition[] and CategoryBenchmark[] from the benchmarking engine

import type {
  CompanyPosition,
  CategoryBenchmark,
  CompanyBenefitData,
} from "./benchmarking-types";
import { BENEFIT_CATEGORY_LABELS } from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CategoryHealthScore {
  category: string;
  categoryLabel: string;
  coverage: number;     // 0-25
  cost: number;         // 0-25
  planRichness: number; // 0-30
  breadth: number;      // 0-20
  total: number;        // 0-100
  offered: boolean;
}

export interface ScoreBreakdown {
  totalCategoriesOffered: number;
  totalCategoriesInMarket: number;
  missingCategories: number;
  marketAvgCategoriesOffered: number;
  bonusPoints: number;
  weightedAvg: number;
  offeredAvg: number;
}

export interface BenefitHealthScoreResult {
  overall: number;
  band: ScoreBand;
  categoryScores: CategoryHealthScore[];
  breakdown: ScoreBreakdown;
}

export interface ScoreBand {
  label: string;
  colour: string;
  min: number;
  max: number;
}

export interface DemographicContext {
  companyAge: number | null;
  companySalary: number | null;  // converted to target currency
  peerMedianAge: number | null;
  peerMedianSalary: number | null;  // in target currency
}

// ---------------------------------------------------------------------------
// Score bands
// ---------------------------------------------------------------------------

export const SCORE_BANDS: ScoreBand[] = [
  { label: "Excellent", colour: "#16a34a", min: 90, max: 100 },
  { label: "Strong",    colour: "#65a30d", min: 75, max: 89 },
  { label: "Average",   colour: "#eab308", min: 50, max: 74 },
  { label: "Below Average", colour: "#f97316", min: 25, max: 49 },
  { label: "Needs Attention", colour: "#dc2626", min: 0, max: 24 },
];

export function getScoreBand(score: number): ScoreBand {
  for (const band of SCORE_BANDS) {
    if (score >= band.min && score <= band.max) return band;
  }
  return SCORE_BANDS[SCORE_BANDS.length - 1];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Does the company offer this category? */
function companyOffersCategory(
  category: string,
  companyBenefits: CompanyBenefitData[]
): boolean {
  return companyBenefits.some((b) => b.benefitCategory === category);
}

/** Get the company's benefit entries for a given category */
function getCompanyEntries(
  category: string,
  companyBenefits: CompanyBenefitData[]
): CompanyBenefitData[] {
  return companyBenefits.filter((b) => b.benefitCategory === category);
}

// ---------------------------------------------------------------------------
// Demographic adjustment
// ---------------------------------------------------------------------------

/**
 * Returns a multiplier (default 1.0) representing how much MORE expensive
 * the company is expected to be relative to peers due to workforce demographics.
 * A company with an older workforce or higher salaries is expected to pay more,
 * so the adjustment factor > 1.0 lowers their effective cost rank.
 */
function computeDemographicAdjustment(demographics?: DemographicContext): number {
  if (!demographics) return 1.0;

  let ageFactor = 1.0;
  if (demographics.companyAge !== null && demographics.peerMedianAge !== null && demographics.peerMedianAge > 0) {
    ageFactor = Math.min(2.0, Math.max(0.5, demographics.companyAge / demographics.peerMedianAge));
  }

  let salaryFactor = 1.0;
  if (demographics.companySalary !== null && demographics.peerMedianSalary !== null && demographics.peerMedianSalary > 0) {
    salaryFactor = Math.min(2.0, Math.max(0.5, demographics.companySalary / demographics.peerMedianSalary));
  }

  return ageFactor * salaryFactor;
}

// ---------------------------------------------------------------------------
// Dimension: Coverage (0-25)
// ---------------------------------------------------------------------------

function scoreCoverage(
  offered: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevalence: number
): number {
  if (!offered) return 0;
  // Base 25 for offering it
  const score = 25;
  // Bonus for rare categories: if prevalence < 50%, treat as rare/valuable
  // This is already baked into the 25 base — rare categories just get full marks
  // The weighting step will naturally down-weight rare categories anyway
  // But prevalence < 50% adds a small relative bonus (reflected in having 25/25)
  // If prevalence >= 50%, it's common — still 25 for offering it
  return score;
}

// ---------------------------------------------------------------------------
// Dimension: Cost Efficiency (0-25)
// ---------------------------------------------------------------------------

function scoreCostEfficiency(
  position: CompanyPosition | undefined,
  benchmark: CategoryBenchmark,
  planRichnessScore: number,
  demographics?: DemographicContext
): number {
  if (!position || position.percentileRank === null) return 0;
  if (!benchmark.costStats) return 15; // no market data, give middle score

  const adjustment = computeDemographicAdjustment(demographics);
  // Lower the effective rank for companies expected to pay more
  const adjustedRank = Math.min(100, Math.max(0, position.percentileRank / adjustment));

  const highRichness = planRichnessScore >= 20;
  const lowCost = adjustedRank < 34;
  const midCost = adjustedRank < 67;

  //                        Adjusted Cost Rank
  //                        Low (0-33)  Mid (34-66)  High (67-100)
  // Plan Richness High:      25          20            15
  //               Low:       18          10             5
  if (highRichness) {
    if (lowCost) return 25;
    if (midCost) return 20;
    return 15;
  } else {
    if (lowCost) return 18;
    if (midCost) return 10;
    return 5;
  }
}

// ---------------------------------------------------------------------------
// Dimension: Plan Richness (0-30)
// ---------------------------------------------------------------------------

function scorePlanRichness(
  category: string,
  position: CompanyPosition | undefined,
  benchmark: CategoryBenchmark
): number {
  if (!position) return 0;

  switch (category) {
    case "HEALTH": {
      const stats = benchmark.healthStats;
      if (!stats) return 30; // no market data to compare, give full marks for offering
      let score = 0;
      // Excess <= median is better (lower excess = better for employee)
      if (stats.excessStats && position.healthExcessConverted !== null) {
        if (position.healthExcessConverted <= stats.excessStats.median) score += 10;
      } else {
        score += 5; // no data for this sub-metric
      }
      // Copay <= median is better
      if (stats.copayStats && position.healthCopayPercent !== null) {
        if (position.healthCopayPercent <= stats.copayStats.median) score += 10;
      } else {
        score += 5;
      }
      // Inpatient limit >= median is better
      if (stats.inpatientLimitStats && position.healthInpatientLimitConverted !== null) {
        if (position.healthInpatientLimitConverted >= stats.inpatientLimitStats.median) score += 10;
      } else {
        score += 5;
      }
      return Math.min(30, score);
    }

    case "LIFE": {
      const stats = benchmark.lifeStats;
      if (!stats) return 30;
      let score = 0;
      if (stats.coverMultipleStats && position.lifeCoverMultiple !== null) {
        if (position.lifeCoverMultiple >= stats.coverMultipleStats.median) score += 15;
      } else {
        score += 7;
      }
      if (stats.freeCoverLimitStats && position.lifeFreeCoverLimitConverted !== null) {
        if (position.lifeFreeCoverLimitConverted >= stats.freeCoverLimitStats.median) score += 15;
      } else {
        score += 8;
      }
      return Math.min(30, score);
    }

    case "PENSION": {
      const stats = benchmark.pensionStats;
      if (!stats) return 30;
      let score = 0;
      if (stats.employerPctStats && position.pensionEmployerPct !== null) {
        if (position.pensionEmployerPct >= stats.employerPctStats.median) score += 15;
      } else {
        score += 7;
      }
      if (stats.employeePctStats && position.pensionEmployeePct !== null) {
        if (position.pensionEmployeePct >= stats.employeePctStats.median) score += 15;
      } else {
        score += 8;
      }
      return Math.min(30, score);
    }

    case "INCOME_PROTECTION": {
      const stats = benchmark.ipStats;
      if (!stats) return 30;
      let score = 0;
      if (stats.benefitPercentStats && position.ipBenefitPercent !== null) {
        if (position.ipBenefitPercent >= stats.benefitPercentStats.median) score += 15;
      } else {
        score += 7;
      }
      // Waiting period: lower is better
      if (stats.waitingPeriodStats && position.ipWaitingPeriodWeeks !== null) {
        if (position.ipWaitingPeriodWeeks <= stats.waitingPeriodStats.median) score += 15;
      } else {
        score += 8;
      }
      return Math.min(30, score);
    }

    case "DENTAL": {
      const stats = benchmark.dentalStats;
      if (!stats) return 30;
      let score = 0;
      if (stats.annualLimitStats && position.dentalAnnualLimitConverted !== null) {
        if (position.dentalAnnualLimitConverted >= stats.annualLimitStats.median) score += 15;
      } else {
        score += 7;
      }
      // Ortho included bonus
      if (position.dentalOrthoIncluded === true) {
        score += 15;
      }
      return Math.min(30, score);
    }

    case "CRITICAL_ILLNESS": {
      const stats = benchmark.ciStats;
      if (!stats) return 30;
      let score = 0;
      if (stats.coverMultipleStats && position.ciCoverMultiple !== null) {
        if (position.ciCoverMultiple >= stats.coverMultipleStats.median) score += 15;
      } else {
        score += 7;
      }
      if (stats.fixedCoverAmountStats && position.ciFixedCoverAmountConverted !== null) {
        if (position.ciFixedCoverAmountConverted >= stats.fixedCoverAmountStats.median) score += 15;
      } else {
        score += 8;
      }
      return Math.min(30, score);
    }

    default:
      // Categories without detail fields: full 30 for offering it
      return 30;
  }
}

// ---------------------------------------------------------------------------
// Dimension: Breadth (0-20)
// ---------------------------------------------------------------------------

function scoreBreadth(
  entries: CompanyBenefitData[]
): number {
  if (entries.length === 0) return 0;
  let score = 0;
  // Use the first entry (or any entry that has the field set)
  const hasEmployerFunded = entries.some((e) => e.employerFunded);
  const hasSpouse = entries.some((e) => e.coversSpouse);
  const hasDependents = entries.some((e) => e.coversDependents);
  const hasCore = entries.some((e) => e.isCore);

  if (hasEmployerFunded) score += 5;
  if (hasSpouse) score += 5;
  if (hasDependents) score += 5;
  if (hasCore) score += 5;

  return score;
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

export function calculateBenefitHealthScore(
  companyPositions: CompanyPosition[],
  categories: CategoryBenchmark[],
  companyBenefits: CompanyBenefitData[],
  demographics?: DemographicContext
): BenefitHealthScoreResult {
  if (categories.length === 0) {
    return {
      overall: 0,
      band: getScoreBand(0),
      categoryScores: [],
      breakdown: {
        totalCategoriesOffered: 0,
        totalCategoriesInMarket: 0,
        missingCategories: 0,
        marketAvgCategoriesOffered: 0,
        bonusPoints: 0,
        weightedAvg: 0,
        offeredAvg: 0,
      },
    };
  }

  const categoryScores: CategoryHealthScore[] = [];

  for (const bm of categories) {
    const offered = companyOffersCategory(bm.category, companyBenefits);
    const position = companyPositions.find((p) => p.category === bm.category);
    const entries = getCompanyEntries(bm.category, companyBenefits);

    const coverage = scoreCoverage(offered, bm.prevalence);
    const planRichness = offered ? scorePlanRichness(bm.category, position, bm) : 0;
    const cost = offered ? scoreCostEfficiency(position, bm, planRichness, demographics) : 0;
    const breadth = scoreBreadth(entries);
    const total = coverage + cost + planRichness + breadth;

    categoryScores.push({
      category: bm.category,
      categoryLabel: BENEFIT_CATEGORY_LABELS[bm.category] ?? bm.category,
      coverage,
      cost,
      planRichness,
      breadth,
      total,
      offered,
    });
  }

  // Weighted average by prevalence (all categories, including missing)
  let weightedSum = 0;
  let weightTotal = 0;

  // Weighted average of only offered categories
  let offeredWeightedSum = 0;
  let offeredWeightTotal = 0;

  for (let i = 0; i < categories.length; i++) {
    const weight = Math.max(categories[i].prevalence, 1); // min weight 1 to avoid zero
    weightedSum += categoryScores[i].total * weight;
    weightTotal += weight;

    if (categoryScores[i].offered) {
      offeredWeightedSum += categoryScores[i].total * weight;
      offeredWeightTotal += weight;
    }
  }

  const weightedAvg = weightTotal > 0 ? weightedSum / weightTotal : 0;
  const offeredAvg = offeredWeightTotal > 0 ? offeredWeightedSum / offeredWeightTotal : 0;

  // Bonus: categories offered beyond market average count
  const totalCategoriesOffered = categoryScores.filter((c) => c.offered).length;

  // Market avg categories = sum of prevalences / 100 (each prevalence is a %)
  const marketAvgCategoriesOffered = categories.reduce(
    (sum, c) => sum + c.prevalence / 100,
    0
  );

  const extraCategories = Math.max(
    0,
    totalCategoriesOffered - Math.round(marketAvgCategoriesOffered)
  );
  const bonusPoints = Math.min(10, extraCategories * 2);

  const overall = Math.round(
    Math.min(100, Math.max(0, weightedAvg + bonusPoints))
  );

  return {
    overall,
    band: getScoreBand(overall),
    categoryScores,
    breakdown: {
      totalCategoriesOffered,
      totalCategoriesInMarket: categories.length,
      missingCategories: categories.length - totalCategoriesOffered,
      marketAvgCategoriesOffered: Math.round(marketAvgCategoriesOffered),
      bonusPoints,
      weightedAvg: Math.round(weightedAvg),
      offeredAvg: Math.round(offeredAvg),
    },
  };
}
