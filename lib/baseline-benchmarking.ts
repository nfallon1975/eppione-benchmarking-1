import { prisma } from "@/lib/db";
import { type CurrencyRateMap, convertCurrency } from "@/lib/currency";
import type {
  CategoryBenchmark,
  PercentileStats,
  PensionCategoryStats,
  LifeCategoryStats,
  IpCategoryStats,
} from "@/lib/benchmarking-types";
import { BENEFIT_CATEGORY_LABELS } from "@/lib/utils";

/**
 * Build a PercentileStats from a baseline median value + optional p25/p75.
 */
function buildBaselineStats(
  median: number,
  p25: number | null,
  p75: number | null,
  fromCurrency: string | null,
  toCurrency: string,
  rates: CurrencyRateMap,
  isCurrency: boolean
): PercentileStats {
  const convert = (v: number) =>
    isCurrency && fromCurrency
      ? Math.round(convertCurrency(v, fromCurrency, toCurrency, rates))
      : v;

  const cMedian = convert(median);
  const cP25 = p25 !== null ? convert(p25) : Math.round(cMedian * 0.7);
  const cP75 = p75 !== null ? convert(p75) : Math.round(cMedian * 1.4);

  return {
    p25: cP25,
    median: cMedian,
    p75: cP75,
    mean: cMedian,
    min: Math.round(cP25 * 0.6),
    max: Math.round(cP75 * 1.5),
    count: 0,
  };
}

interface BaselineRow {
  benefitCategory: string;
  metricType: string;
  value: number;
  unit: string;
  currency: string | null;
  percentile25: number | null;
  percentile75: number | null;
  source: { name: string; publisher: string; year: number; sampleSize: number | null };
}

/**
 * Fetch active baseline benchmarks for a country and convert to CategoryBenchmark[].
 * Only uses the most recent year per source for each country.
 */
