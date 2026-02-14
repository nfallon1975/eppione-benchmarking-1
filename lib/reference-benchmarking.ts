import { prisma } from "@/lib/db";
import { type CurrencyRateMap, convertCurrency } from "@/lib/currency";
import type {
  CategoryBenchmark,
  PercentileStats,
  HealthCategoryStats,
  HealthLimitTypeStats,
  LifeCategoryStats,
  IpCategoryStats,
  PensionCategoryStats,
} from "@/lib/benchmarking-types";
import { BENEFIT_CATEGORY_LABELS } from "@/lib/utils";

/**
 * Build a single PercentileStats from reference data points.
 * Uses p25, median, p75, avg as provided; synthesizes min/max from p25/p75.
 */
function buildStats(
  p25: number | null,
  median: number | null,
  p75: number | null,
  avg: number | null,
  fromCurrency: string,
  toCurrency: string,
  rates: CurrencyRateMap
): PercentileStats | null {
  if (median === null) return null;

  const convert = (v: number) =>
    Math.round(convertCurrency(v, fromCurrency, toCurrency, rates));

  const cMedian = convert(median);
  const cP25 = p25 !== null ? convert(p25) : Math.round(cMedian * 0.7);
  const cP75 = p75 !== null ? convert(p75) : Math.round(cMedian * 1.4);
  const cAvg = avg !== null ? convert(avg) : cMedian;

  return {
    p25: cP25,
    median: cMedian,
    p75: cP75,
    mean: cAvg,
    min: Math.round(cP25 * 0.6),
    max: Math.round(cP75 * 1.5),
    count: 0, // reference data, no real count
  };
}

/**
 * Fetch published + verified ReferenceBenchmark rows for a country
 * and convert them to CategoryBenchmark[] compatible with the existing UI.
 */
