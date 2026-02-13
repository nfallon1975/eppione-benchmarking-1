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
import { StatCard } from "./stat-card";
import { Badge } from "@/components/ui/badge";
import type { BenchmarkResult } from "@/lib/benchmarking-types";
import { BENEFIT_CATEGORY_LABELS, formatCurrency } from "@/lib/utils";

interface BenchmarkOverviewTabProps {
  data: BenchmarkResult;
  countries: string[];
}

export function BenchmarkOverviewTab({ data, countries }: BenchmarkOverviewTabProps) {
  const { categories, companyPosition, platform, targetCurrency } = data;

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

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Your Total Cost vs Median"
          value={totalYourCost !== null ? formatCurrency(totalYourCost, targetCurrency) : "N/A"}
          comparison={
            totalMedianCost > 0 && totalYourCost !== null
              ? `Market median: ${formatCurrency(totalMedianCost, targetCurrency)}`
              : undefined
          }
          trend={
            totalYourCost !== null && totalMedianCost > 0
              ? totalYourCost > totalMedianCost
                ? "up"
                : "down"
              : "neutral"
          }
        />
        <StatCard
          label="Benefits Offered"
          value={yourBenefitCount !== null ? `${yourBenefitCount}` : "N/A"}
          comparison={`Market average: ${avgBenefitsOffered}`}
          trend={
            yourBenefitCount !== null
              ? yourBenefitCount >= avgBenefitsOffered
                ? "up"
                : "down"
              : "neutral"
          }
        />
        <StatCard
          label="Avg Employer Funded"
          value={`${employerFundedPct}%`}
          comparison="Across all categories in market"
        />
        <StatCard
          label="Platform Adoption"
          value={`${platform.adoptionRate}%`}
          comparison={`${platform.totalCompanies} companies in dataset`}
        />
      </div>

      {/* Radar chart */}
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
              <PolarGrid />
              <PolarAngleAxis dataKey="category" fontSize={11} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} />
              <Radar
                name="Market %"
                dataKey="marketPct"
                stroke="#94a3b8"
                fill="#94a3b8"
                fillOpacity={0.3}
              />
              <Radar
                name="You"
                dataKey="you"
                stroke="#00B4D8"
                fill="#00B4D8"
                fillOpacity={0.3}
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </ChartWrapper>
    </div>
  );
}
