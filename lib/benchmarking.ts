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
  type HealthLimitTypeStats,
  type LifeCategoryStats,
  type IpCategoryStats,
  type CiCategoryStats,
  type DentalCategoryStats,
  type PensionCategoryStats,
  type PensionSalaryBandStats,
  type AnnualLeaveCategoryStats,
  type SickPayCategoryStats,
  type MaternityPayCategoryStats,
  type PaternityPayCategoryStats,
  SALARY_BAND_LABELS,
} from "./benchmarking-types";
import { type CurrencyRateMap, convertCurrency } from "./currency";
import { BENEFIT_CATEGORY_LABELS } from "./utils";

export const ANONYMITY_MINIMUM = 3;

const HEALTH_LIMIT_TYPE_LABELS: Record<string, string> = {
  INPATIENT: "Inpatient",
  OUTPATIENT: "Outpatient",
  DENTAL: "Dental",
  MENTAL_HEALTH: "Mental Health",
  OPTICAL: "Optical",
  MATERNITY: "Maternity",
};

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

      // Per-limit-type stats from HealthLimit records
      const limitsByType = new Map<string, { withLimit: number[]; fullCover: number }>();
      for (const e of entries) {
        for (const hl of e.healthLimits) {
          if (!limitsByType.has(hl.limitType)) {
            limitsByType.set(hl.limitType, { withLimit: [], fullCover: 0 });
          }
          const bucket = limitsByType.get(hl.limitType)!;
          if (hl.hasLimit && hl.limitAmount !== null) {
            bucket.withLimit.push(
              convertCurrency(hl.limitAmount, hl.limitCurrency || "EUR", targetCurrency, rates)
            );
          } else if (!hl.hasLimit) {
            bucket.fullCover++;
          }
        }
      }

      const limitTypeStats: HealthLimitTypeStats[] = [];
      for (const [limitType, bucket] of Array.from(limitsByType.entries())) {
        limitTypeStats.push({
          limitType,
          limitTypeLabel: HEALTH_LIMIT_TYPE_LABELS[limitType] || limitType,
          totalCompanies: bucket.withLimit.length + bucket.fullCover,
          companiesWithLimit: bucket.withLimit.length,
          companiesFullCover: bucket.fullCover,
          limitStats: calculatePercentileStats(bucket.withLimit),
        });
      }

      healthStats = {
        excessStats: calculatePercentileStats(excessValues),
        copayStats: calculatePercentileStats(copayValues),
        inpatientLimitStats: calculatePercentileStats(inpatientValues),
        outpatientLimitStats: calculatePercentileStats(outpatientValues),
        limitTypeStats,
      };

      if (
        !healthStats.excessStats &&
        !healthStats.copayStats &&
        !healthStats.inpatientLimitStats &&
        !healthStats.outpatientLimitStats &&
        healthStats.limitTypeStats.length === 0
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
      const totalContributions: number[] = [];
      const deathBenefitMultiples: number[] = [];
      const planTypeCounts = new Map<string, number>();
      const formulaTypeCounts = new Map<string, number>();
      const deathBenefitTypeCounts = new Map<string, number>();
      let employerOnlyCount = 0;
      let employerPlusEmployeeCount = 0;
      let belowThresholdCount = 0;

      for (const e of entries) {
        // Use new contribution rate fields, falling back to legacy fields
        const erRate = e.pensionContributionRateEmployer ?? e.pensionEmployerPct;
        const eeRate = e.pensionContributionRateEmployee ?? e.pensionEmployeePct;

        if (e.pensionEmployerPct !== null && e.pensionEmployerPct !== undefined) {
          employerPcts.push(e.pensionEmployerPct);
        }
        if (e.pensionEmployeePct !== null && e.pensionEmployeePct !== undefined) {
          employeePcts.push(e.pensionEmployeePct);
        }

        if (erRate !== null && erRate !== undefined) {
          const total = erRate + (eeRate ?? 0);
          totalContributions.push(total);

          if (eeRate === null || eeRate === undefined || eeRate === 0) {
            employerOnlyCount++;
          } else {
            employerPlusEmployeeCount++;
          }

          if (erRate < 3) {
            belowThresholdCount++;
          }
        }

        if (e.pensionDeathBenefitMultiple !== null && e.pensionDeathBenefitMultiple !== undefined) {
          deathBenefitMultiples.push(e.pensionDeathBenefitMultiple);
        }

        if (e.pensionPlanType) {
          planTypeCounts.set(e.pensionPlanType, (planTypeCounts.get(e.pensionPlanType) || 0) + 1);
        }
        if (e.pensionFormulaType) {
          formulaTypeCounts.set(e.pensionFormulaType, (formulaTypeCounts.get(e.pensionFormulaType) || 0) + 1);
        }
        if (e.pensionDeathBenefitType) {
          deathBenefitTypeCounts.set(e.pensionDeathBenefitType, (deathBenefitTypeCounts.get(e.pensionDeathBenefitType) || 0) + 1);
        }
      }

      const totalWithContrib = employerOnlyCount + employerPlusEmployeeCount;
      const planTypeTotal = Array.from(planTypeCounts.values()).reduce((a, b) => a + b, 0);
      const formulaTypeTotal = Array.from(formulaTypeCounts.values()).reduce((a, b) => a + b, 0);
      const deathBenefitTypeTotal = Array.from(deathBenefitTypeCounts.values()).reduce((a, b) => a + b, 0);

      pensionStats = {
        employerPctStats: calculatePercentileStats(employerPcts),
        employeePctStats: calculatePercentileStats(employeePcts),
        totalContributionStats: calculatePercentileStats(totalContributions),
        deathBenefitMultipleStats: calculatePercentileStats(deathBenefitMultiples),
        planTypeBreakdown: Array.from(planTypeCounts.entries()).map(([type, count]) => ({
          type,
          count,
          percentage: planTypeTotal > 0 ? Math.round((count / planTypeTotal) * 100) : 0,
        })),
        employerOnlyPct: totalWithContrib > 0 ? Math.round((employerOnlyCount / totalWithContrib) * 100) : 0,
        employerPlusEmployeePct: totalWithContrib > 0 ? Math.round((employerPlusEmployeeCount / totalWithContrib) * 100) : 0,
        belowThresholdPct: totalWithContrib > 0 ? Math.round((belowThresholdCount / totalWithContrib) * 100) : 0,
        formulaTypeBreakdown: Array.from(formulaTypeCounts.entries()).map(([type, count]) => ({
          type,
          count,
          percentage: formulaTypeTotal > 0 ? Math.round((count / formulaTypeTotal) * 100) : 0,
        })),
        deathBenefitTypeBreakdown: Array.from(deathBenefitTypeCounts.entries()).map(([type, count]) => ({
          type,
          count,
          percentage: deathBenefitTypeTotal > 0 ? Math.round((count / deathBenefitTypeTotal) * 100) : 0,
        })),
      };

      if (!pensionStats.employerPctStats && !pensionStats.employeePctStats && !pensionStats.totalContributionStats) {
        pensionStats = null;
      }
    }

    // Annual Leave stats
    let annualLeaveStats: AnnualLeaveCategoryStats | null = null;
    if (category === "ANNUAL_LEAVE" && meetsMinimum) {
      const days: number[] = [];
      const carryOver: number[] = [];
      const maxDays: number[] = [];
      const volunteerDays: number[] = [];
      const closureDays: number[] = [];
      let pubHolCount = 0;
      let tenureCount = 0;
      let buySellCount = 0;
      let birthdayCount = 0;
      let totalWithData = 0;

      for (const e of entries) {
        if (e.leaveDaysEntitlement !== null && e.leaveDaysEntitlement !== undefined) days.push(e.leaveDaysEntitlement);
        if (e.leaveCarryOverDays !== null && e.leaveCarryOverDays !== undefined) carryOver.push(e.leaveCarryOverDays);
        if (e.leaveMaxDays !== null && e.leaveMaxDays !== undefined) maxDays.push(e.leaveMaxDays);
        if (e.leaveVolunteerDays !== null && e.leaveVolunteerDays !== undefined) volunteerDays.push(e.leaveVolunteerDays);
        if (e.leaveChristmasClosureDays !== null && e.leaveChristmasClosureDays !== undefined) closureDays.push(e.leaveChristmasClosureDays);
        totalWithData++;
        if (e.leaveIncludesPublicHolidays) pubHolCount++;
        if (e.leaveIncreasesWithTenure) tenureCount++;
        if (e.leaveBuySellDays) buySellCount++;
        if (e.leaveBirthdayOff) birthdayCount++;
      }

      annualLeaveStats = {
        daysEntitlementStats: calculatePercentileStats(days),
        carryOverDaysStats: calculatePercentileStats(carryOver),
        maxDaysStats: calculatePercentileStats(maxDays),
        volunteerDaysStats: calculatePercentileStats(volunteerDays),
        christmasClosureDaysStats: calculatePercentileStats(closureDays),
        pctIncludesPublicHolidays: totalWithData > 0 ? Math.round((pubHolCount / totalWithData) * 100) : 0,
        pctIncreasesWithTenure: totalWithData > 0 ? Math.round((tenureCount / totalWithData) * 100) : 0,
        pctBuySellDays: totalWithData > 0 ? Math.round((buySellCount / totalWithData) * 100) : 0,
        pctBirthdayOff: totalWithData > 0 ? Math.round((birthdayCount / totalWithData) * 100) : 0,
      };

      if (!annualLeaveStats.daysEntitlementStats) annualLeaveStats = null;
    }

    // Sick Pay stats
    let sickPayStats: SickPayCategoryStats | null = null;
    if (category === "SICK_PAY" && meetsMinimum) {
      const fullPay: number[] = [];
      const halfPay: number[] = [];
      const partialPct: number[] = [];
      const waitingDays: number[] = [];
      let aboveStatCount = 0;
      let totalWithData = 0;

      for (const e of entries) {
        if (e.sickPayFullPayWeeks !== null && e.sickPayFullPayWeeks !== undefined) fullPay.push(e.sickPayFullPayWeeks);
        if (e.sickPayHalfPayWeeks !== null && e.sickPayHalfPayWeeks !== undefined) halfPay.push(e.sickPayHalfPayWeeks);
        if (e.sickPayPartialPayPercent !== null && e.sickPayPartialPayPercent !== undefined) partialPct.push(e.sickPayPartialPayPercent);
        if (e.sickPayWaitingDays !== null && e.sickPayWaitingDays !== undefined) waitingDays.push(e.sickPayWaitingDays);
        totalWithData++;
        if (e.sickPayAboveStatutory) aboveStatCount++;
      }

      sickPayStats = {
        fullPayWeeksStats: calculatePercentileStats(fullPay),
        halfPayWeeksStats: calculatePercentileStats(halfPay),
        partialPayPercentStats: calculatePercentileStats(partialPct),
        waitingDaysStats: calculatePercentileStats(waitingDays),
        pctAboveStatutory: totalWithData > 0 ? Math.round((aboveStatCount / totalWithData) * 100) : 0,
      };

      if (!sickPayStats.fullPayWeeksStats && !sickPayStats.halfPayWeeksStats) sickPayStats = null;
    }

    // Maternity Pay stats
    let maternityPayStats: MaternityPayCategoryStats | null = null;
    if (category === "MATERNITY_PAY" && meetsMinimum) {
      const fullPay: number[] = [];
      const partialPay: number[] = [];
      const partialPct: number[] = [];
      const totalLeave: number[] = [];
      const kitDays: number[] = [];
      let aboveStatCount = 0;
      let gradualReturnCount = 0;
      let totalWithData = 0;

      for (const e of entries) {
        if (e.maternityFullPayWeeks !== null && e.maternityFullPayWeeks !== undefined) fullPay.push(e.maternityFullPayWeeks);
        if (e.maternityPartialPayWeeks !== null && e.maternityPartialPayWeeks !== undefined) partialPay.push(e.maternityPartialPayWeeks);
        if (e.maternityPartialPayPercent !== null && e.maternityPartialPayPercent !== undefined) partialPct.push(e.maternityPartialPayPercent);
        if (e.maternityTotalLeaveWeeks !== null && e.maternityTotalLeaveWeeks !== undefined) totalLeave.push(e.maternityTotalLeaveWeeks);
        if (e.maternityKitDays !== null && e.maternityKitDays !== undefined) kitDays.push(e.maternityKitDays);
        totalWithData++;
        if (e.maternityAboveStatutory) aboveStatCount++;
        if (e.maternityGradualReturn) gradualReturnCount++;
      }

      maternityPayStats = {
        fullPayWeeksStats: calculatePercentileStats(fullPay),
        partialPayWeeksStats: calculatePercentileStats(partialPay),
        partialPayPercentStats: calculatePercentileStats(partialPct),
        totalLeaveWeeksStats: calculatePercentileStats(totalLeave),
        kitDaysStats: calculatePercentileStats(kitDays),
        pctAboveStatutory: totalWithData > 0 ? Math.round((aboveStatCount / totalWithData) * 100) : 0,
        pctGradualReturn: totalWithData > 0 ? Math.round((gradualReturnCount / totalWithData) * 100) : 0,
      };

      if (!maternityPayStats.fullPayWeeksStats && !maternityPayStats.partialPayWeeksStats) maternityPayStats = null;
    }

    // Paternity Pay stats
    let paternityPayStats: PaternityPayCategoryStats | null = null;
    if (category === "PATERNITY_PAY" && meetsMinimum) {
      const fullPay: number[] = [];
      const partialPay: number[] = [];
      const partialPct: number[] = [];
      const totalLeave: number[] = [];
      let aboveStatCount = 0;
      let sharedParentalCount = 0;
      let totalWithData = 0;

      for (const e of entries) {
        if (e.paternityFullPayWeeks !== null && e.paternityFullPayWeeks !== undefined) fullPay.push(e.paternityFullPayWeeks);
        if (e.paternityPartialPayWeeks !== null && e.paternityPartialPayWeeks !== undefined) partialPay.push(e.paternityPartialPayWeeks);
        if (e.paternityPartialPayPercent !== null && e.paternityPartialPayPercent !== undefined) partialPct.push(e.paternityPartialPayPercent);
        if (e.paternityTotalLeaveWeeks !== null && e.paternityTotalLeaveWeeks !== undefined) totalLeave.push(e.paternityTotalLeaveWeeks);
        totalWithData++;
        if (e.paternityAboveStatutory) aboveStatCount++;
        if (e.paternitySharedParentalLeave) sharedParentalCount++;
      }

      paternityPayStats = {
        fullPayWeeksStats: calculatePercentileStats(fullPay),
        partialPayWeeksStats: calculatePercentileStats(partialPay),
        partialPayPercentStats: calculatePercentileStats(partialPct),
        totalLeaveWeeksStats: calculatePercentileStats(totalLeave),
        pctAboveStatutory: totalWithData > 0 ? Math.round((aboveStatCount / totalWithData) * 100) : 0,
        pctSharedParentalLeave: totalWithData > 0 ? Math.round((sharedParentalCount / totalWithData) * 100) : 0,
      };

      if (!paternityPayStats.fullPayWeeksStats && !paternityPayStats.partialPayWeeksStats) paternityPayStats = null;
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
      annualLeaveStats,
      sickPayStats,
      maternityPayStats,
      paternityPayStats,
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

    // Health limit positions from HealthLimit records
    const healthLimitPositions: { limitType: string; hasLimit: boolean; limitAmount: number | null; limitAmountConverted: number | null }[] = [];
    if (bm.category === "HEALTH" && myEntries.length > 0) {
      const seenTypes = new Set<string>();
      for (const e of myEntries) {
        for (const hl of e.healthLimits) {
          if (!seenTypes.has(hl.limitType)) {
            seenTypes.add(hl.limitType);
            healthLimitPositions.push({
              limitType: hl.limitType,
              hasLimit: hl.hasLimit,
              limitAmount: hl.limitAmount,
              limitAmountConverted: hl.hasLimit && hl.limitAmount !== null
                ? Math.round(convertCurrency(hl.limitAmount, hl.limitCurrency || "EUR", targetCurrency, rates))
                : null,
            });
          }
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
    let pensionPlanType: string | null = null;
    let pensionContributionRateEmployer: number | null = null;
    let pensionContributionRateEmployee: number | null = null;
    let pensionTotalContributionRate: number | null = null;
    let pensionDeathBenefitMultiple: number | null = null;
    let pensionDeathBenefitType: string | null = null;
    let pensionFormulaType: string | null = null;

    if (bm.category === "PENSION" && myEntries.length > 0) {
      for (const e of myEntries) {
        if (e.pensionEmployerPct !== null && e.pensionEmployerPct !== undefined && pensionEmployerPct === null) {
          pensionEmployerPct = e.pensionEmployerPct;
        }
        if (e.pensionEmployeePct !== null && e.pensionEmployeePct !== undefined && pensionEmployeePct === null) {
          pensionEmployeePct = e.pensionEmployeePct;
        }
        if (e.pensionPlanType && pensionPlanType === null) {
          pensionPlanType = e.pensionPlanType;
        }
        if (e.pensionContributionRateEmployer !== null && e.pensionContributionRateEmployer !== undefined && pensionContributionRateEmployer === null) {
          pensionContributionRateEmployer = e.pensionContributionRateEmployer;
        }
        if (e.pensionContributionRateEmployee !== null && e.pensionContributionRateEmployee !== undefined && pensionContributionRateEmployee === null) {
          pensionContributionRateEmployee = e.pensionContributionRateEmployee;
        }
        if (e.pensionDeathBenefitMultiple !== null && e.pensionDeathBenefitMultiple !== undefined && pensionDeathBenefitMultiple === null) {
          pensionDeathBenefitMultiple = e.pensionDeathBenefitMultiple;
        }
        if (e.pensionDeathBenefitType && pensionDeathBenefitType === null) {
          pensionDeathBenefitType = e.pensionDeathBenefitType;
        }
        if (e.pensionFormulaType && pensionFormulaType === null) {
          pensionFormulaType = e.pensionFormulaType;
        }
      }
      const erRate = pensionContributionRateEmployer ?? pensionEmployerPct;
      const eeRate = pensionContributionRateEmployee ?? pensionEmployeePct;
      if (erRate !== null) {
        pensionTotalContributionRate = erRate + (eeRate ?? 0);
      }
    }

    // Annual Leave detail values
    let leaveDaysEntitlement: number | null = null;
    let leaveIncludesPublicHolidays: boolean | null = null;
    let leaveIncreasesWithTenure: boolean | null = null;
    let leaveMaxDays: number | null = null;
    let leaveBuySellDays: boolean | null = null;
    let leaveCarryOverDays: number | null = null;
    let leaveBirthdayOff: boolean | null = null;
    let leaveVolunteerDays: number | null = null;
    let leaveChristmasClosureDays: number | null = null;

    if (bm.category === "ANNUAL_LEAVE" && myEntries.length > 0) {
      const e = myEntries[0];
      leaveDaysEntitlement = e.leaveDaysEntitlement;
      leaveIncludesPublicHolidays = e.leaveIncludesPublicHolidays;
      leaveIncreasesWithTenure = e.leaveIncreasesWithTenure;
      leaveMaxDays = e.leaveMaxDays;
      leaveBuySellDays = e.leaveBuySellDays;
      leaveCarryOverDays = e.leaveCarryOverDays;
      leaveBirthdayOff = e.leaveBirthdayOff;
      leaveVolunteerDays = e.leaveVolunteerDays;
      leaveChristmasClosureDays = e.leaveChristmasClosureDays;
    }

    // Sick Pay detail values
    let sickPayFullPayWeeks: number | null = null;
    let sickPayHalfPayWeeks: number | null = null;
    let sickPayPartialPayPercent: number | null = null;
    let sickPayWaitingDays: number | null = null;
    let sickPayAboveStatutory: boolean | null = null;

    if (bm.category === "SICK_PAY" && myEntries.length > 0) {
      const e = myEntries[0];
      sickPayFullPayWeeks = e.sickPayFullPayWeeks;
      sickPayHalfPayWeeks = e.sickPayHalfPayWeeks;
      sickPayPartialPayPercent = e.sickPayPartialPayPercent;
      sickPayWaitingDays = e.sickPayWaitingDays;
      sickPayAboveStatutory = e.sickPayAboveStatutory;
    }

    // Maternity Pay detail values
    let maternityFullPayWeeks: number | null = null;
    let maternityPartialPayWeeks: number | null = null;
    let maternityPartialPayPercent: number | null = null;
    let maternityTotalLeaveWeeks: number | null = null;
    let maternityAboveStatutory: boolean | null = null;
    let maternityKitDays: number | null = null;
    let maternityGradualReturn: boolean | null = null;

    if (bm.category === "MATERNITY_PAY" && myEntries.length > 0) {
      const e = myEntries[0];
      maternityFullPayWeeks = e.maternityFullPayWeeks;
      maternityPartialPayWeeks = e.maternityPartialPayWeeks;
      maternityPartialPayPercent = e.maternityPartialPayPercent;
      maternityTotalLeaveWeeks = e.maternityTotalLeaveWeeks;
      maternityAboveStatutory = e.maternityAboveStatutory;
      maternityKitDays = e.maternityKitDays;
      maternityGradualReturn = e.maternityGradualReturn;
    }

    // Paternity Pay detail values
    let paternityFullPayWeeks: number | null = null;
    let paternityPartialPayWeeks: number | null = null;
    let paternityPartialPayPercent: number | null = null;
    let paternityTotalLeaveWeeks: number | null = null;
    let paternityAboveStatutory: boolean | null = null;
    let paternitySharedParentalLeave: boolean | null = null;

    if (bm.category === "PATERNITY_PAY" && myEntries.length > 0) {
      const e = myEntries[0];
      paternityFullPayWeeks = e.paternityFullPayWeeks;
      paternityPartialPayWeeks = e.paternityPartialPayWeeks;
      paternityPartialPayPercent = e.paternityPartialPayPercent;
      paternityTotalLeaveWeeks = e.paternityTotalLeaveWeeks;
      paternityAboveStatutory = e.paternityAboveStatutory;
      paternitySharedParentalLeave = e.paternitySharedParentalLeave;
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
      healthLimitPositions,
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
      pensionPlanType,
      pensionContributionRateEmployer,
      pensionContributionRateEmployee,
      pensionTotalContributionRate,
      pensionDeathBenefitMultiple,
      pensionDeathBenefitType,
      pensionFormulaType,
      leaveDaysEntitlement,
      leaveIncludesPublicHolidays,
      leaveIncreasesWithTenure,
      leaveMaxDays,
      leaveBuySellDays,
      leaveCarryOverDays,
      leaveBirthdayOff,
      leaveVolunteerDays,
      leaveChristmasClosureDays,
      sickPayFullPayWeeks,
      sickPayHalfPayWeeks,
      sickPayPartialPayPercent,
      sickPayWaitingDays,
      sickPayAboveStatutory,
      maternityFullPayWeeks,
      maternityPartialPayWeeks,
      maternityPartialPayPercent,
      maternityTotalLeaveWeeks,
      maternityAboveStatutory,
      maternityKitDays,
      maternityGradualReturn,
      paternityFullPayWeeks,
      paternityPartialPayWeeks,
      paternityPartialPayPercent,
      paternityTotalLeaveWeeks,
      paternityAboveStatutory,
      paternitySharedParentalLeave,
    };
  });
}

/**
 * Filter benefit data based on filters + grouping.
 * Returns matching companyIds set.
 */
export function filterCompanyIds(
  allCompanies: { id: string; country: string; industry: string; employeeCountRange: string | null; salaryBand?: string | null }[],
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
        // Salary band filter
        if (filters.salaryBand && filters.salaryBand !== "all") {
          if (c.salaryBand !== filters.salaryBand) return false;
        }
        return true;
      })
      .map((c) => c.id)
  );
}

