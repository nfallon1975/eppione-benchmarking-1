// Server-only benchmarking calculation engine

import {
  type CompanyBenefitData,
  type PlatformData,
  type PercentileStats,
  type CategoryBenchmark,
  type CompanyPosition,
  type PlatformBenchmark,
  type BenchmarkFilters,
  type BenchmarkGrouping,
  type HealthCategoryStats,
  type LifeCategoryStats,
  type IpCategoryStats,
  type CiCategoryStats,
  type DentalCategoryStats,
  type PensionCategoryStats,
} from "./benchmarking-types";
import { type CurrencyRateMap, convertCurrency } from "./currency";
import { BENEFIT_CATEGORY_LABELS } from "./utils";

export const ANONYMITY_MINIMUM = 3;

/**
 * Calculate percentile using linear interpolation (Excel PERCENTILE.INC method).
 * Returns null if values.length < ANONYMITY_MINIMUM.
 */
export function calculatePercentileStats(values: number[]): PercentileStats | null {
  if (values.length < ANONYMITY_MINIMUM) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  function percentile(p: number): number {
    if (n === 1) return sorted[0];
    const rank = p * (n - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    const fraction = rank - lower;
    return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
  }

  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    p25: Math.round(percentile(0.25)),
    median: Math.round(percentile(0.5)),
    p75: Math.round(percentile(0.75)),
    mean: Math.round(sum / n),
    min: sorted[0],
    max: sorted[n - 1],
    count: n,
  };
}

/**
 * Calculate category benchmarks from benefit data.
 */
