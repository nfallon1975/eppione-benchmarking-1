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
  ReferenceLine,
} from "recharts";
import { BRAND, CHART_FONT, GRID_STYLE, ANIMATION } from "./chart-colors";

interface SalaryBandChartItem {
  band: string;
  bandLabel: string;
  employerPct: number;
  employeePct: number;
  companyCount: number;
}

interface StackedSalaryBandChartProps {
  data: SalaryBandChartItem[];
  referenceLinePct?: number;
  referenceLabel?: string;
}

export function StackedSalaryBandChart({
  data,
  referenceLinePct,
  referenceLabel = "Target Replacement Rate",
}: StackedSalaryBandChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        No salary band data available.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} barSize={40}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis
          dataKey="bandLabel"
          fontSize={CHART_FONT.axis}
          stroke="#94a3b8"
          tick={{ fill: BRAND.primary }}
        />
        <YAxis
          fontSize={CHART_FONT.axis}
          tickFormatter={(v) => `${v}%`}
          stroke="#94a3b8"
          domain={[0, "auto"]}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [`${value}%`, String(name)]}
          labelStyle={{ fontWeight: 600, color: BRAND.primary }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 12,
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: CHART_FONT.label }}
        />
        {referenceLinePct != null && (
          <ReferenceLine
            y={referenceLinePct}
            stroke={BRAND.rose}
            strokeWidth={2}
            strokeDasharray="6 4"
            label={{
              value: referenceLabel,
              position: "right",
              fill: BRAND.rose,
              fontSize: 10,
            }}
          />
        )}
        <Bar
          dataKey="employerPct"
          name="Employer %"
          stackId="contrib"
          fill={BRAND.accent}
          radius={[0, 0, 0, 0]}
          animationDuration={ANIMATION.duration}
        />
        <Bar
          dataKey="employeePct"
          name="Employee %"
          stackId="contrib"
          fill={BRAND.primary}
          radius={[4, 4, 0, 0]}
          animationDuration={ANIMATION.duration}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
