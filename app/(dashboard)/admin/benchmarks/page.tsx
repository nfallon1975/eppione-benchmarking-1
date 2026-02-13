"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Download } from "lucide-react";
import { StatCard } from "@/components/benchmarks/stat-card";
import { CurrencyToggle } from "@/components/benchmarks/currency-toggle";
import { BenchmarkDetailedTab } from "@/components/benchmarks/benchmark-detailed-tab";
import { BenchmarkCostTab } from "@/components/benchmarks/benchmark-cost-tab";
import { BenchmarkPlatformTab } from "@/components/benchmarks/benchmark-platform-tab";
import type { BenchmarkResult } from "@/lib/benchmarking-types";
import {
  NACE_INDUSTRIES,
  BENEFIT_CATEGORY_LABELS,
  EMPLOYEE_COUNT_RANGES,
  cn,
} from "@/lib/utils";
import { CountryPicker } from "@/components/ui/country-picker";

interface AdminStats {
  totalApproved: number;
  totalSubmitted: number;
  totalBenefitEntries: number;
  dataQuality: {
    missingSalary: number;
    missingPlatform: number;
    entriesWithoutCost: number;
  };
  byCountry: { country: string; count: number }[];
  byIndustry: { industry: string; count: number }[];
  bySize: { sizeBand: string; count: number }[];
  coverage: { country: string; category: string; count: number }[];
}

export default function AdminBenchmarksPage() {
  useSession(); // ensure authenticated
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkResult | null>(null);
  const [country, setCountry] = useState("IE");
  const [industry, setIndustry] = useState("all");
  const [sizeBand, setSizeBand] = useState("all");
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(true);

  // Load admin stats
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/admin/benchmarks");
        if (res.ok) setStats(await res.json());
      } catch (err) {
        console.error(err);
      }
    }
    loadStats();
  }, []);

  // Fetch benchmarks with admin filters
  const fetchBenchmarks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ country, currency });
      if (industry !== "all") params.set("industry", industry);
      if (sizeBand !== "all") params.set("sizeBand", sizeBand);
      const res = await fetch(`/api/benchmarking?${params}`);
      if (res.ok) setBenchmarkData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [country, industry, sizeBand, currency]);

  useEffect(() => {
    fetchBenchmarks();
  }, [fetchBenchmarks]);

  const handleExport = (type: string) => {
    window.open(`/api/admin/benchmarks/export?type=${type}`, "_blank");
  };

  // Coverage heatmap data
  const coverageCountries = stats ? Array.from(new Set(stats.coverage.map((c) => c.country))) : [];
  const coverageCategories = stats ? Array.from(new Set(stats.coverage.map((c) => c.category))) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Benchmark Data Management</h1>
        <p className="mt-1 text-slate-500">
          Admin view — unrestricted access to all benchmark data
        </p>
      </div>

      {/* Overview stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Approved Users" value={`${stats.totalApproved}`} />
          <StatCard label="Surveys Submitted" value={`${stats.totalSubmitted}`} />
          <StatCard label="Benefit Entries" value={`${stats.totalBenefitEntries}`} />
          <StatCard
            label="Data Quality Issues"
            value={`${stats.dataQuality.missingSalary + stats.dataQuality.missingPlatform + stats.dataQuality.entriesWithoutCost}`}
            comparison={`${stats.dataQuality.missingSalary} missing salary, ${stats.dataQuality.missingPlatform} missing platform, ${stats.dataQuality.entriesWithoutCost} no cost`}
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <CountryPicker
                value={country}
                onChange={setCountry}
                className="w-[220px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {Object.entries(NACE_INDUSTRIES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>{code} - {name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company Size</Label>
              <Select value={sizeBand} onValueChange={setSizeBand}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sizes</SelectItem>
                  {EMPLOYEE_COUNT_RANGES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CurrencyToggle value={currency} onChange={setCurrency} localCurrency="EUR" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport("benefits")}>
                <Download className="mr-1 h-3 w-3" />
                Export Benefits
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("companies")}>
                <Download className="mr-1 h-3 w-3" />
                Export Companies
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submission overview */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submissions by Country</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[...stats.byCountry].sort((a, b) => b.count - a.count)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="country" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#00B4D8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submissions by Size Band</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.bySize}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sizeBand" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0077B6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Coverage heatmap */}
      {stats && coverageCountries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Benefit Coverage Heatmap</CardTitle>
            <CardDescription>Number of companies with entries per country/category</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="pb-2 text-left font-medium text-slate-500">Category</th>
                  {[...coverageCountries].sort().map((c) => (
                    <th key={c} className="pb-2 text-center font-medium text-slate-500">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...coverageCategories].sort().map((cat) => (
                  <tr key={cat} className="border-t">
                    <td className="py-1.5 font-medium">{BENEFIT_CATEGORY_LABELS[cat] || cat}</td>
                    {[...coverageCountries].sort().map((c) => {
                      const entry = stats.coverage.find((x) => x.country === c && x.category === cat);
                      const count = entry?.count || 0;
                      return (
                        <td
                          key={c}
                          className={cn(
                            "py-1.5 text-center font-medium",
                            count >= 5 && "bg-green-100 text-green-800",
                            count >= 3 && count < 5 && "bg-amber-50 text-amber-700",
                            count > 0 && count < 3 && "bg-red-50 text-red-600",
                            count === 0 && "text-slate-300"
                          )}
                        >
                          {count || "--"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Benchmark data tabs (reusing client components) */}
      {!loading && benchmarkData && benchmarkData.totalCompanies > 0 && (
        <Tabs defaultValue="detailed">
          <TabsList>
            <TabsTrigger value="detailed">Detailed Data</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="platform">Platform</TabsTrigger>
          </TabsList>
          <TabsContent value="detailed">
            <BenchmarkDetailedTab data={benchmarkData} />
          </TabsContent>
          <TabsContent value="costs">
            <BenchmarkCostTab data={benchmarkData} />
          </TabsContent>
          <TabsContent value="platform">
            <BenchmarkPlatformTab data={benchmarkData} />
          </TabsContent>
        </Tabs>
      )}

      {!loading && benchmarkData?.totalCompanies === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-slate-500">
              No data matches the current filter criteria.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
