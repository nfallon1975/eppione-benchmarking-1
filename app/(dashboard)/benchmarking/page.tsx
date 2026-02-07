"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  BENEFIT_CATEGORY_LABELS,
  COUNTRY_LABELS,
  NACE_INDUSTRIES,
  formatCurrency,
} from "@/lib/utils";

interface BenchmarkCategory {
  category: string;
  categoryLabel: string;
  companyCount: number;
  avgCostPerEmployee: number;
  minCost: number;
  maxCost: number;
  pctEmployerFunded: number;
  pctCoversSpouse: number;
  pctCoversDependents: number;
}

interface BenchmarkData {
  country: string;
  industry: string | null;
  totalCompanies: number;
  avgEmployeeCount: number;
  avgSalary: number | null;
  categories: BenchmarkCategory[];
}

interface MyBenefit {
  benefitCategory: string;
  annualCostPerEmployee: number | null;
  costCurrency: string;
}

export default function BenchmarkingPage() {
  const { data: session } = useSession();
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("all");
  const [companyIndustry, setCompanyIndustry] = useState<string | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(
    null
  );
  const [myBenefits, setMyBenefits] = useState<MyBenefit[]>([]);
  const [loading, setLoading] = useState(false);

  const isClient = session?.user?.role === "CLIENT";

  // Load user's company country and industry
  useEffect(() => {
    async function loadCompany() {
      try {
        const res = await fetch("/api/companies");
        if (res.ok) {
          const data = await res.json();
          setCountry(data.country);
          setMyBenefits(data.benefitEntries || []);
          if (data.industry) {
            setCompanyIndustry(data.industry);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadCompany();
  }, []);

  useEffect(() => {
    if (!country) return;

    async function fetchBenchmark() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ country });
        if (industry && industry !== "all") params.set("industry", industry);

        const res = await fetch(`/api/benchmarking?${params}`);
        if (res.ok) {
          const data = await res.json();
          setBenchmarkData(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchBenchmark();
  }, [country, industry]);

  // Build chart data for cost comparison
  const costChartData = (benchmarkData?.categories ?? []).map((cat) => {
    const myBenefit = myBenefits.find(
      (b) => b.benefitCategory === cat.category
    );
    return {
      name:
        BENEFIT_CATEGORY_LABELS[cat.category]?.split(" ")[0] ?? cat.category,
      fullName: BENEFIT_CATEGORY_LABELS[cat.category] ?? cat.category,
      marketAvg: Math.round(cat.avgCostPerEmployee),
      marketMin: Math.round(cat.minCost),
      marketMax: Math.round(cat.maxCost),
      yourCost: myBenefit?.annualCostPerEmployee
        ? Math.round(myBenefit.annualCostPerEmployee)
        : 0,
    };
  });

  // Build radar data for coverage comparison
  const radarData = (benchmarkData?.categories ?? []).map((cat) => {
    const myHas = myBenefits.some((b) => b.benefitCategory === cat.category);
    return {
      category:
        BENEFIT_CATEGORY_LABELS[cat.category]?.split("/")[0]?.trim() ??
        cat.category,
      marketPct: Math.round(
        (cat.companyCount / (benchmarkData?.totalCompanies || 1)) * 100
      ),
      you: myHas ? 100 : 0,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Benchmarking</h1>
        <p className="mt-1 text-slate-500">
          Compare your benefits against anonymised market data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COUNTRY_LABELS).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Industry{isClient ? " (your industry)" : " (optional)"}
              </Label>
              <Select
                value={isClient && companyIndustry ? companyIndustry : industry}
                onValueChange={setIndustry}
                disabled={isClient}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {Object.entries(NACE_INDUSTRIES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {code} - {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Summary</Label>
              <div className="flex items-center gap-2 pt-2">
                {benchmarkData && (
                  <>
                    <Badge variant="secondary">
                      {benchmarkData.totalCompanies} companies
                    </Badge>
                    {benchmarkData.avgSalary && (
                      <Badge variant="outline">
                        Avg salary: {formatCurrency(benchmarkData.avgSalary, "EUR")}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="py-12 text-center text-sm text-slate-500">
          Loading benchmarking data...
        </div>
      )}

      {!loading && benchmarkData && (
        <Tabs defaultValue="cost">
          <TabsList>
            <TabsTrigger value="cost">Cost Comparison</TabsTrigger>
            <TabsTrigger value="coverage">Benefit Coverage</TabsTrigger>
            <TabsTrigger value="details">Detailed Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="cost">
            <Card>
              <CardHeader>
                <CardTitle>Annual Cost Per Employee by Category</CardTitle>
                <CardDescription>
                  Your costs vs. market average, minimum, and maximum
                </CardDescription>
              </CardHeader>
              <CardContent>
                {costChartData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Not enough data for this market yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={costChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => [
                          formatCurrency(Number(value) || 0, "EUR"),
                          String(name),
                        ]}
                        labelFormatter={(label) => {
                          const item = costChartData.find(
                            (d) => d.name === label
                          );
                          return item?.fullName ?? label;
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="yourCost"
                        name="Your Cost"
                        fill="#00B4D8"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="marketAvg"
                        name="Market Average"
                        fill="#94a3b8"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="marketMax"
                        name="Market Max"
                        fill="#cbd5e1"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coverage">
            <Card>
              <CardHeader>
                <CardTitle>Benefit Coverage Comparison</CardTitle>
                <CardDescription>
                  Percentage of companies offering each benefit vs. your
                  coverage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {radarData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Not enough data for this market yet.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={450}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" fontSize={11} />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        fontSize={10}
                      />
                      <Radar
                        name="Market %"
                        dataKey="marketPct"
                        stroke="#94a3b8"
                        fill="#94a3b8"
                        fillOpacity={0.3}
                      />
                      <Radar
                        name="You"
                        dataKey="you"
                        stroke="#00B4D8"
                        fill="#00B4D8"
                        fillOpacity={0.3}
                      />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <div className="grid gap-4 md:grid-cols-2">
              {benchmarkData.categories.map((cat) => {
                const myBenefit = myBenefits.find(
                  (b) => b.benefitCategory === cat.category
                );
                const prevalence = Math.round(
                  (cat.companyCount / benchmarkData.totalCompanies) * 100
                );
                return (
                  <Card key={cat.category}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {BENEFIT_CATEGORY_LABELS[cat.category]}
                        </CardTitle>
                        {myBenefit ? (
                          <Badge variant="success">You offer this</Badge>
                        ) : (
                          <Badge variant="outline">Not offered</Badge>
                        )}
                      </div>
                      <CardDescription>
                        Offered by {prevalence}% of companies ({cat.companyCount}{" "}
                        of {benchmarkData.totalCompanies})
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="text-slate-500">Avg cost/employee:</div>
                        <div className="font-medium">
                          {formatCurrency(cat.avgCostPerEmployee, "EUR")}
                        </div>
                        <div className="text-slate-500">Cost range:</div>
                        <div className="font-medium">
                          {formatCurrency(cat.minCost, "EUR")} -{" "}
                          {formatCurrency(cat.maxCost, "EUR")}
                        </div>
                        <div className="text-slate-500">Employer funded:</div>
                        <div className="font-medium">
                          {cat.pctEmployerFunded}%
                        </div>
                        <div className="text-slate-500">Covers spouse:</div>
                        <div className="font-medium">
                          {cat.pctCoversSpouse}%
                        </div>
                        <div className="text-slate-500">
                          Covers dependents:
                        </div>
                        <div className="font-medium">
                          {cat.pctCoversDependents}%
                        </div>
                        {myBenefit?.annualCostPerEmployee && (
                          <>
                            <div className="text-slate-500">Your cost:</div>
                            <div className="font-bold text-eppione-cyan">
                              {formatCurrency(
                                myBenefit.annualCostPerEmployee,
                                myBenefit.costCurrency
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {!loading && benchmarkData?.totalCompanies === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">
              No benchmarking data available for this market yet. Data will
              appear as more companies contribute.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
