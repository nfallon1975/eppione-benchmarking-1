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
  marketAvgCategoriesOffered: number;
  bonusPoints: number;
  weightedAvg: number;
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
// Dimension: Cost Competitiveness (0-25)
// ---------------------------------------------------------------------------

function scoreCostCompetitiveness(
  position: CompanyPosition | undefined,
  benchmark: CategoryBenchmark
): number {
  if (!position || position.percentileRank === null) return 0;
  if (!benchmark.costStats) return 15; // no market data, give middle score

  const rank = position.percentileRank;

  // Higher spending = investing more in employees = better score
  if (rank >= 50) return 25;  // at or above median
  if (rank >= 25) return 15;  // between P25 and median
  return 10;                  // below P25
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
  companyBenefits: CompanyBenefitData[]
): BenefitHealthScoreResult {
  if (categories.length === 0) {
    return {
      overall: 0,
      band: getScoreBand(0),
      categoryScores: [],
      breakdown: {
        totalCategoriesOffered: 0,
        marketAvgCategoriesOffered: 0,
        bonusPoints: 0,
        weightedAvg: 0,
      },
    };
  }

  const categoryScores: CategoryHealthScore[] = [];

  for (const bm of categories) {
    const offered = companyOffersCategory(bm.category, companyBenefits);
    const position = companyPositions.find((p) => p.category === bm.category);
    const entries = getCompanyEntries(bm.category, companyBenefits);

    const coverage = scoreCoverage(offered, bm.prevalence);
    const cost = offered ? scoreCostCompetitiveness(position, bm) : 0;
    const planRichness = offered ? scorePlanRichness(bm.category, position, bm) : 0;
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

  // Weighted average by prevalence
  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = 0; i < categories.length; i++) {
    const weight = Math.max(categories[i].prevalence, 1); // min weight 1 to avoid zero
    weightedSum += categoryScores[i].total * weight;
    weightTotal += weight;
  }

  const weightedAvg = weightTotal > 0 ? weightedSum / weightTotal : 0;

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
      marketAvgCategoriesOffered: Math.round(marketAvgCategoriesOffered),
      bonusPoints,
      weightedAvg: Math.round(weightedAvg),
    },
  };
}
