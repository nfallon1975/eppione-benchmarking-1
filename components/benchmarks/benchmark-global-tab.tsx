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
import type { BenchmarkResult } from "@/lib/benchmarking-types";
import { BENEFIT_CATEGORY_LABELS, NACE_INDUSTRIES, formatCurrency } from "@/lib/utils";

interface BenchmarkGlobalTabProps {
  country: string;
  industry: string;
  currency: string;
}

export function BenchmarkGlobalTab({ country, industry, currency }: BenchmarkGlobalTabProps) {
  const [industryData, setIndustryData] = useState<BenchmarkResult | null>(null);
  const [allData, setAllData] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [indRes, allRes] = await Promise.all([
          fetch(`/api/benchmarking?country=${country}&industry=${industry}&currency=${currency}&grouping=industry_only`),
          fetch(`/api/benchmarking?country=${country}&currency=${currency}&grouping=country_only`),
        ]);
        if (indRes.ok) setIndustryData(await indRes.json());
        if (allRes.ok) setAllData(await allRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [country, industry, currency]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-slate-500">Loading global benchmarks...</p>;
  }

  if (!industryData && !allData) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-slate-500">No global benchmark data available.</p>
        </CardContent>
      </Card>
    );
  }

  // Compare industry-specific vs all-industry for same country
  const allCategories = new Set<string>();
  industryData?.categories.forEach((c) => allCategories.add(c.category));
  allData?.categories.forEach((c) => allCategories.add(c.category));

  const comparisonData = Array.from(allCategories).map((cat) => {
    const indBm = industryData?.categories.find((c) => c.category === cat);
    const allBm = allData?.categories.find((c) => c.category === cat);
    return {
      name: BENEFIT_CATEGORY_LABELS[cat]?.split(" ")[0] || cat,
      fullName: BENEFIT_CATEGORY_LABELS[cat] || cat,
      industryMedian: indBm?.costStats?.median || 0,
      allIndustryMedian: allBm?.costStats?.median || 0,
      industryPrevalence: indBm?.prevalence || 0,
      allPrevalence: allBm?.prevalence || 0,
    };
  });

  const targetCurrency = industryData?.targetCurrency || allData?.targetCurrency || currency;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>Comparing:</span>
        <Badge variant="secondary">{NACE_INDUSTRIES[industry] || industry}</Badge>
        <span>vs</span>
        <Badge variant="outline">All Industries</Badge>
        <span>in {country}</span>
      </div>

      {/* Cost comparison */}
      <ChartWrapper
        title="Industry vs All-Industry Median Cost"
        description="Median cost per employee by category"
        downloadFilename="industry-comparison-costs"
      >
        {comparisonData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => formatCurrency(v, targetCurrency)} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  formatCurrency(Number(value) || 0, targetCurrency),
                  String(name),
                ]}
                labelFormatter={(label) => {
                  const item = comparisonData.find((d) => d.name === label);
                  return item?.fullName || label;
                }}
              />
              <Legend />
              <Bar dataKey="industryMedian" name="Your Industry" fill="#00B4D8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="allIndustryMedian" name="All Industries" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartWrapper>

      {/* Prevalence comparison */}
      <ChartWrapper
        title="Benefit Prevalence: Industry vs Market"
        description="Percentage of companies offering each benefit"
        downloadFilename="industry-comparison-prevalence"
      >
        {comparisonData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} domain={[0, 100]} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [`${value}%`, String(name)]}
                labelFormatter={(label) => {
                  const item = comparisonData.find((d) => d.name === label);
                  return item?.fullName || label;
                }}
              />
              <Legend />
              <Bar dataKey="industryPrevalence" name="Your Industry" fill="#00B4D8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="allPrevalence" name="All Industries" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartWrapper>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {industryData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Industry</CardTitle>
              <CardDescription>{NACE_INDUSTRIES[industry] || industry}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500">Companies:</span>
                <span className="font-medium">{industryData.totalCompanies}</span>
                <span className="text-slate-500">Avg Salary:</span>
                <span className="font-medium">
                  {industryData.avgSalary ? formatCurrency(industryData.avgSalary, targetCurrency) : "N/A"}
                </span>
                <span className="text-slate-500">Categories tracked:</span>
                <span className="font-medium">{industryData.categories.length}</span>
              </div>
            </CardContent>
          </Card>
        )}
        {allData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Industries</CardTitle>
              <CardDescription>Full market in {country}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500">Companies:</span>
                <span className="font-medium">{allData.totalCompanies}</span>
                <span className="text-slate-500">Avg Salary:</span>
                <span className="font-medium">
                  {allData.avgSalary ? formatCurrency(allData.avgSalary, targetCurrency) : "N/A"}
                </span>
                <span className="text-slate-500">Categories tracked:</span>
                <span className="font-medium">{allData.categories.length}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
