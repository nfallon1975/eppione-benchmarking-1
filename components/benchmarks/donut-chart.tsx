"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DONUT_COLORS, BRAND, CHART_FONT, ANIMATION } from "./chart-colors";

interface DonutChartProps {
  data: { name: string; value: number }[];
  size?: number;
  innerLabel?: string;
  innerValue?: string;
  colors?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter?: (value: any) => string;
}

export function DonutChart({
  data,
  size = 240,
  innerLabel,
  innerValue,
  colors = DONUT_COLORS,
  tooltipFormatter,
}: DonutChartProps) {
  const outerRadius = size / 2 - 10;
  const innerRadius = outerRadius * 0.6;
  const filteredData = data.filter((d) => d.value > 0);

  if (filteredData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">No data</p>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size, margin: "0 auto" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filteredData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            animationDuration={ANIMATION.duration}
            strokeWidth={0}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={({ name, percent }: any) => {
              if ((percent ?? 0) < 0.05) return null;
              return `${name} ${Math.round((percent ?? 0) * 100)}%`;
            }}
            labelLine={false}
            fontSize={CHART_FONT.label}
          >
            {filteredData.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={
              tooltipFormatter
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? (value: any) => tooltipFormatter(value)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                : (value: any) => `${value}%`
            }
          />
        </PieChart>
      </ResponsiveContainer>
      {innerLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold"
            style={{ color: BRAND.primary }}
          >
            {innerValue}
          </span>
          <span className="text-xs text-slate-500">{innerLabel}</span>
        </div>
      )}
    </div>
  );
}

interface DonutLegendProps {
  data: { name: string; value: number }[];
  colors?: string[];
  suffix?: string;
}

export function DonutLegend({ data, colors = DONUT_COLORS, suffix = "%" }: DonutLegendProps) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {data
        .filter((d) => d.value > 0)
        .map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="text-slate-600">
              {d.name}: <span className="font-medium">{d.value}{suffix}</span>
            </span>
          </div>
        ))}
    </div>
  );
}
