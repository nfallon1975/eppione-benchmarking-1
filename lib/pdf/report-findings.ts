import type { BenchmarkResult } from "@/lib/benchmarking-types";
import { BENEFIT_CATEGORY_LABELS, COUNTRY_LABELS, formatCurrency } from "@/lib/utils";

/**
 * Generate 4-6 data-driven findings for a single country report.
 */
export function generateFindings(
  data: BenchmarkResult,
  companyName: string
): string[] {
  const findings: string[] = [];
  const { categories, companyPosition, platform, targetCurrency } = data;

  // 1. Total cost vs median
  if (companyPosition) {
    const totalYourCost = companyPosition.reduce(
      (sum, p) => sum + (p.yourCostConverted || 0),
      0
    );
    const totalMedian = categories.reduce(
      (sum, c) => sum + (c.costStats?.median || 0),
      0
    );
    if (totalMedian > 0 && totalYourCost > 0) {
      const diff = ((totalYourCost - totalMedian) / totalMedian) * 100;
      if (diff > 5) {
        findings.push(
          `${companyName}'s total benefits cost of ${formatCurrency(totalYourCost, targetCurrency)} per employee is ${Math.abs(Math.round(diff))}% above the market median of ${formatCurrency(totalMedian, targetCurrency)}, suggesting a competitive investment in employee benefits.`
        );
      } else if (diff < -5) {
        findings.push(
          `${companyName}'s total benefits cost of ${formatCurrency(totalYourCost, targetCurrency)} per employee is ${Math.abs(Math.round(diff))}% below the market median of ${formatCurrency(totalMedian, targetCurrency)}, indicating potential room for increased benefits investment.`
        );
      } else {
        findings.push(
          `${companyName}'s total benefits cost of ${formatCurrency(totalYourCost, targetCurrency)} per employee is closely aligned with the market median of ${formatCurrency(totalMedian, targetCurrency)}.`
        );
      }
    }
  }

  // 2. Top/bottom quartile categories
  if (companyPosition) {
    const topQuartile = companyPosition.filter(
      (p) => p.percentileRank !== null && p.percentileRank >= 75
    );
    const bottomQuartile = companyPosition.filter(
      (p) => p.percentileRank !== null && p.percentileRank <= 25
    );
    if (topQuartile.length > 0) {
      const names = topQuartile
        .slice(0, 3)
        .map((p) => BENEFIT_CATEGORY_LABELS[p.category] || p.category)
        .join(", ");
      findings.push(
        `${companyName} ranks in the top quartile for spend on: ${names}. This represents above-market investment in these areas.`
      );
    }
    if (bottomQuartile.length > 0) {
      const names = bottomQuartile
        .slice(0, 3)
        .map((p) => BENEFIT_CATEGORY_LABELS[p.category] || p.category)
        .join(", ");
      findings.push(
        `Cost-efficient positioning noted in: ${names}, where spend falls in the bottom quartile relative to peers.`
      );
    }
  }

  // 3. Coverage gaps vs peers
  if (companyPosition) {
    const offeredCategories = new Set(
      companyPosition
        .filter((p) => p.yourCost !== null && p.yourCost > 0)
        .map((p) => p.category)
    );
    const highPrevalenceGaps = categories.filter(
      (cat) => cat.prevalence >= 60 && !offeredCategories.has(cat.category)
    );
    if (highPrevalenceGaps.length > 0) {
      const gapNames = highPrevalenceGaps
        .slice(0, 3)
        .map((c) => `${BENEFIT_CATEGORY_LABELS[c.category] || c.category} (${Math.round(c.prevalence)}% market prevalence)`)
        .join(", ");
      findings.push(
        `Coverage gaps identified relative to market norms: ${gapNames}. These benefits are widely offered by peers in this market.`
      );
    }
  }

  // 4. Benefit count comparison
  if (companyPosition) {
    const yourCount = companyPosition.filter(
      (p) => p.yourCost !== null && p.yourCost > 0
    ).length;
    const avgCount =
      data.totalCompanies > 0
        ? Math.round(
            categories.reduce((sum, c) => sum + c.companyCount, 0) /
              data.totalCompanies
          )
        : 0;
    if (avgCount > 0) {
      if (yourCount > avgCount) {
        findings.push(
          `${companyName} offers ${yourCount} benefit categories, exceeding the market average of ${avgCount}, demonstrating a comprehensive benefits package.`
        );
      } else if (yourCount < avgCount) {
        findings.push(
          `${companyName} offers ${yourCount} benefit categories compared to a market average of ${avgCount}. Expanding the benefits portfolio could enhance talent attraction.`
        );
      }
    }
  }

  // 5. Employer funding
  const avgEmployerFunding =
    categories.length > 0
      ? Math.round(
          categories.reduce((s, c) => s + c.pctEmployerFunded, 0) /
            categories.length
        )
      : 0;
  if (avgEmployerFunding > 0) {
    findings.push(
      `Market average employer funding stands at ${avgEmployerFunding}% across all benefit categories. Benefits with higher employer funding typically see stronger employee engagement.`
    );
  }

  // 6. Platform adoption
  if (platform.meetsMinimum) {
    findings.push(
      `Benefits platform adoption in this market is ${platform.adoptionRate}% among surveyed companies (${platform.totalCompanies} respondents).${
        platform.satisfactionStats
          ? ` Average satisfaction score is ${platform.satisfactionStats.mean.toFixed(1)}/10.`
          : ""
      }`
    );
  }

  return findings.slice(0, 6);
}

