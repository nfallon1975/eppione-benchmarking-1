"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartWrapper } from "./chart-wrapper";
import { AnimatedStatCard } from "./animated-stat-card";
import { DonutChart, DonutLegend } from "./donut-chart";
import { PercentileRangeInline } from "./percentile-range-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { BenchmarkResult } from "@/lib/benchmarking-types";
import { BENEFIT_CATEGORY_LABELS, formatCurrency } from "@/lib/utils";
import { BRAND, ANIMATION } from "./chart-colors";

interface BenchmarkOverviewTabProps {
  data: BenchmarkResult;
  countries: string[];
}

export function BenchmarkOverviewTab({ data, countries }: BenchmarkOverviewTabProps) {
  const { categories, companyPosition, platform, targetCurrency, yourBenefitEntryCount } = data;

  // Radar data: market prevalence vs your coverage
  const radarData = categories.map((cat) => {
    const pos = companyPosition?.find((p) => p.category === cat.category);
    return {
      category: BENEFIT_CATEGORY_LABELS[cat.category]?.split("/")[0]?.trim() || cat.category,
      marketPct: cat.prevalence,
      you: pos?.yourCost !== null && pos?.yourCost !== undefined ? 100 : 0,
    };
  });

  // Stat calculations
  const totalYourCost = companyPosition
    ? companyPosition.reduce((sum, p) => sum + (p.yourCostConverted || 0), 0)
    : null;

  const totalMedianCost = categories.reduce(
    (sum, cat) => sum + (cat.costStats?.median || 0),
    0
  );

  const yourBenefitCount = companyPosition
    ? companyPosition.filter((p) => p.yourCost !== null && p.yourCost > 0).length
    : null;

  const avgBenefitsOffered = data.totalCompanies > 0
    ? Math.round(
        categories.reduce((sum, cat) => sum + cat.companyCount, 0) / data.totalCompanies
      )
    : 0;

  const employerFundedPct = categories.length > 0
    ? Math.round(categories.reduce((s, c) => s + c.pctEmployerFunded, 0) / categories.length)
    : 0;

  // Donut data: core vs flex vs voluntary split
  const totalCore = categories.reduce((s, c) => s + (c.pctCore || 0), 0);
  const totalFlex = categories.reduce((s, c) => s + (c.pctFlexible || 0), 0);
  const totalVol = categories.reduce((s, c) => s + (c.pctVoluntary || 0), 0);
  const splitTotal = totalCore + totalFlex + totalVol;
  const benefitSplitData = splitTotal > 0
    ? [
        { name: "Core", value: Math.round((totalCore / splitTotal) * 100) },
        { name: "Flexible", value: Math.round((totalFlex / splitTotal) * 100) },
        { name: "Voluntary", value: Math.round((totalVol / splitTotal) * 100) },
      ]
    : [];

  // Funding split donut
  const fundingData = [
    { name: "Employer", value: employerFundedPct },
    { name: "Employee", value: 100 - employerFundedPct },
  ];

  return (
    <div className="space-y-6">
      {/* Country badges */}
      {countries.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Countries submitted:</span>
          {countries.map((c) => (
            <Badge key={c} variant="secondary">{c}</Badge>
          ))}
        </div>
      )}

      {/* Animated stat cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <AnimatedStatCard
          label="Your Total Cost / Employee"
          value={totalYourCost ?? 0}
          prefix={targetCurrency === "EUR" ? "\u20ac" : targetCurrency === "GBP" ? "\u00a3" : targetCurrency === "USD" ? "$" : ""}
          comparison={
            totalMedianCost > 0 && totalYourCost !== null
              ? `Market median: ${formatCurrency(totalMedianCost, targetCurrency)}`
              : undefined
          }
          trend={
            totalYourCost !== null && totalMedianCost > 0
              ? totalYourCost > totalMedianCost ? "up" : "down"
              : "neutral"
          }
          accentColor={BRAND.accent}
        />
        <AnimatedStatCard
          label="Benefits Offered"
          value={yourBenefitEntryCount ?? 0}
          comparison={`Across ${yourBenefitCount ?? 0} categories (market avg: ${avgBenefitsOffered})`}
          trend={
            yourBenefitCount !== null
              ? yourBenefitCount >= avgBenefitsOffered ? "up" : "down"
              : "neutral"
          }
          accentColor={BRAND.primary}
        />
        <AnimatedStatCard
          label="Employer Funded"
          value={employerFundedPct}
          suffix="%"
          comparison="Average across all categories"
          accentColor={BRAND.secondary}
        />
        <AnimatedStatCard
          label="Platform Adoption"
          value={platform.adoptionRate}
          suffix="%"
          comparison={`${platform.totalCompanies} companies in dataset`}
          accentColor={BRAND.highlight}
        />
      </div>

      {/* Radar + Donuts row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Radar chart — takes 2 cols */}
        <div className="md:col-span-2">
          <ChartWrapper
            title="Your Coverage vs Market Prevalence"
            description="How your benefits coverage compares to the market"
            downloadFilename="coverage-radar"
          >
            {radarData.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Not enough data for this market yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={420}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="category" fontSize={11} tick={{ fill: BRAND.primary }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} stroke="#94a3b8" />
                  <Radar
                    name="Market %"
                    dataKey="marketPct"
                    stroke={BRAND.primary}
                    fill={BRAND.primary}
                    fillOpacity={0.15}
                    animationDuration={ANIMATION.duration}
                  />
                  <Radar
                    name="You"
                    dataKey="you"
                    stroke={BRAND.accent}
                    fill={BRAND.accent}
                    fillOpacity={0.3}
                    animationDuration={ANIMATION.duration}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </ChartWrapper>
        </div>

        {/* Donut charts column */}
        <div className="space-y-6">
          {benefitSplitData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Benefit Type Split</CardTitle>
                <CardDescription className="text-xs">Core / Flexible / Voluntary</CardDescription>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={benefitSplitData}
                  size={180}
                  colors={[BRAND.primary, BRAND.accent, BRAND.secondary]}
                />
                <DonutLegend
                  data={benefitSplitData}
                  colors={[BRAND.primary, BRAND.accent, BRAND.secondary]}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Funding Split</CardTitle>
              <CardDescription className="text-xs">Employer vs Employee funded</CardDescription>
            </CardHeader>
            <CardContent>
              <DonutChart
                data={fundingData}
                size={180}
                innerLabel="Employer"
                innerValue={`${employerFundedPct}%`}
                colors={[BRAND.accent, "#e2e8f0"]}
              />
              <DonutLegend
                data={fundingData}
                colors={[BRAND.accent, "#e2e8f0"]}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* "Where You Sit" — Percentile range inline for each category */}
      {companyPosition && companyPosition.length > 0 && categories.some((c) => c.costStats) && (
        <ChartWrapper
          title="Where You Sit"
          description="Your position within the P25-P75 range for each benefit category"
          downloadFilename="percentile-position"
        >
          <div className="space-y-5 pt-2">
            {categories
              .filter((cat) => cat.costStats && cat.meetsMinimum)
              .map((cat) => {
                const pos = companyPosition?.find((p) => p.category === cat.category);
                const s = cat.costStats!;
                return (
                  <div key={cat.category}>
                    <p className="mb-1 text-sm font-medium" style={{ color: BRAND.primary }}>
                      {BENEFIT_CATEGORY_LABELS[cat.category] || cat.category}
                    </p>
                    <PercentileRangeInline
                      p25={s.p25}
                      median={s.median}
                      p75={s.p75}
                      min={s.min}
                      max={s.max}
                      yourValue={pos?.yourCostConverted}
                      formatValue={(v) => formatCurrency(v, targetCurrency)}
                    />
                  </div>
                );
              })}
          </div>
        </ChartWrapper>
      )}
    </div>
  );
}
