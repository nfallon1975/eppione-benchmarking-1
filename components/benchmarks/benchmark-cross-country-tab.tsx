"use client";

import { useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CategoryBenchmark } from "@/lib/benchmarking-types";
import { BENEFIT_CATEGORY_LABELS, COUNTRY_LABELS, formatCurrency, cn } from "@/lib/utils";

interface CrossCountryData {
  countries: string[];
  targetCurrency: string;
  benchmarks: Record<string, CategoryBenchmark[]>;
}

interface BenchmarkCrossCountryTabProps {
  currency: string;
  companyId?: string;
}

const COUNTRY_COLORS: Record<string, string> = {
  IE: "#00B4D8",
  GB: "#0077B6",
  US: "#023E8A",
  DE: "#48CAE4",
  FR: "#90E0EF",
  NL: "#5B8DEE",
};

export function BenchmarkCrossCountryTab({ currency, companyId }: BenchmarkCrossCountryTabProps) {
  const [data, setData] = useState<CrossCountryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let url = `/api/benchmarking/cross-country?currency=${currency}`;
        if (companyId) url += `&companyId=${encodeURIComponent(companyId)}`;
        const res = await fetch(url);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currency, companyId]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-slate-500">Loading cross-country data...</p>;
  }

  if (!data || data.countries.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-slate-500">
            Cross-country comparison requires benefits data in at least 2 countries.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { countries, benchmarks, targetCurrency } = data;

  // Build grouped bar data: category -> { IE: median, GB: median, ... }
  const allCategories = new Set<string>();
  for (const bms of Object.values(benchmarks)) {
    for (const bm of bms) allCategories.add(bm.category);
  }

  const groupedData = Array.from(allCategories).map((cat) => {
    const row: Record<string, string | number> = {
      name: BENEFIT_CATEGORY_LABELS[cat]?.split(" ")[0] || cat,
      fullName: BENEFIT_CATEGORY_LABELS[cat] || cat,
    };
    for (const c of countries) {
      const bm = benchmarks[c]?.find((b) => b.category === cat);
      row[c] = bm?.costStats?.median || 0;
    }
    return row;
  });

  // Heatmap: prevalence by country and category
  const heatmapCategories = Array.from(allCategories);

  // Gaps: categories available in one country but not another
  const gaps: { country: string; missing: string[] }[] = countries.map((c) => {
    const available = new Set(benchmarks[c]?.map((b) => b.category) || []);
    const missing = heatmapCategories.filter((cat) => {
      // Category exists in at least one other country but not here
      return !available.has(cat) && countries.some((other) => other !== c && benchmarks[other]?.some((b) => b.category === cat));
    });
    return { country: c, missing };
  });

  return (
    <div className="space-y-6">
      {/* Country badges */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Comparing:</span>
        {countries.map((c) => (
          <Badge key={c} variant="secondary">{COUNTRY_LABELS[c] || c}</Badge>
        ))}
      </div>

      {/* Side-by-side median cost comparison */}
      <ChartWrapper
        title="Median Cost by Country"
        description={`All costs normalized to ${targetCurrency}`}
        downloadFilename="cross-country-costs"
      >
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={groupedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v) => formatCurrency(v, targetCurrency)} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                formatCurrency(Number(value) || 0, targetCurrency),
                COUNTRY_LABELS[String(name)] || String(name),
              ]}
              labelFormatter={(label) => {
                const item = groupedData.find((d) => d.name === label);
                return (item?.fullName as string) || label;
              }}
            />
            <Legend formatter={(v) => COUNTRY_LABELS[v] || v} />
            {countries.map((c, i) => (
              <Bar
                key={c}
                dataKey={c}
                fill={COUNTRY_COLORS[c] || `hsl(${i * 60}, 70%, 50%)`}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* Prevalence heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Benefit Prevalence Heatmap</CardTitle>
          <CardDescription>Percentage of companies offering each benefit by country</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="pb-2 text-left font-medium text-slate-500">Category</th>
                {countries.map((c) => (
                  <th key={c} className="pb-2 text-center font-medium text-slate-500">
                    {COUNTRY_LABELS[c] || c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapCategories.map((cat) => (
                <tr key={cat} className="border-t">
                  <td className="py-2 font-medium">{BENEFIT_CATEGORY_LABELS[cat] || cat}</td>
                  {countries.map((c) => {
                    const bm = benchmarks[c]?.find((b) => b.category === cat);
                    const prev = bm?.prevalence || 0;
                    return (
                      <td
                        key={c}
                        className={cn(
                          "py-2 text-center font-medium",
                          prev >= 75 && "bg-green-100 text-green-800",
                          prev >= 50 && prev < 75 && "bg-green-50 text-green-700",
                          prev >= 25 && prev < 50 && "bg-amber-50 text-amber-700",
                          prev > 0 && prev < 25 && "bg-red-50 text-red-600",
                          prev === 0 && "bg-slate-50 text-slate-400"
                        )}
                      >
                        {prev > 0 ? `${prev}%` : "--"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Gaps */}
      {gaps.some((g) => g.missing.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Coverage Gaps</CardTitle>
            <CardDescription>Benefits available in other countries but not here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {gaps
              .filter((g) => g.missing.length > 0)
              .map((g) => (
                <div key={g.country}>
                  <p className="font-medium">{COUNTRY_LABELS[g.country] || g.country}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {g.missing.map((cat) => (
                      <Badge key={cat} variant="outline">
                        {BENEFIT_CATEGORY_LABELS[cat] || cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
