"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { BRAND, CHART_FONT, GRID_STYLE, ANIMATION } from "./chart-colors";

interface SectorComparisonItem {
  label: string;
  value: number;
  isClient?: boolean;
}

interface SectorComparisonChartProps {
  data: SectorComparisonItem[];
  /** Value format function */
  formatValue?: (v: number) => string;
  /** Optional reference line value (e.g. all-sector median) */
  referenceLine?: number;
  referenceLabel?: string;
  height?: number;
}

export function SectorComparisonChart({
  data,
  formatValue = (v) => `${v}`,
  referenceLine,
  referenceLabel = "All-Sector Median",
  height,
}: SectorComparisonChartProps) {
  // Sort descending by value
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const chartHeight = height || Math.max(280, sorted.length * 36);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={sorted} layout="vertical" barSize={22}>
        <CartesianGrid horizontal={false} {...GRID_STYLE} />
        <XAxis
          type="number"
          fontSize={CHART_FONT.axis}
          tickFormatter={formatValue}
          stroke="#94a3b8"
        />
        <YAxis
          type="category"
          dataKey="label"
          width={160}
          fontSize={CHART_FONT.label}
          stroke="#94a3b8"
          tick={{ fill: BRAND.primary }}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [formatValue(Number(value) || 0), "Value"]}
          labelStyle={{ fontWeight: 600, color: BRAND.primary }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 12,
          }}
        />
        {referenceLine != null && (
          <ReferenceLine
            x={referenceLine}
            stroke={BRAND.secondary}
            strokeWidth={2}
            strokeDasharray="6 4"
            label={{
              value: `${referenceLabel}: ${formatValue(referenceLine)}`,
              position: "top",
              fill: BRAND.secondary,
              fontSize: 10,
            }}
          />
        )}
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          animationDuration={ANIMATION.duration}
        >
          {sorted.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.isClient ? BRAND.highlight : BRAND.primary}
              stroke={entry.isClient ? BRAND.primary : "none"}
              strokeWidth={entry.isClient ? 2 : 0}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