/**
 * Generate cross-country findings for global reports.
 */
export function generateGlobalFindings(
  allData: Record<string, BenchmarkResult>
): string[] {
  const findings: string[] = [];
  const countries = Object.keys(allData);

  if (countries.length < 2) return findings;

  // Cost variance across countries
  const countryTotals: { country: string; median: number; currency: string }[] = [];
  for (const c of countries) {
    const d = allData[c];
    if (!d) continue;
    const total = d.categories.reduce(
      (sum, cat) => sum + (cat.costStats?.median || 0),
      0
    );
    countryTotals.push({ country: c, median: total, currency: d.targetCurrency });
  }

  if (countryTotals.length >= 2) {
    const sorted = [...countryTotals].sort((a, b) => b.median - a.median);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    if (highest.median > 0 && lowest.median > 0) {
      findings.push(
        `Benefits costs vary significantly across markets: ${COUNTRY_LABELS[highest.country] || highest.country} has the highest median total cost at ${formatCurrency(highest.median, highest.currency)}, while ${COUNTRY_LABELS[lowest.country] || lowest.country} is lowest at ${formatCurrency(lowest.median, lowest.currency)}.`
      );
    }
  }

  // Common high-prevalence categories
  const categoryPrevalence: Record<string, number[]> = {};
  for (const c of countries) {
    const d = allData[c];
    if (!d) continue;
    for (const cat of d.categories) {
      if (!categoryPrevalence[cat.category]) {
        categoryPrevalence[cat.category] = [];
      }
      categoryPrevalence[cat.category].push(cat.prevalence);
    }
  }

  const universalBenefits = Object.entries(categoryPrevalence)
    .filter(([, prevs]) => prevs.length === countries.length && prevs.every((p) => p >= 60))
    .map(([cat]) => BENEFIT_CATEGORY_LABELS[cat] || cat);

  if (universalBenefits.length > 0) {
    findings.push(
      `Benefits with consistently high prevalence (>60%) across all markets: ${universalBenefits.slice(0, 4).join(", ")}. These form the core of a harmonized benefits strategy.`
    );
  }

  // Markets with gaps
  const gapsByCountry: Record<string, string[]> = {};
  for (const c of countries) {
    const d = allData[c];
    if (!d?.companyPosition) continue;
    const offered = new Set(
      d.companyPosition
        .filter((p) => p.yourCost !== null && p.yourCost > 0)
        .map((p) => p.category)
    );
    const gaps = d.categories
      .filter((cat) => cat.prevalence >= 50 && !offered.has(cat.category))
      .map((cat) => BENEFIT_CATEGORY_LABELS[cat.category] || cat.category);
    if (gaps.length > 0) {
      gapsByCountry[c] = gaps;
    }
  }

  if (Object.keys(gapsByCountry).length > 0) {
    const gapSummaries = Object.entries(gapsByCountry)
      .slice(0, 3)
      .map(
        ([c, gaps]) =>
          `${COUNTRY_LABELS[c] || c}: ${gaps.slice(0, 2).join(", ")}`
      );
    findings.push(
      `Coverage gaps relative to local market norms: ${gapSummaries.join("; ")}.`
    );
  }

  return findings.slice(0, 4);
}

