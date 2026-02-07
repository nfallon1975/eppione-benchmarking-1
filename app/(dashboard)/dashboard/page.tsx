"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Heart,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  BENEFIT_CATEGORY_LABELS,
  COUNTRY_LABELS,
  formatCurrency,
} from "@/lib/utils";

interface CompanyData {
  id: string;
  name: string;
  country: string;
  industry: string;
  employeeCount: number;
  averageSalary: number | null;
  averageSalaryCurrency: string | null;
  benefitEntries: Array<{
    id: string;
    benefitCategory: string;
    benefitName: string;
    annualCostPerEmployee: number | null;
    costCurrency: string;
    isCore: boolean;
  }>;
  platformInfo: Array<{
    usesPlatform: boolean;
    platformName: string | null;
  }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompany() {
      try {
        const res = await fetch("/api/companies");
        if (res.ok) {
          const data = await res.json();
          setCompany(data);
        }
      } catch (err) {
        console.error("Failed to fetch company:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCompany();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  const benefitCount = company?.benefitEntries?.length ?? 0;
  const coreBenefits =
    company?.benefitEntries?.filter((b) => b.isCore).length ?? 0;
  const totalCost =
    company?.benefitEntries?.reduce(
      (sum, b) => sum + (b.annualCostPerEmployee ?? 0),
      0
    ) ?? 0;

  const categories = new Set(
    company?.benefitEntries?.map((b) => b.benefitCategory) ?? []
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-500">
          Welcome back, {session?.user?.name}
        </p>
      </div>

      {!company ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <h3 className="mt-4 text-lg font-semibold">
              Complete Your Company Profile
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Set up your company profile to start benchmarking
            </p>
            <Link href="/company" className="mt-4">
              <Button>Set Up Company Profile</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Company</CardDescription>
                <CardTitle className="text-lg">{company.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Building2 className="h-4 w-4" />
                  {company.employeeCount} employees &middot;{" "}
                  {COUNTRY_LABELS[company.country] ?? company.country}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Benefits</CardDescription>
                <CardTitle className="text-lg">{benefitCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Heart className="h-4 w-4" />
                  {coreBenefits} core &middot;{" "}
                  {benefitCount - coreBenefits} voluntary
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Categories Covered</CardDescription>
                <CardTitle className="text-lg">{categories.size}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <CheckCircle2 className="h-4 w-4" />
                  of 16 possible categories
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Est. Annual Cost / Employee</CardDescription>
                <CardTitle className="text-lg">
                  {totalCost > 0
                    ? formatCurrency(
                        totalCost,
                        company.benefitEntries[0]?.costCurrency ?? "EUR"
                      )
                    : "N/A"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <BarChart3 className="h-4 w-4" />
                  Across all benefits
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Benefits</CardTitle>
                <CardDescription>
                  Current benefit entries for {company.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {benefitCount === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-slate-500">
                      No benefits entered yet
                    </p>
                    <Link href="/benefits" className="mt-2 inline-block">
                      <Button size="sm" variant="outline">
                        Add Benefits
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {company.benefitEntries.slice(0, 5).map((benefit) => (
                      <div
                        key={benefit.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {benefit.benefitName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {BENEFIT_CATEGORY_LABELS[benefit.benefitCategory]}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {benefit.isCore ? (
                            <Badge variant="default">Core</Badge>
                          ) : (
                            <Badge variant="secondary">Voluntary</Badge>
                          )}
                          {benefit.annualCostPerEmployee && (
                            <span className="text-sm font-medium">
                              {formatCurrency(
                                benefit.annualCostPerEmployee,
                                benefit.costCurrency
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {benefitCount > 5 && (
                      <Link href="/benefits">
                        <Button variant="ghost" className="w-full" size="sm">
                          View all {benefitCount} benefits{" "}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Get started with benchmarking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/company" className="block">
                  <div className="flex items-center justify-between rounded-md border p-4 transition-colors hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium">
                          Update Company Profile
                        </p>
                        <p className="text-xs text-slate-500">
                          Edit salary, bonus, and company details
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
                <Link href="/benefits" className="block">
                  <div className="flex items-center justify-between rounded-md border p-4 transition-colors hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <Heart className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium">Manage Benefits</p>
                        <p className="text-xs text-slate-500">
                          Add or edit benefit entries
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
                <Link href="/benchmarking" className="block">
                  <div className="flex items-center justify-between rounded-md border p-4 transition-colors hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium">
                          View Benchmarking
                        </p>
                        <p className="text-xs text-slate-500">
                          Compare against market data
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
