"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartWrapper } from "./chart-wrapper";
import { DonutChart, DonutLegend } from "./donut-chart";
import type { BenchmarkResult } from "@/lib/benchmarking-types";
import { BENEFIT_CATEGORY_LABELS, formatCurrency } from "@/lib/utils";
import { BRAND, CHART_FONT, GRID_STYLE, ANIMATION, DONUT_COLORS } from "./chart-colors";

interface BenchmarkCostTabProps {
  data: BenchmarkResult;
}

export function BenchmarkCostTab({ data }: BenchmarkCostTabProps) {
  const { categories, companyPosition, targetCurrency } = data;

  // Total cost: yours vs market median
  const totalYourCost = companyPosition
    ? companyPosition.reduce((sum, p) => sum + (p.yourCostConverted || 0), 0)
    : 0;
  const totalMedian = categories.reduce((sum, c) => sum + (c.costStats?.median || 0), 0);

  const totalBarData = [
    { name: "Your Company", cost: totalYourCost },
    { name: "Market Median", cost: totalMedian },
  ];

  // Category cost comparison
  const categoryBarData = categories
    .filter((cat) => cat.meetsMinimum && cat.costStats)
    .map((cat) => {
      const pos = companyPosition?.find((p) => p.category === cat.category);
      return {
        name: BENEFIT_CATEGORY_LABELS[cat.category]?.split(" ")[0] || cat.category,
        fullName: BENEFIT_CATEGORY_LABELS[cat.category] || cat.category,
        yourCost: pos?.yourCostConverted || 0,
        median: cat.costStats?.median || 0,
        p75: cat.costStats?.p75 || 0,
      };
    });

  // Employer vs employee funding
  const fundingData = categories
    .filter((cat) => cat.companyCount > 0)
    .map((cat) => ({
      name: BENEFIT_CATEGORY_LABELS[cat.category]?.split(" ")[0] || cat.category,
      fullName: BENEFIT_CATEGORY_LABELS[cat.category] || cat.category,
      employerPct: cat.pctEmployerFunded,
      employeePct: 100 - cat.pctEmployerFunded,
    }));

  // Donut: cost distribution by category (your company)
  const pieData = companyPosition
    ? companyPosition
        .filter((p) => p.yourCostConverted && p.yourCostConverted > 0)
        .map((p) => ({
          name: BENEFIT_CATEGORY_LABELS[p.category]?.split("/")[0]?.trim() || p.category,
          value: p.yourCostConverted || 0,
        }))
    : [];

  const totalCostForDonut = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Total cost comparison */}
      <ChartWrapper
        title="Total Benefits Cost Per Employee"
        description="Your total cost compared to market median"
        downloadFilename="total-cost-comparison"
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={totalBarData} layout="vertical" barSize={28}>
            <CartesianGrid horizontal={false} {...GRID_STYLE} />
            <XAxis
              type="number"
              fontSize={CHART_FONT.axis}
              tickFormatter={(v) => formatCurrency(v, targetCurrency)}
              stroke="#94a3b8"
            />
            <YAxis
              type="category"
              dataKey="name"
              fontSize={CHART_FONT.axis}
              width={120}
              stroke="#94a3b8"
              tick={{ fill: BRAND.primary }}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => formatCurrency(Number(value) || 0, targetCurrency)}
              contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
            />
            <Bar dataKey="cost" fill={BRAND.accent} radius={[0, 6, 6, 0]} animationDuration={ANIMATION.duration} />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* Category comparison */}
      <ChartWrapper
        title="Cost by Category"
        description="Your cost vs market median and P75 per category"
        downloadFilename="category-cost-comparison"
      >
        {categoryBarData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Not enough data for cost comparison.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={categoryBarData} barGap={2}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="name" fontSize={CHART_FONT.axis} stroke="#94a3b8" tick={{ fill: BRAND.primary }} />
              <YAxis
                fontSize={CHART_FONT.axis}
                tickFormatter={(v) => formatCurrency(v, targetCurrency)}
                stroke="#94a3b8"
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  formatCurrency(Number(value) || 0, targetCurrency),
                  String(name),
                ]}
                labelFormatter={(label) => {
                  const item = categoryBarData.find((d) => d.name === label);
                  return item?.fullName || label;
                }}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: CHART_FONT.label }} />
              <Bar dataKey="yourCost" name="Your Cost" fill={BRAND.highlight} stroke={BRAND.primary} strokeWidth={1} radius={[4, 4, 0, 0]} animationDuration={ANIMATION.duration} />
              <Bar dataKey="median" name="Median" fill={BRAND.accent} radius={[4, 4, 0, 0]} animationDuration={ANIMATION.duration} />
              <Bar dataKey="p75" name="P75" fill={BRAND.primary} radius={[4, 4, 0, 0]} animationDuration={ANIMATION.duration} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartWrapper>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Employer/Employee funding */}
        <ChartWrapper
          title="Employer vs Employee Funding"
          description="Percentage employer funded across categories"
          downloadFilename="employer-employee-funding"
        >
          {fundingData.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={fundingData}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="name" fontSize={CHART_FONT.label} stroke="#94a3b8" />
                <YAxis fontSize={CHART_FONT.axis} domain={[0, 100]} stroke="#94a3b8" />
                <Tooltip
                  labelFormatter={(label) => {
                    const item = fundingData.find((d) => d.name === label);
                    return item?.fullName || label;
                  }}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: CHART_FONT.label }} />
                <Bar dataKey="employerPct" name="Employer %" fill={BRAND.accent} stackId="a" animationDuration={ANIMATION.duration} />
                <Bar dataKey="employeePct" name="Employee %" fill="#e2e8f0" stackId="a" radius={[4, 4, 0, 0]} animationDuration={ANIMATION.duration} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>

        {/* Cost distribution donut */}
        <ChartWrapper
          title="Your Cost Distribution"
          description="How your benefits spend is allocated"
          downloadFilename="cost-distribution"
        >
          {pieData.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No cost data for your company.</p>
          ) : (
            <>
              <DonutChart
                data={pieData}
                size={280}
                innerLabel="Total"
                innerValue={formatCurrency(totalCostForDonut, targetCurrency)}
                colors={DONUT_COLORS}
                tooltipFormatter={(value) => formatCurrency(Number(value) || 0, targetCurrency)}
              />
              <DonutLegend
                data={pieData.map((d) => ({
                  name: d.name,
                  value: totalCostForDonut > 0 ? Math.round((d.value / totalCostForDonut) * 100) : 0,
                }))}
                colors={DONUT_COLORS}
              />
            </>
          )}
        </ChartWrapper>
      </div>
    </div>
  );
}
