"use client";

import type { PercentileStats } from "@/lib/benchmarking-types";
import { formatCurrency } from "@/lib/utils";

interface PercentileBarProps {
  stats: PercentileStats;
  yourValue?: number | null;
  currency: string;
}

export function PercentileBar({ stats, yourValue, currency }: PercentileBarProps) {
  const range = stats.max - stats.min || 1;
  const p25Pct = ((stats.p25 - stats.min) / range) * 100;
  const medianPct = ((stats.median - stats.min) / range) * 100;
  const p75Pct = ((stats.p75 - stats.min) / range) * 100;
  const yourPct = yourValue != null ? ((yourValue - stats.min) / range) * 100 : null;

  return (
    <div className="space-y-2">
      <div className="relative h-8 w-full rounded bg-slate-100">
        {/* P25 to P75 range */}
        <div
          className="absolute top-1 h-6 rounded bg-slate-300"
          style={{
            left: `${Math.max(0, p25Pct)}%`,
            width: `${Math.max(1, p75Pct - p25Pct)}%`,
          }}
        />
        {/* Median line */}
        <div
          className="absolute top-0 h-8 w-0.5 bg-slate-600"
          style={{ left: `${medianPct}%` }}
        />
        {/* Your position */}
        {yourPct !== null && (
          <div
            className="absolute top-0 h-8 w-1.5 rounded bg-[#00B4D8]"
            style={{ left: `${Math.max(0, Math.min(98, yourPct))}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{formatCurrency(stats.min, currency)}</span>
        <span>P25: {formatCurrency(stats.p25, currency)}</span>
        <span>Median: {formatCurrency(stats.median, currency)}</span>
        <span>P75: {formatCurrency(stats.p75, currency)}</span>
        <span>{formatCurrency(stats.max, currency)}</span>
      </div>
    </div>
  );
}