/**
 * Generate recommendations for global reports.
 */
export function generateRecommendations(
  allData: Record<string, BenchmarkResult>
): string[] {
  const recommendations: string[] = [];
  const countries = Object.keys(allData);

  // Harmonization opportunities
  const categoryPresence: Record<string, string[]> = {};
  for (const c of countries) {
    const d = allData[c];
    if (!d?.companyPosition) continue;
    for (const pos of d.companyPosition) {
      if (pos.yourCost !== null && pos.yourCost > 0) {
        if (!categoryPresence[pos.category]) {
          categoryPresence[pos.category] = [];
        }
        categoryPresence[pos.category].push(c);
      }
    }
  }

  const partialBenefits = Object.entries(categoryPresence)
    .filter(
      ([, presentIn]) =>
        presentIn.length > 0 && presentIn.length < countries.length
    )
    .map(([cat, presentIn]) => ({
      cat,
      label: BENEFIT_CATEGORY_LABELS[cat] || cat,
      missing: countries.filter((c) => !presentIn.includes(c)),
    }));

  if (partialBenefits.length > 0) {
    const examples = partialBenefits
      .slice(0, 3)
      .map(
        (b) =>
          `${b.label} (not in ${b.missing.map((c) => COUNTRY_LABELS[c] || c).join(", ")})`
      );
    recommendations.push(
      `Harmonization opportunity: Consider extending the following benefits across all markets: ${examples.join("; ")}.`
    );
  }

  // Gap coverage suggestions
  for (const c of countries) {
    const d = allData[c];
    if (!d?.companyPosition) continue;
    const offered = new Set(
      d.companyPosition
        .filter((p) => p.yourCost !== null && p.yourCost > 0)
        .map((p) => p.category)
    );
    const highPrevalenceGaps = d.categories.filter(
      (cat) => cat.prevalence >= 70 && !offered.has(cat.category)
    );
    if (highPrevalenceGaps.length > 0) {
      const names = highPrevalenceGaps
        .slice(0, 2)
        .map((cat) => BENEFIT_CATEGORY_LABELS[cat.category] || cat.category)
        .join(" and ");
      recommendations.push(
        `In ${COUNTRY_LABELS[c] || c}, consider introducing ${names} to align with strong local market prevalence (>70% of peers offer these).`
      );
    }
  }

  // Cost optimization
  for (const c of countries) {
    const d = allData[c];
    if (!d?.companyPosition) continue;
    const expensiveCategories = d.companyPosition.filter(
      (p) => p.percentileRank !== null && p.percentileRank >= 85
    );
    if (expensiveCategories.length >= 2) {
      const names = expensiveCategories
        .slice(0, 2)
        .map((p) => BENEFIT_CATEGORY_LABELS[p.category] || p.category)
        .join(" and ");
      recommendations.push(
        `In ${COUNTRY_LABELS[c] || c}, review spend on ${names} which sit above the 85th percentile. A market review or provider tender may yield cost savings.`
      );
    }
  }

  return recommendations.slice(0, 5);
}