export function calculateCategoryBenchmarks(
  data: CompanyBenefitData[],
  totalCompanies: number,
  targetCurrency: string,
  rates: CurrencyRateMap
): CategoryBenchmark[] {
  // Group by category
  const categoryMap = new Map<string, CompanyBenefitData[]>();
  for (const entry of data) {
    const list = categoryMap.get(entry.benefitCategory) || [];
    list.push(entry);
    categoryMap.set(entry.benefitCategory, list);
  }

  const results: CategoryBenchmark[] = [];

  for (const [category, entries] of Array.from(categoryMap.entries())) {
    const uniqueCompanyIds = new Set(entries.map((e) => e.companyId));
    const companyCount = uniqueCompanyIds.size;

    // Convert costs to target currency
    const costs: number[] = [];
    for (const e of entries) {
      if (e.annualCostPerEmployee !== null && e.annualCostPerEmployee > 0) {
        costs.push(
          convertCurrency(e.annualCostPerEmployee, e.costCurrency, targetCurrency, rates)
        );
      }
    }

    const costStats = calculatePercentileStats(costs);
    const meetsMinimum = companyCount >= ANONYMITY_MINIMUM;

    // Health insurance detail stats
    let healthStats: HealthCategoryStats | null = null;
    if (category === "HEALTH" && meetsMinimum) {
      const excessValues: number[] = [];
      const copayValues: number[] = [];
      const inpatientValues: number[] = [];
      const outpatientValues: number[] = [];

      for (const e of entries) {
        if (e.healthExcess !== null && e.healthExcess !== undefined) {
          excessValues.push(
            convertCurrency(e.healthExcess, e.healthExcessCurrency || "EUR", targetCurrency, rates)
          );
        }
        if (e.healthCopayPercent !== null && e.healthCopayPercent !== undefined) {
          copayValues.push(e.healthCopayPercent);
        }
        if (e.healthInpatientLimit !== null && e.healthInpatientLimit !== undefined) {
          inpatientValues.push(
            convertCurrency(e.healthInpatientLimit, e.healthLimitCurrency || "EUR", targetCurrency, rates)
          );
        }
        if (e.healthOutpatientLimit !== null && e.healthOutpatientLimit !== undefined) {
          outpatientValues.push(
            convertCurrency(e.healthOutpatientLimit, e.healthLimitCurrency || "EUR", targetCurrency, rates)
          );
        }
      }

      healthStats = {
        excessStats: calculatePercentileStats(excessValues),
        copayStats: calculatePercentileStats(copayValues),
        inpatientLimitStats: calculatePercentileStats(inpatientValues),
        outpatientLimitStats: calculatePercentileStats(outpatientValues),
      };

      if (
        !healthStats.excessStats &&
        !healthStats.copayStats &&
        !healthStats.inpatientLimitStats &&
        !healthStats.outpatientLimitStats
      ) {
        healthStats = null;
      }
    }

    // Life Insurance detail stats
    let lifeStats: LifeCategoryStats | null = null;
    if (category === "LIFE" && meetsMinimum) {
      const multiples: number[] = [];
      const fixedAmounts: number[] = [];
      const freeCoverLimits: number[] = [];

      for (const e of entries) {
        if (e.lifeCoverMultiple !== null && e.lifeCoverMultiple !== undefined) {
          multiples.push(e.lifeCoverMultiple);
        }
        if (e.lifeFixedCoverAmount !== null && e.lifeFixedCoverAmount !== undefined) {
          fixedAmounts.push(
            convertCurrency(e.lifeFixedCoverAmount, e.lifeCoverAmountCurrency || "EUR", targetCurrency, rates)
          );
        }
        if (e.lifeFreeCoverLimit !== null && e.lifeFreeCoverLimit !== undefined) {
          freeCoverLimits.push(
            convertCurrency(e.lifeFreeCoverLimit, e.lifeCoverAmountCurrency || "EUR", targetCurrency, rates)
          );
        }
      }

      lifeStats = {
        coverMultipleStats: calculatePercentileStats(multiples),
        fixedCoverAmountStats: calculatePercentileStats(fixedAmounts),
        freeCoverLimitStats: calculatePercentileStats(freeCoverLimits),
      };

      if (!lifeStats.coverMultipleStats && !lifeStats.fixedCoverAmountStats && !lifeStats.freeCoverLimitStats) {
        lifeStats = null;
      }
    }

    // Income Protection detail stats
    let ipStats: IpCategoryStats | null = null;
    if (category === "INCOME_PROTECTION" && meetsMinimum) {
      const benefitPcts: number[] = [];
      const waitingPeriods: number[] = [];
      const maxAges: number[] = [];

      for (const e of entries) {
        if (e.ipBenefitPercent !== null && e.ipBenefitPercent !== undefined) {
          benefitPcts.push(e.ipBenefitPercent);
        }
        if (e.ipWaitingPeriodWeeks !== null && e.ipWaitingPeriodWeeks !== undefined) {
          waitingPeriods.push(e.ipWaitingPeriodWeeks);
        }
        if (e.ipMaxBenefitAge !== null && e.ipMaxBenefitAge !== undefined) {
          maxAges.push(e.ipMaxBenefitAge);
        }
      }

      ipStats = {
        benefitPercentStats: calculatePercentileStats(benefitPcts),
        waitingPeriodStats: calculatePercentileStats(waitingPeriods),
        maxBenefitAgeStats: calculatePercentileStats(maxAges),
      };

      if (!ipStats.benefitPercentStats && !ipStats.waitingPeriodStats && !ipStats.maxBenefitAgeStats) {
        ipStats = null;
      }
    }

    // Critical Illness detail stats
    let ciStats: CiCategoryStats | null = null;
    if (category === "CRITICAL_ILLNESS" && meetsMinimum) {
      const multiples: number[] = [];
      const fixedAmounts: number[] = [];

      for (const e of entries) {
        if (e.ciCoverMultiple !== null && e.ciCoverMultiple !== undefined) {
          multiples.push(e.ciCoverMultiple);
        }
        if (e.ciFixedCoverAmount !== null && e.ciFixedCoverAmount !== undefined) {
          fixedAmounts.push(
            convertCurrency(e.ciFixedCoverAmount, e.ciCoverAmountCurrency || "EUR", targetCurrency, rates)
          );
        }
      }

      ciStats = {
        coverMultipleStats: calculatePercentileStats(multiples),
        fixedCoverAmountStats: calculatePercentileStats(fixedAmounts),
      };

      if (!ciStats.coverMultipleStats && !ciStats.fixedCoverAmountStats) {
        ciStats = null;
      }
    }

    // Dental detail stats
    let dentalStats: DentalCategoryStats | null = null;
    if (category === "DENTAL" && meetsMinimum) {
      const limits: number[] = [];

      for (const e of entries) {
        if (e.dentalAnnualLimit !== null && e.dentalAnnualLimit !== undefined) {
          limits.push(
            convertCurrency(e.dentalAnnualLimit, e.dentalAnnualLimitCurrency || "EUR", targetCurrency, rates)
          );
        }
      }

      dentalStats = {
        annualLimitStats: calculatePercentileStats(limits),
      };

      if (!dentalStats.annualLimitStats) {
        dentalStats = null;
      }
    }

    // Pension detail stats
    let pensionStats: PensionCategoryStats | null = null;
    if (category === "PENSION" && meetsMinimum) {
      const employerPcts: number[] = [];
      const employeePcts: number[] = [];

      for (const e of entries) {
        if (e.pensionEmployerPct !== null && e.pensionEmployerPct !== undefined) {
          employerPcts.push(e.pensionEmployerPct);
        }
        if (e.pensionEmployeePct !== null && e.pensionEmployeePct !== undefined) {
          employeePcts.push(e.pensionEmployeePct);
        }
      }

      pensionStats = {
        employerPctStats: calculatePercentileStats(employerPcts),
        employeePctStats: calculatePercentileStats(employeePcts),
      };

      if (!pensionStats.employerPctStats && !pensionStats.employeePctStats) {
        pensionStats = null;
      }
    }

    const totalEntries = entries.length;
    results.push({
      category,
      categoryLabel: BENEFIT_CATEGORY_LABELS[category] ?? category,
      companyCount,
      totalCompanies,
      prevalence: totalCompanies > 0 ? Math.round((companyCount / totalCompanies) * 100) : 0,
      meetsMinimum,
      costStats: meetsMinimum ? costStats : null,
      healthStats,
      lifeStats,
      ipStats,
      ciStats,
      dentalStats,
      pensionStats,
      pctEmployerFunded: totalEntries > 0
        ? Math.round((entries.filter((e) => e.employerFunded).length / totalEntries) * 100)
        : 0,
      pctCoversSpouse: totalEntries > 0
        ? Math.round((entries.filter((e) => e.coversSpouse).length / totalEntries) * 100)
        : 0,
      pctCoversDependents: totalEntries > 0
        ? Math.round((entries.filter((e) => e.coversDependents).length / totalEntries) * 100)
        : 0,
      pctCore: totalEntries > 0
        ? Math.round((entries.filter((e) => e.isCore).length / totalEntries) * 100)
        : 0,
      pctVoluntary: totalEntries > 0
        ? Math.round((entries.filter((e) => e.isVoluntary).length / totalEntries) * 100)
        : 0,
      pctFlexible: totalEntries > 0
        ? Math.round((entries.filter((e) => e.isFlexible).length / totalEntries) * 100)
        : 0,
    });
  }

  // Sort by prevalence descending
  results.sort((a, b) => b.prevalence - a.prevalence);
  return results;
}