/**
 * Calculate pension contribution/death-benefit stats grouped by salary band.
 */
export function calculatePensionSalaryBandStats(
  pensionEntries: CompanyBenefitData[],
  companyCountryProfiles: { companyId: string; salaryBand: string | null }[]
): PensionSalaryBandStats[] {
  const profileMap = new Map<string, string>();
  for (const p of companyCountryProfiles) {
    if (p.salaryBand) profileMap.set(p.companyId, p.salaryBand);
  }

  const bandData = new Map<string, { contributions: number[]; deathBenefits: number[]; companyIds: Set<string> }>();

  for (const e of pensionEntries) {
    const band = profileMap.get(e.companyId);
    if (!band) continue;

    if (!bandData.has(band)) {
      bandData.set(band, { contributions: [], deathBenefits: [], companyIds: new Set() });
    }
    const bucket = bandData.get(band)!;
    bucket.companyIds.add(e.companyId);

    const erRate = e.pensionContributionRateEmployer ?? e.pensionEmployerPct;
    if (erRate !== null && erRate !== undefined) {
      const total = erRate + (e.pensionContributionRateEmployee ?? e.pensionEmployeePct ?? 0);
      bucket.contributions.push(total);
    }
    if (e.pensionDeathBenefitMultiple !== null && e.pensionDeathBenefitMultiple !== undefined) {
      bucket.deathBenefits.push(e.pensionDeathBenefitMultiple);
    }
  }

  const bandOrder = ["UNDER_35K", "BAND_35K_50K", "BAND_50K_75K", "BAND_75K_100K", "OVER_100K"];
  const results: PensionSalaryBandStats[] = [];

  for (const band of bandOrder) {
    const bucket = bandData.get(band);
    if (!bucket || bucket.companyIds.size === 0) continue;

    results.push({
      salaryBand: band,
      salaryBandLabel: SALARY_BAND_LABELS[band] || band,
      contributionStats: calculatePercentileStats(bucket.contributions),
      deathBenefitStats: calculatePercentileStats(bucket.deathBenefits),
      companyCount: bucket.companyIds.size,
    });
  }

  return results;
}
