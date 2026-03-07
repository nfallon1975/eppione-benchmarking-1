"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BRAND, CHART_FONT } from "./chart-colors";

interface RangeItem {
  label: string;
  p25: number;
  median: number;
  p75: number;
  yourValue?: number | null;
  /** Format suffix, e.g. "%" or "x" */
  suffix?: string;
}

interface PercentileRangeChartProps {
  items: RangeItem[];
  /** Value format function */
  formatValue?: (v: number) => string;
  height?: number;
}

function getPositionColor(yourValue: number, p25: number, median: number, p75: number) {
  if (yourValue >= p75) return "#10B981"; // top quartile — green
  if (yourValue >= median) return BRAND.accent; // above median — accent blue
  if (yourValue >= p25) return BRAND.amber; // below median — amber
  return "#EF4444"; // bottom quartile — red
}

export function PercentileRangeChart({
  items,
  formatValue = (v) => `${v}`,
  height,
}: PercentileRangeChartProps) {
  const chartHeight = height || Math.max(200, items.length * 56);

  // Transform data: we use a stacked bar approach
  // "base" invisible bar to offset, "range" for P25-P75, plus overlays
  const data = items.map((item) => ({
    ...item,
    base: item.p25,
    range: item.p75 - item.p25,
  }));

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" barSize={20}>
        <XAxis
          type="number"
          fontSize={CHART_FONT.axis}
          tickFormatter={formatValue}
          stroke="#94a3b8"
        />
        <YAxis
          type="category"
          dataKey="label"
          width={130}
          fontSize={CHART_FONT.axis}
          stroke="#94a3b8"
          tick={{ fill: BRAND.primary }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0]?.payload as RangeItem & { base: number; range: number };
            if (!item) return null;
            return (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                <p className="font-semibold text-slate-800">{item.label}</p>
                <div className="mt-1 space-y-0.5 text-slate-600">
                  <p>P25: {formatValue(item.p25)}</p>
                  <p>Median: {formatValue(item.median)}</p>
                  <p>P75: {formatValue(item.p75)}</p>
                  {item.yourValue != null && (
                    <p className="font-semibold" style={{ color: BRAND.highlight }}>
                      You: {formatValue(item.yourValue)}
                    </p>
                  )}
                </div>
              </div>
            );
          }}
        />
        {/* Invisible base bar */}
        <Bar dataKey="base" stackId="range" fill="transparent" radius={0} />
        {/* P25-P75 range bar */}
        <Bar
          dataKey="range"
          stackId="range"
          radius={[0, 4, 4, 0]}
          animationDuration={800}
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.yourValue != null
                  ? getPositionColor(entry.yourValue, entry.p25, entry.median, entry.p75)
                  : "#cbd5e1"
              }
              fillOpacity={0.35}
              stroke={
                entry.yourValue != null
                  ? getPositionColor(entry.yourValue, entry.p25, entry.median, entry.p75)
                  : "#94a3b8"
              }
              strokeWidth={1}
            />
          ))}
        </Bar>
        {/* Median reference lines rendered as custom shapes via dot/label won't work well here;
            we'll use custom SVG in a wrapper or scatter overlay. For simplicity, add ReferenceLine
            for the median of first item only. Real median markers shown via customized label. */}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Simpler inline version showing a single metric's percentile range
 * with median marker and "you" diamond, styled with brand colors.
 */
interface PercentileRangeInlineProps {
  p25: number;
  median: number;
  p75: number;
  min?: number;
  max?: number;
  yourValue?: number | null;
  formatValue?: (v: number) => string;
}

export function PercentileRangeInline({
  p25,
  median,
  p75,
  min,
  max,
  yourValue,
  formatValue = (v) => `${v}`,
}: PercentileRangeInlineProps) {
  const lo = min ?? Math.round(p25 * 0.6);
  const hi = max ?? Math.round(p75 * 1.5);
  const range = hi - lo || 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - lo) / range) * 100));

  const p25Pos = pct(p25);
  const p75Pos = pct(p75);
  const medianPos = pct(median);
  const yourPos = yourValue != null ? pct(yourValue) : null;

  const barColor =
    yourValue != null
      ? getPositionColor(yourValue, p25, median, p75)
      : "#cbd5e1";

  return (
    <div className="space-y-1.5">
      <div className="relative h-7 w-full rounded-md bg-slate-50 border border-slate-200">
        {/* P25–P75 range band */}
        <div
          className="absolute top-1 h-5 rounded"
          style={{
            left: `${p25Pos}%`,
            width: `${Math.max(1, p75Pos - p25Pos)}%`,
            backgroundColor: barColor,
            opacity: 0.25,
          }}
        />
        {/* Median marker */}
        <div
          className="absolute top-0 h-7 w-0.5"
          style={{ left: `${medianPos}%`, backgroundColor: BRAND.primary }}
        />
        {/* Your position — diamond */}
        {yourPos !== null && (
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${yourPos}%` }}
          >
            <div
              className="h-3 w-3 rotate-45"
              style={{ backgroundColor: BRAND.highlight, border: `1.5px solid ${BRAND.primary}` }}
            />
          </div>
        )}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{formatValue(lo)}</span>
        <span>P25: {formatValue(p25)}</span>
        <span className="font-medium text-slate-600">Med: {formatValue(median)}</span>
        <span>P75: {formatValue(p75)}</span>
        <span>{formatValue(hi)}</span>
      </div>
    </div>
  );
}