export async function buildBaselineCategories(
  country: string,
  targetCurrency: string,
  rates: CurrencyRateMap,
  industry?: string
): Promise<{ categories: CategoryBenchmark[]; sources: string[] }> {
  const rows = await prisma.baselineBenchmark.findMany({
    where: {
      country,
      source: { isActive: true },
      ...(industry ? { OR: [{ industry }, { industry: null }] } : {}),
    },
    include: {
      source: {
        select: { name: true, publisher: true, year: true, sampleSize: true },
      },
    },
    orderBy: { source: { year: "desc" } },
  });

  if (rows.length === 0) return { categories: [], sources: [] };

  // Collect unique source names for attribution
  const sourceNames = new Set<string>();

  // Group by benefitCategory, keeping most recent per metric
  const categoryMetrics = new Map<string, Map<string, BaselineRow>>();

  for (const row of rows) {
    sourceNames.add(`${row.source.name} (${row.source.publisher}, ${row.source.year})`);

    if (!categoryMetrics.has(row.benefitCategory)) {
      categoryMetrics.set(row.benefitCategory, new Map());
    }
    const metrics = categoryMetrics.get(row.benefitCategory)!;
    // Only keep the first (most recent year) for each metric type
    if (!metrics.has(row.metricType)) {
      metrics.set(row.metricType, row as unknown as BaselineRow);
    }
  }

  const results: CategoryBenchmark[] = [];

  for (const [category, metrics] of Array.from(categoryMetrics.entries())) {
    const prevalenceRow = metrics.get("PREVALENCE");
    const prevalence = prevalenceRow ? Math.round(prevalenceRow.value) : 50;

    // Cost stats
    let costStats: PercentileStats | null = null;
    const medianCost = metrics.get("MEDIAN_COST_PER_EMPLOYEE");
    const avgCost = metrics.get("AVERAGE_COST_PER_EMPLOYEE");
    if (medianCost) {
      costStats = buildBaselineStats(
        medianCost.value, medianCost.percentile25, medianCost.percentile75,
        medianCost.currency, targetCurrency, rates, true
      );
      if (avgCost) {
        const converted = medianCost.currency
          ? Math.round(convertCurrency(avgCost.value, medianCost.currency, targetCurrency, rates))
          : Math.round(avgCost.value);
        costStats.mean = converted;
      }
    }

    // Pension stats
    let pensionStats: PensionCategoryStats | null = null;
    if (category === "PENSION") {
      const medianContrib = metrics.get("MEDIAN_CONTRIBUTION_RATE");
      const avgContrib = metrics.get("AVERAGE_CONTRIBUTION_RATE");
      const dcSplit = metrics.get("PLAN_TYPE_SPLIT_DC");
      const dbSplit = metrics.get("PLAN_TYPE_SPLIT_DB");
      const deathBenefit = metrics.get("DEATH_BENEFIT_MULTIPLE");

      const employerStats = medianContrib
        ? buildBaselineStats(medianContrib.value, medianContrib.percentile25, medianContrib.percentile75, null, targetCurrency, rates, false)
        : avgContrib
          ? buildBaselineStats(avgContrib.value, avgContrib.percentile25, avgContrib.percentile75, null, targetCurrency, rates, false)
          : null;

      const planTypeBreakdown: { type: string; count: number; percentage: number }[] = [];
      if (dcSplit) planTypeBreakdown.push({ type: "DC", count: 0, percentage: Math.round(dcSplit.value) });
      if (dbSplit) planTypeBreakdown.push({ type: "DB", count: 0, percentage: Math.round(dbSplit.value) });

      const deathBenefitStats = deathBenefit
        ? buildBaselineStats(deathBenefit.value, deathBenefit.percentile25, deathBenefit.percentile75, null, targetCurrency, rates, false)
        : null;

      if (employerStats || planTypeBreakdown.length > 0) {
        pensionStats = {
          employerPctStats: employerStats,
          employeePctStats: null,
          totalContributionStats: null,
          deathBenefitMultipleStats: deathBenefitStats,
          planTypeBreakdown,
          employerOnlyPct: 0,
          employerPlusEmployeePct: 0,
          belowThresholdPct: 0,
          formulaTypeBreakdown: [],
          deathBenefitTypeBreakdown: [],
        };
      }
    }

    // Life stats
    let lifeStats: LifeCategoryStats | null = null;
    if (category === "LIFE") {
      const coverLevel = metrics.get("COVER_LEVEL_MEDIAN");
      if (coverLevel && coverLevel.unit === "multiple") {
        lifeStats = {
          coverMultipleStats: buildBaselineStats(coverLevel.value, coverLevel.percentile25, coverLevel.percentile75, null, targetCurrency, rates, false),
          fixedCoverAmountStats: null,
          freeCoverLimitStats: null,
        };
      }
    }

    // IP stats
    let ipStats: IpCategoryStats | null = null;
    if (category === "INCOME_PROTECTION") {
      const replacementRatio = metrics.get("REPLACEMENT_RATIO");
      const coverLevel = metrics.get("COVER_LEVEL_MEDIAN");
      const pctRow = replacementRatio || coverLevel;
      if (pctRow && pctRow.unit === "percent") {
        ipStats = {
          benefitPercentStats: buildBaselineStats(pctRow.value, pctRow.percentile25, pctRow.percentile75, null, targetCurrency, rates, false),
          waitingPeriodStats: null,
          maxBenefitAgeStats: null,
        };
      }
    }

    const fundingRate = metrics.get("EMPLOYER_FUNDING_RATE");
    const spousePrevalence = metrics.get("SPOUSE_COVER_PREVALENCE");
    const dependentPrevalence = metrics.get("DEPENDENT_COVER_PREVALENCE");

    results.push({
      category,
      categoryLabel: BENEFIT_CATEGORY_LABELS[category] ?? category,
      companyCount: 0,
      totalCompanies: 0,
      prevalence,
      meetsMinimum: true,
      costStats,
      healthStats: null,
      lifeStats,
      ipStats,
      ciStats: null,
      dentalStats: null,
      pensionStats,
      annualLeaveStats: null,
      sickPayStats: null,
      maternityPayStats: null,
      paternityPayStats: null,
      planDesignStats: null,
      generosityIndex: null,
      maternitySpecificStats: null,
      dentalSpecificStats: null,
      visionStats: null,
      brokerCarrierStats: null,
      policyMetadataStats: null,
      regulatoryStats: null,
      pctEmployerFunded: fundingRate ? Math.round(fundingRate.value) : 0,
      pctCoversSpouse: spousePrevalence ? Math.round(spousePrevalence.value) : 0,
      pctCoversDependents: dependentPrevalence ? Math.round(dependentPrevalence.value) : 0,
      pctCore: 100,
      pctVoluntary: 0,
      pctFlexible: 0,
      sourceDescription: `Baseline data from ${Array.from(sourceNames).join("; ")}`,
    });
  }

  results.sort((a, b) => b.prevalence - a.prevalence);
  return { categories: results, sources: Array.from(sourceNames) };
}