/**
 * Calculate platform benchmarks.
 */
export function calculatePlatformBenchmarks(
  data: PlatformData[],
  targetCurrency: string,
  rates: CurrencyRateMap
): PlatformBenchmark {
  const totalCompanies = data.length;
  const withPlatform = data.filter((d) => d.usesPlatform);
  const adoptionRate = totalCompanies > 0 ? Math.round((withPlatform.length / totalCompanies) * 100) : 0;
  const meetsMinimum = totalCompanies >= ANONYMITY_MINIMUM;

  // Fee stats (convert to target currency)
  const fees: number[] = [];
  for (const d of withPlatform) {
    if (d.annualPlatformFee !== null && d.annualPlatformFee > 0) {
      fees.push(convertCurrency(d.annualPlatformFee, d.feeCurrency, targetCurrency, rates));
    }
  }

  // Satisfaction stats
  const satisfactionScores = withPlatform
    .map((d) => d.platformSatisfactionScore)
    .filter((s): s is number => s !== null);

  // Platform type breakdown
  const typeCount = new Map<string, number>();
  for (const d of withPlatform) {
    if (d.platformType) {
      typeCount.set(d.platformType, (typeCount.get(d.platformType) || 0) + 1);
    }
  }
  const platformTypes = Array.from(typeCount.entries()).map(([type, count]) => ({
    type,
    count,
    percentage: withPlatform.length > 0 ? Math.round((count / withPlatform.length) * 100) : 0,
  }));

  // Fee model breakdown
  const feeModelCount = new Map<string, number>();
  for (const d of withPlatform) {
    if (d.feeModel) {
      feeModelCount.set(d.feeModel, (feeModelCount.get(d.feeModel) || 0) + 1);
    }
  }
  const feeModels = Array.from(feeModelCount.entries()).map(([model, count]) => ({
    model,
    count,
    percentage: withPlatform.length > 0 ? Math.round((count / withPlatform.length) * 100) : 0,
  }));

  return {
    adoptionRate,
    totalCompanies,
    meetsMinimum,
    avgFee: meetsMinimum ? calculatePercentileStats(fees) : null,
    satisfactionStats: meetsMinimum ? calculatePercentileStats(satisfactionScores) : null,
    platformTypes,
    feeModels,
  };
}