export async function buildReferenceCategories(
  country: string,
  targetCurrency: string,
  rates: CurrencyRateMap
): Promise<CategoryBenchmark[]> {
  const refs = await prisma.referenceBenchmark.findMany({
    where: {
      country,
      verifiedByAdmin: true,
      publishedAt: { not: null },
    },
  });

  if (refs.length === 0) return [];

  const results: CategoryBenchmark[] = [];

  for (const ref of refs) {
    const costStats = buildStats(
      ref.costP25,
      ref.costMedian,
      ref.costP75,
      ref.costAvg,
      ref.costCurrency,
      targetCurrency,
      rates
    );

    // Health-specific stats
    let healthStats: HealthCategoryStats | null = null;
    if (ref.benefitCategory === "HEALTH") {
      const excessStats =
        ref.healthExcess !== null
          ? buildStats(
              null,
              ref.healthExcess,
              null,
              null,
              ref.costCurrency,
              targetCurrency,
              rates
            )
          : null;
      const copayStats =
        ref.healthCopayPercent !== null
          ? {
              p25: Math.round(ref.healthCopayPercent * 0.7),
              median: Math.round(ref.healthCopayPercent),
              p75: Math.round(ref.healthCopayPercent * 1.3),
              mean: Math.round(ref.healthCopayPercent),
              min: 0,
              max: Math.round(ref.healthCopayPercent * 2),
              count: 0,
            }
          : null;
      const inpatientStats =
        ref.healthInpatientLimit !== null
          ? buildStats(
              null,
              ref.healthInpatientLimit,
              null,
              null,
              ref.costCurrency,
              targetCurrency,
              rates
            )
          : null;
      const outpatientStats =
        ref.healthOutpatientLimit !== null
          ? buildStats(
              null,
              ref.healthOutpatientLimit,
              null,
              null,
              ref.costCurrency,
              targetCurrency,
              rates
            )
          : null;

      // Convert flat inpatient/outpatient into limitTypeStats for new display
      const limitTypeStats: HealthLimitTypeStats[] = [];
      if (inpatientStats) {
        limitTypeStats.push({
          limitType: "INPATIENT",
          limitTypeLabel: "Inpatient",
          totalCompanies: 0,
          companiesWithLimit: 0,
          companiesFullCover: 0,
          limitStats: inpatientStats,
        });
      }
      if (outpatientStats) {
        limitTypeStats.push({
          limitType: "OUTPATIENT",
          limitTypeLabel: "Outpatient",
          totalCompanies: 0,
          companiesWithLimit: 0,
          companiesFullCover: 0,
          limitStats: outpatientStats,
        });
      }

      if (excessStats || copayStats || inpatientStats || outpatientStats) {
        healthStats = {
          excessStats,
          copayStats,
          inpatientLimitStats: inpatientStats,
          outpatientLimitStats: outpatientStats,
          limitTypeStats,
        };
      }
    }

    // Life-specific stats
    let lifeStats: LifeCategoryStats | null = null;
    if (ref.benefitCategory === "LIFE" && ref.lifeCoverMultiple !== null) {
      lifeStats = {
        coverMultipleStats: {
          p25: Math.round((ref.lifeCoverMultiple * 0.75) * 10) / 10,
          median: ref.lifeCoverMultiple,
          p75: Math.round((ref.lifeCoverMultiple * 1.5) * 10) / 10,
          mean: ref.lifeCoverMultiple,
          min: 1,
          max: Math.round(ref.lifeCoverMultiple * 2),
          count: 0,
        },
        fixedCoverAmountStats: null,
        freeCoverLimitStats: null,
      };
    }

    // Income Protection stats
    let ipStats: IpCategoryStats | null = null;
    if (ref.benefitCategory === "INCOME_PROTECTION") {
      const benefitPctStats =
        ref.ipBenefitPercent !== null
          ? {
              p25: Math.round(ref.ipBenefitPercent * 0.85),
              median: Math.round(ref.ipBenefitPercent),
              p75: Math.round(ref.ipBenefitPercent * 1.1),
              mean: Math.round(ref.ipBenefitPercent),
              min: Math.round(ref.ipBenefitPercent * 0.5),
              max: Math.round(ref.ipBenefitPercent * 1.3),
              count: 0,
            }
          : null;
      const waitingStats =
        ref.ipWaitingPeriodWeeks !== null
          ? {
              p25: Math.max(1, ref.ipWaitingPeriodWeeks - 4),
              median: ref.ipWaitingPeriodWeeks,
              p75: ref.ipWaitingPeriodWeeks + 8,
              mean: ref.ipWaitingPeriodWeeks,
              min: 1,
              max: ref.ipWaitingPeriodWeeks + 16,
              count: 0,
            }
          : null;

      if (benefitPctStats || waitingStats) {
        ipStats = {
          benefitPercentStats: benefitPctStats,
          waitingPeriodStats: waitingStats,
          maxBenefitAgeStats: null,
        };
      }
    }

    // Pension stats
    let pensionStats: PensionCategoryStats | null = null;
    if (ref.benefitCategory === "PENSION") {
      const employerStats =
        ref.pensionEmployerPct !== null
          ? {
              p25: Math.round(ref.pensionEmployerPct * 0.7 * 10) / 10,
              median: ref.pensionEmployerPct,
              p75: Math.round(ref.pensionEmployerPct * 1.4 * 10) / 10,
              mean: ref.pensionEmployerPct,
              min: Math.round(ref.pensionEmployerPct * 0.3 * 10) / 10,
              max: Math.round(ref.pensionEmployerPct * 2 * 10) / 10,
              count: 0,
            }
          : null;
      const employeeStats =
        ref.pensionEmployeePct !== null
          ? {
              p25: Math.round(ref.pensionEmployeePct * 0.7 * 10) / 10,
              median: ref.pensionEmployeePct,
              p75: Math.round(ref.pensionEmployeePct * 1.4 * 10) / 10,
              mean: ref.pensionEmployeePct,
              min: Math.round(ref.pensionEmployeePct * 0.3 * 10) / 10,
              max: Math.round(ref.pensionEmployeePct * 2 * 10) / 10,
              count: 0,
            }
          : null;

      if (employerStats || employeeStats) {
        pensionStats = {
          employerPctStats: employerStats,
          employeePctStats: employeeStats,
        };
      }
    }

    results.push({
      category: ref.benefitCategory,
      categoryLabel: BENEFIT_CATEGORY_LABELS[ref.benefitCategory] ?? ref.benefitCategory,
      companyCount: 0,
      totalCompanies: 0,
      prevalence: ref.prevalencePercent,
      meetsMinimum: true, // reference data is always "enough"
      costStats,
      healthStats,
      lifeStats,
      ipStats,
      ciStats: null,
      dentalStats: null,
      pensionStats,
      pctEmployerFunded: ref.pctEmployerFunded ?? 0,
      pctCoversSpouse: ref.pctCoversSpouse ?? 0,
      pctCoversDependents: ref.pctCoversDependents ?? 0,
      pctCore: 100,
      pctVoluntary: 0,
      pctFlexible: 0,
      confidenceLevel: ref.confidenceLevel,
      sourceDescription: ref.sourceDescription,
      sourceUrls: ref.sourceUrls,
      coverageNotes: ref.coverageNotes,
    });
  }

  // Sort by prevalence descending
  results.sort((a, b) => b.prevalence - a.prevalence);
  return results;
}
