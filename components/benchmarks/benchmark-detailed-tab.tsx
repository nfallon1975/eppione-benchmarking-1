"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PercentileBar } from "./percentile-bar";
import type { BenchmarkResult, CategoryBenchmark, CompanyPosition, PercentileStats } from "@/lib/benchmarking-types";
import { BENEFIT_CATEGORY_LABELS, formatCurrency, getPercentileColor, getPercentileBgColor, cn } from "@/lib/utils";

interface BenchmarkDetailedTabProps {
  data: BenchmarkResult;
}

interface RowData {
  category: string;
  categoryLabel: string;
  yourCost: number | null;
  yourCostConverted: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  percentileRank: number | null;
  prevalence: number;
  meetsMinimum: boolean;
  benchmark: CategoryBenchmark;
  position: CompanyPosition | undefined;
}

export function BenchmarkDetailedTab({ data }: BenchmarkDetailedTabProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const { categories, companyPosition, targetCurrency } = data;

  const rows: RowData[] = categories.map((cat) => {
    const pos = companyPosition?.find((p) => p.category === cat.category);
    return {
      category: cat.category,
      categoryLabel: BENEFIT_CATEGORY_LABELS[cat.category] || cat.category,
      yourCost: pos?.yourCost ?? null,
      yourCostConverted: pos?.yourCostConverted ?? null,
      p25: cat.costStats?.p25 ?? null,
      median: cat.costStats?.median ?? null,
      p75: cat.costStats?.p75 ?? null,
      percentileRank: pos?.percentileRank ?? null,
      prevalence: cat.prevalence,
      meetsMinimum: cat.meetsMinimum,
      benchmark: cat,
      position: pos,
    };
  });

  const columns: ColumnDef<RowData>[] = [
    {
      accessorKey: "categoryLabel",
      header: "Category",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.categoryLabel}</div>
      ),
    },
    {
      accessorKey: "yourCostConverted",
      header: "Your Cost",
      cell: ({ row }) =>
        row.original.yourCostConverted !== null
          ? formatCurrency(row.original.yourCostConverted, targetCurrency)
          : <span className="text-slate-400">--</span>,
    },
    {
      accessorKey: "p25",
      header: "P25",
      cell: ({ row }) =>
        row.original.meetsMinimum && row.original.p25 !== null
          ? formatCurrency(row.original.p25, targetCurrency)
          : <span className="text-slate-400">--</span>,
    },
    {
      accessorKey: "median",
      header: "Median",
      cell: ({ row }) =>
        row.original.meetsMinimum && row.original.median !== null
          ? formatCurrency(row.original.median, targetCurrency)
          : <span className="text-slate-400">--</span>,
    },
    {
      accessorKey: "p75",
      header: "P75",
      cell: ({ row }) =>
        row.original.meetsMinimum && row.original.p75 !== null
          ? formatCurrency(row.original.p75, targetCurrency)
          : <span className="text-slate-400">--</span>,
    },
    {
      accessorKey: "percentileRank",
      header: "Your Rank",
      cell: ({ row }) => {
        const rank = row.original.percentileRank;
        if (!row.original.meetsMinimum) return <Badge variant="outline">Insufficient data</Badge>;
        if (rank === null) return <span className="text-slate-400">--</span>;
        return (
          <span className={cn("font-semibold", getPercentileColor(rank))}>
            P{rank}
          </span>
        );
      },
    },
    {
      accessorKey: "prevalence",
      header: "Prevalence",
      cell: ({ row }) => `${row.original.prevalence}%`,
    },
  ];

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Detailed Comparison</CardTitle>
          <CardDescription>
            Your costs vs. market percentiles (P25, Median, P75). Categories with fewer than 5 companies show &quot;Insufficient data&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="cursor-pointer select-none"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(getPercentileBgColor(row.original.percentileRank))}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Percentile bars for categories that meet minimum */}
      <div className="space-y-4">
        {categories
          .filter((cat) => cat.meetsMinimum && cat.costStats)
          .map((cat) => {
            const pos = companyPosition?.find((p) => p.category === cat.category);
            return (
              <Card key={cat.category}>
                <CardContent className="pt-4">
                  <p className="mb-2 text-sm font-medium">{BENEFIT_CATEGORY_LABELS[cat.category]}</p>
                  <PercentileBar
                    stats={cat.costStats!}
                    yourValue={pos?.yourCostConverted}
                    currency={targetCurrency}
                  />
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Category-specific Plan Details */}
      <CategoryDetailsCard
        categories={categories}
        companyPosition={companyPosition}
        targetCurrency={targetCurrency}
      />
    </div>
  );
}

interface CategoryMetric {
  label: string;
  stats: PercentileStats | null;
  yourValue: number | null;
  formatType: "currency" | "percent" | "multiple" | "integer";
}

function CategoryDetailsCard({
  categories,
  companyPosition,
  targetCurrency,
}: {
  categories: CategoryBenchmark[];
  companyPosition: CompanyPosition[] | null;
  targetCurrency: string;
}) {
  const sections: { title: string; description: string; metrics: CategoryMetric[]; companyCount: number }[] = [];

  // HEALTH
  const healthCat = categories.find((c) => c.category === "HEALTH");
  if (healthCat) {
    const pos = companyPosition?.find((p) => p.category === "HEALTH");
    const hs = healthCat.healthStats;
    const metrics: CategoryMetric[] = [
      { label: "Excess (Deductible)", stats: hs?.excessStats ?? null, yourValue: pos?.healthExcessConverted ?? null, formatType: "currency" },
      { label: "Co-Pay %", stats: hs?.copayStats ?? null, yourValue: pos?.healthCopayPercent ?? null, formatType: "percent" },
      { label: "Inpatient Limit", stats: hs?.inpatientLimitStats ?? null, yourValue: pos?.healthInpatientLimitConverted ?? null, formatType: "currency" },
      { label: "Outpatient Limit", stats: hs?.outpatientLimitStats ?? null, yourValue: pos?.healthOutpatientLimitConverted ?? null, formatType: "currency" },
    ];
    if (metrics.some((m) => m.stats !== null || m.yourValue !== null)) {
      sections.push({ title: "Health Insurance Plan Details", description: "Comparison of health plan parameters across the market", metrics, companyCount: healthCat.companyCount });
    }
  }

  // LIFE
  const lifeCat = categories.find((c) => c.category === "LIFE");
  if (lifeCat) {
    const pos = companyPosition?.find((p) => p.category === "LIFE");
    const ls = lifeCat.lifeStats;
    const metrics: CategoryMetric[] = [
      { label: "Cover Multiple", stats: ls?.coverMultipleStats ?? null, yourValue: pos?.lifeCoverMultiple ?? null, formatType: "multiple" },
      { label: "Fixed Cover Amount", stats: ls?.fixedCoverAmountStats ?? null, yourValue: pos?.lifeFixedCoverAmountConverted ?? null, formatType: "currency" },
      { label: "Free Cover Limit", stats: ls?.freeCoverLimitStats ?? null, yourValue: pos?.lifeFreeCoverLimitConverted ?? null, formatType: "currency" },
    ];
    if (metrics.some((m) => m.stats !== null || m.yourValue !== null)) {
      sections.push({ title: "Life Insurance Plan Details", description: "Comparison of life cover parameters across the market", metrics, companyCount: lifeCat.companyCount });
    }
  }

  // INCOME_PROTECTION
  const ipCat = categories.find((c) => c.category === "INCOME_PROTECTION");
  if (ipCat) {
    const pos = companyPosition?.find((p) => p.category === "INCOME_PROTECTION");
    const is_ = ipCat.ipStats;
    const metrics: CategoryMetric[] = [
      { label: "Benefit %", stats: is_?.benefitPercentStats ?? null, yourValue: pos?.ipBenefitPercent ?? null, formatType: "percent" },
      { label: "Waiting Period (weeks)", stats: is_?.waitingPeriodStats ?? null, yourValue: pos?.ipWaitingPeriodWeeks ?? null, formatType: "integer" },
      { label: "Max Benefit Age", stats: is_?.maxBenefitAgeStats ?? null, yourValue: pos?.ipMaxBenefitAge ?? null, formatType: "integer" },
    ];
    if (metrics.some((m) => m.stats !== null || m.yourValue !== null)) {
      sections.push({ title: "Income Protection Plan Details", description: "Comparison of income protection parameters across the market", metrics, companyCount: ipCat.companyCount });
    }
  }

  // CRITICAL_ILLNESS
  const ciCat = categories.find((c) => c.category === "CRITICAL_ILLNESS");
  if (ciCat) {
    const pos = companyPosition?.find((p) => p.category === "CRITICAL_ILLNESS");
    const cs = ciCat.ciStats;
    const metrics: CategoryMetric[] = [
      { label: "Cover Multiple", stats: cs?.coverMultipleStats ?? null, yourValue: pos?.ciCoverMultiple ?? null, formatType: "multiple" },
      { label: "Fixed Cover Amount", stats: cs?.fixedCoverAmountStats ?? null, yourValue: pos?.ciFixedCoverAmountConverted ?? null, formatType: "currency" },
    ];
    if (metrics.some((m) => m.stats !== null || m.yourValue !== null)) {
      sections.push({ title: "Critical Illness Plan Details", description: "Comparison of critical illness cover across the market", metrics, companyCount: ciCat.companyCount });
    }
  }

  // DENTAL
  const dentalCat = categories.find((c) => c.category === "DENTAL");
  if (dentalCat) {
    const pos = companyPosition?.find((p) => p.category === "DENTAL");
    const ds = dentalCat.dentalStats;
    const metrics: CategoryMetric[] = [
      { label: "Annual Limit", stats: ds?.annualLimitStats ?? null, yourValue: pos?.dentalAnnualLimitConverted ?? null, formatType: "currency" },
    ];
    if (metrics.some((m) => m.stats !== null || m.yourValue !== null)) {
      sections.push({ title: "Dental Plan Details", description: "Comparison of dental plan parameters across the market", metrics, companyCount: dentalCat.companyCount });
    }
  }

  // PENSION
  const pensionCat = categories.find((c) => c.category === "PENSION");
  if (pensionCat) {
    const pos = companyPosition?.find((p) => p.category === "PENSION");
    const ps = pensionCat.pensionStats;
    const metrics: CategoryMetric[] = [
      { label: "Employer Contribution %", stats: ps?.employerPctStats ?? null, yourValue: pos?.pensionEmployerPct ?? null, formatType: "percent" },
      { label: "Employee Contribution %", stats: ps?.employeePctStats ?? null, yourValue: pos?.pensionEmployeePct ?? null, formatType: "percent" },
    ];
    if (metrics.some((m) => m.stats !== null || m.yourValue !== null)) {
      sections.push({ title: "Pension Plan Details", description: "Comparison of pension contributions across the market", metrics, companyCount: pensionCat.companyCount });
    }
  }

  if (sections.length === 0) return null;

  function fmt(value: number | null, formatType: CategoryMetric["formatType"]): string {
    if (value === null) return "--";
    switch (formatType) {
      case "currency": return formatCurrency(value, targetCurrency);
      case "percent": return `${value}%`;
      case "multiple": return `${value}x`;
      case "integer": return `${Math.round(value)}`;
    }
  }

  return (
    <>
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Your Value</TableHead>
                  <TableHead>P25</TableHead>
                  <TableHead>Median</TableHead>
                  <TableHead>P75</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.metrics.map((m) => (
                  <TableRow key={m.label}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell>
                      {m.yourValue !== null ? (
                        <span className="font-semibold text-[#00B4D8]">
                          {fmt(m.yourValue, m.formatType)}
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.stats ? fmt(m.stats.p25, m.formatType) : <span className="text-slate-400">--</span>}
                    </TableCell>
                    <TableCell>
                      {m.stats ? fmt(m.stats.median, m.formatType) : <span className="text-slate-400">--</span>}
                    </TableCell>
                    <TableCell>
                      {m.stats ? fmt(m.stats.p75, m.formatType) : <span className="text-slate-400">--</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {section.metrics.some((m) => m.stats !== null) && (
              <div className="mt-6 space-y-4">
                {section.metrics
                  .filter((m) => m.stats !== null)
                  .map((m) => (
                    <div key={m.label}>
                      <p className="mb-1 text-sm font-medium text-slate-700">{m.label}</p>
                      <PercentileBar
                        stats={m.stats!}
                        yourValue={m.yourValue}
                        currency={m.formatType === "currency" ? targetCurrency : m.formatType === "percent" ? "%" : m.formatType === "multiple" ? "x" : ""}
                      />
                    </div>
                  ))}
              </div>
            )}
            {!section.metrics.some((m) => m.stats !== null) && (
              <p className="mt-4 text-xs text-slate-400">
                Market comparison requires 5 or more companies in your segment. Currently {section.companyCount} companies.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
