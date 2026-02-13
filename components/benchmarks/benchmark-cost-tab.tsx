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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ChartWrapper } from "./chart-wrapper";
import type { BenchmarkResult } from "@/lib/benchmarking-types";
import { BENEFIT_CATEGORY_LABELS, formatCurrency } from "@/lib/utils";

interface BenchmarkCostTabProps {
  data: BenchmarkResult;
}

const COLORS = [
  "#00B4D8", "#0077B6", "#023E8A", "#48CAE4", "#90E0EF",
  "#ADE8F4", "#CAF0F8", "#5B8DEE", "#7C3AED", "#F59E0B",
  "#10B981", "#EF4444", "#6366F1", "#8B5CF6", "#EC4899",
  "#94A3B8",
];

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
        marketAvg: cat.costStats?.mean || 0,
        median: cat.costStats?.median || 0,
        p75: cat.costStats?.p75 || 0,
        marketMax: cat.costStats?.max || 0,
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

  // Pie chart: cost distribution by category (your company)
  const pieData = companyPosition
    ? companyPosition
        .filter((p) => p.yourCostConverted && p.yourCostConverted > 0)
        .map((p) => ({
          name: BENEFIT_CATEGORY_LABELS[p.category]?.split("/")[0]?.trim() || p.category,
          value: p.yourCostConverted || 0,
        }))
    : [];

  return (
    <div className="space-y-6">
      {/* Total cost comparison */}
      <ChartWrapper
        title="Total Benefits Cost Per Employee"
        description="Your total cost compared to market median"
        downloadFilename="total-cost-comparison"
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={totalBarData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              fontSize={12}
              tickFormatter={(v) => formatCurrency(v, targetCurrency)}
            />
            <YAxis type="category" dataKey="name" fontSize={12} width={120} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => formatCurrency(Number(value) || 0, targetCurrency)}
            />
            <Bar dataKey="cost" fill="#00B4D8" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* Category comparison */}
      <ChartWrapper
        title="Cost by Category"
        description="Your cost vs market average, median, P75, and max per category"
        downloadFilename="category-cost-comparison"
      >
        {categoryBarData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Not enough data for cost comparison.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={categoryBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis
                fontSize={12}
                tickFormatter={(v) => formatCurrency(v, targetCurrency)}
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
              />
              <Legend />
              <Bar dataKey="yourCost" name="Your Cost" fill="#00B4D8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="marketAvg" name="Market Average" fill="#64748b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="median" name="Median" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="p75" name="P75" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="marketMax" name="Market Max" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={12} domain={[0, 100]} />
                <Tooltip
                  labelFormatter={(label) => {
                    const item = fundingData.find((d) => d.name === label);
                    return item?.fullName || label;
                  }}
                />
                <Legend />
                <Bar dataKey="employerPct" name="Employer %" fill="#00B4D8" stackId="a" />
                <Bar dataKey="employeePct" name="Employee %" fill="#e2e8f0" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>

        {/* Cost distribution pie */}
        <ChartWrapper
          title="Your Cost Distribution"
          description="How your benefits spend is allocated"
          downloadFilename="cost-distribution"
        >
          {pieData.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No cost data for your company.</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={({ name, percent }: any) => `${name || ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  fontSize={11}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0, targetCurrency)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>
      </div>
    </div>
  );
}