/**
 * Calculate a single company's position relative to benchmarks.
 */
export function calculateCompanyPosition(
  companyBenefits: CompanyBenefitData[],
  benchmarks: CategoryBenchmark[],
  targetCurrency: string,
  rates: CurrencyRateMap
): CompanyPosition[] {
  return benchmarks.map((bm) => {
    const myEntries = companyBenefits.filter((b) => b.benefitCategory === bm.category);
    // Sum costs across entries for same category
    let totalCost: number | null = null;
    let totalCostConverted: number | null = null;

    if (myEntries.length > 0) {
      totalCost = 0;
      totalCostConverted = 0;
      for (const e of myEntries) {
        if (e.annualCostPerEmployee !== null) {
          totalCost += e.annualCostPerEmployee;
          totalCostConverted += convertCurrency(
            e.annualCostPerEmployee,
            e.costCurrency,
            targetCurrency,
            rates
          );
        }
      }
      totalCost = Math.round(totalCost);
      totalCostConverted = Math.round(totalCostConverted);
    }

    let percentileRank: number | null = null;
    let vsMedian: number | null = null;

    if (bm.costStats && totalCostConverted !== null) {
      // Approximate percentile rank
      const { min, max, median } = bm.costStats;
      if (max > min) {
        percentileRank = Math.round(((totalCostConverted - min) / (max - min)) * 100);
        percentileRank = Math.max(0, Math.min(100, percentileRank));
      } else {
        percentileRank = 50;
      }
      if (median > 0) {
        vsMedian = Math.round(((totalCostConverted - median) / median) * 100);
      }
    }

    // Health insurance detail values (use first entry with data)
    let healthExcess: number | null = null;
    let healthExcessConverted: number | null = null;
    let healthCopayPercent: number | null = null;
    let healthInpatientLimit: number | null = null;
    let healthInpatientLimitConverted: number | null = null;
    let healthOutpatientLimit: number | null = null;
    let healthOutpatientLimitConverted: number | null = null;

    if (bm.category === "HEALTH" && myEntries.length > 0) {
      for (const e of myEntries) {
        if (e.healthExcess !== null && e.healthExcess !== undefined && healthExcess === null) {
          healthExcess = e.healthExcess;
          healthExcessConverted = Math.round(
            convertCurrency(e.healthExcess, e.healthExcessCurrency || "EUR", targetCurrency, rates)
          );
        }
        if (e.healthCopayPercent !== null && e.healthCopayPercent !== undefined && healthCopayPercent === null) {
          healthCopayPercent = e.healthCopayPercent;
        }
        if (e.healthInpatientLimit !== null && e.healthInpatientLimit !== undefined && healthInpatientLimit === null) {
          healthInpatientLimit = e.healthInpatientLimit;
          healthInpatientLimitConverted = Math.round(
            convertCurrency(e.healthInpatientLimit, e.healthLimitCurrency || "EUR", targetCurrency, rates)
          );
        }
        if (e.healthOutpatientLimit !== null && e.healthOutpatientLimit !== undefined && healthOutpatientLimit === null) {
          healthOutpatientLimit = e.healthOutpatientLimit;
          healthOutpatientLimitConverted = Math.round(
            convertCurrency(e.healthOutpatientLimit, e.healthLimitCurrency || "EUR", targetCurrency, rates)
          );
        }
      }
    }

    // Life Insurance detail values
    let lifeCoverMultiple: number | null = null;
    let lifeFixedCoverAmount: number | null = null;
    let lifeFixedCoverAmountConverted: number | null = null;
    let lifeFreeCoverLimit: number | null = null;
    let lifeFreeCoverLimitConverted: number | null = null;

    if (bm.category === "LIFE" && myEntries.length > 0) {
      for (const e of myEntries) {
        if (e.lifeCoverMultiple !== null && e.lifeCoverMultiple !== undefined && lifeCoverMultiple === null) {
          lifeCoverMultiple = e.lifeCoverMultiple;
        }
        if (e.lifeFixedCoverAmount !== null && e.lifeFixedCoverAmount !== undefined && lifeFixedCoverAmount === null) {
          lifeFixedCoverAmount = e.lifeFixedCoverAmount;
          lifeFixedCoverAmountConverted = Math.round(
            convertCurrency(e.lifeFixedCoverAmount, e.lifeCoverAmountCurrency || "EUR", targetCurrency, rates)
          );
        }
        if (e.lifeFreeCoverLimit !== null && e.lifeFreeCoverLimit !== undefined && lifeFreeCoverLimit === null) {
          lifeFreeCoverLimit = e.lifeFreeCoverLimit;
          lifeFreeCoverLimitConverted = Math.round(
            convertCurrency(e.lifeFreeCoverLimit, e.lifeCoverAmountCurrency || "EUR", targetCurrency, rates)
          );
        }
      }
    }

    // Income Protection detail values
    let ipBenefitPercent: number | null = null;
    let ipWaitingPeriodWeeks: number | null = null;
    let ipMaxBenefitAge: number | null = null;

    if (bm.category === "INCOME_PROTECTION" && myEntries.length > 0) {
      for (const e of myEntries) {
        if (e.ipBenefitPercent !== null && e.ipBenefitPercent !== undefined && ipBenefitPercent === null) {
          ipBenefitPercent = e.ipBenefitPercent;
        }
        if (e.ipWaitingPeriodWeeks !== null && e.ipWaitingPeriodWeeks !== undefined && ipWaitingPeriodWeeks === null) {
          ipWaitingPeriodWeeks = e.ipWaitingPeriodWeeks;
        }
        if (e.ipMaxBenefitAge !== null && e.ipMaxBenefitAge !== undefined && ipMaxBenefitAge === null) {
          ipMaxBenefitAge = e.ipMaxBenefitAge;
        }
      }
    }

    // Critical Illness detail values
    let ciCoverMultiple: number | null = null;
    let ciFixedCoverAmount: number | null = null;
    let ciFixedCoverAmountConverted: number | null = null;

    if (bm.category === "CRITICAL_ILLNESS" && myEntries.length > 0) {
      for (const e of myEntries) {
        if (e.ciCoverMultiple !== null && e.ciCoverMultiple !== undefined && ciCoverMultiple === null) {
          ciCoverMultiple = e.ciCoverMultiple;
        }
        if (e.ciFixedCoverAmount !== null && e.ciFixedCoverAmount !== undefined && ciFixedCoverAmount === null) {
          ciFixedCoverAmount = e.ciFixedCoverAmount;
          ciFixedCoverAmountConverted = Math.round(
            convertCurrency(e.ciFixedCoverAmount, e.ciCoverAmountCurrency || "EUR", targetCurrency, rates)
          );
        }
      }
    }

    // Dental detail values
    let dentalAnnualLimit: number | null = null;
    let dentalAnnualLimitConverted: number | null = null;
    let dentalOrthoIncluded: boolean | null = null;

    if (bm.category === "DENTAL" && myEntries.length > 0) {
      for (const e of myEntries) {
        if (e.dentalAnnualLimit !== null && e.dentalAnnualLimit !== undefined && dentalAnnualLimit === null) {
          dentalAnnualLimit = e.dentalAnnualLimit;
          dentalAnnualLimitConverted = Math.round(
            convertCurrency(e.dentalAnnualLimit, e.dentalAnnualLimitCurrency || "EUR", targetCurrency, rates)
          );
        }
        if (e.dentalOrthoIncluded !== null && e.dentalOrthoIncluded !== undefined && dentalOrthoIncluded === null) {
          dentalOrthoIncluded = e.dentalOrthoIncluded;
        }
      }
    }

    // Pension detail values
    let pensionEmployerPct: number | null = null;
    let pensionEmployeePct: number | null = null;

    if (bm.category === "PENSION" && myEntries.length > 0) {
      for (const e of myEntries) {
        if (e.pensionEmployerPct !== null && e.pensionEmployerPct !== undefined && pensionEmployerPct === null) {
          pensionEmployerPct = e.pensionEmployerPct;
        }
        if (e.pensionEmployeePct !== null && e.pensionEmployeePct !== undefined && pensionEmployeePct === null) {
          pensionEmployeePct = e.pensionEmployeePct;
        }
      }
    }

    return {
      category: bm.category,
      yourCost: totalCost,
      yourCostConverted: totalCostConverted,
      percentileRank,
      vsMedian,
      healthExcess,
      healthExcessConverted,
      healthCopayPercent,
      healthInpatientLimit,
      healthInpatientLimitConverted,
      healthOutpatientLimit,
      healthOutpatientLimitConverted,
      lifeCoverMultiple,
      lifeFixedCoverAmount,
      lifeFixedCoverAmountConverted,
      lifeFreeCoverLimit,
      lifeFreeCoverLimitConverted,
      ipBenefitPercent,
      ipWaitingPeriodWeeks,
      ipMaxBenefitAge,
      ciCoverMultiple,
      ciFixedCoverAmount,
      ciFixedCoverAmountConverted,
      dentalAnnualLimit,
      dentalAnnualLimitConverted,
      dentalOrthoIncluded,
      pensionEmployerPct,
      pensionEmployeePct,
    };
  });
}

/**
 * Filter benefit data based on filters + grouping.
 * Returns matching companyIds set.
 */
export function filterCompanyIds(
  allCompanies: { id: string; country: string; industry: string; employeeCountRange: string | null }[],
  filters: BenchmarkFilters,
  grouping: BenchmarkGrouping
): Set<string> {
  return new Set(
    allCompanies
      .filter((c) => {
        // Country filter always applied unless industry_only grouping
        if (grouping !== "industry_only" && c.country !== filters.country) return false;
        // Industry filter
        if (grouping !== "country_only" && filters.industry && filters.industry !== "all") {
          if (c.industry !== filters.industry) return false;
        }
        // Size band filter
        if (filters.sizeBand && filters.sizeBand !== "all") {
          if (c.employeeCountRange !== filters.sizeBand) return false;
        }
        return true;
      })
      .map((c) => c.id)
  );
}
