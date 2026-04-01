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
import { PercentileRangeInline } from "./percentile-range-chart";
import { DonutChart, DonutLegend } from "./donut-chart";
import { StackedSalaryBandChart } from "./stacked-salary-band-chart";
import { ChartWrapper } from "./chart-wrapper";
import type { BenchmarkResult, CategoryBenchmark, CompanyPosition, PercentileStats, DistributionEntry } from "@/lib/benchmarking-types";
import {
  PLAN_TYPE_LABELS, DEATH_BENEFIT_TYPE_LABELS, PENSION_FORMULA_TYPE_LABELS,
  ROOM_CATEGORY_LABELS, NETWORK_TYPE_LABELS, COVERAGE_SCOPE_LABELS,
  HOSPITAL_LEVEL_LABELS, DEPENDENT_COVERAGE_TYPE_LABELS,
  MANDATORY_CLASSIFICATION_LABELS, TAX_TREATMENT_LABELS,
  RENEWAL_OUTCOME_LABELS, COVER_MULTIPLE_BASE_LABELS, EMPLOYEE_ELIGIBILITY_LABELS,
} from "@/lib/benchmarking-types";
import { BENEFIT_CATEGORY_LABELS, formatCurrency, getPercentileColor, getPercentileBgColor, cn } from "@/lib/utils";
import { BRAND } from "./chart-colors";

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

      {/* Percentile range bars for categories that meet minimum */}
      <ChartWrapper
        title="Percentile Positioning"
        description="Your cost position within the P25-P75 range per category"
        downloadFilename="percentile-positioning"
      >
        <div className="space-y-5 pt-2">
          {categories
            .filter((cat) => cat.meetsMinimum && cat.costStats)
            .map((cat) => {
              const pos = companyPosition?.find((p) => p.category === cat.category);
              const s = cat.costStats!;
              return (
                <div key={cat.category}>
                  <p className="mb-1 text-sm font-medium" style={{ color: BRAND.primary }}>
                    {BENEFIT_CATEGORY_LABELS[cat.category]}
                  </p>
                  <PercentileRangeInline
                    p25={s.p25}
                    median={s.median}
                    p75={s.p75}
                    min={s.min}
                    max={s.max}
                    yourValue={pos?.yourCostConverted}
                    formatValue={(v) => formatCurrency(v, targetCurrency)}
                  />
                </div>
              );
            })}
        </div>
      </ChartWrapper>

      {/* Category-specific Plan Details */}
      <CategoryDetailsCard
        categories={categories}
        companyPosition={companyPosition}
        targetCurrency={targetCurrency}
      />

      {/* Pension Breakdown Cards */}
      <PensionBreakdownCard data={data} />

      {/* New Plan Design / Generosity / Specialty sections per category */}
      {categories.map((cat) => {
        const pos = companyPosition?.find((p) => p.category === cat.category);
        const hasPlanDesign = cat.planDesignStats !== null;
        const hasGenerosity = cat.generosityIndex !== null;
        const hasMaternity = cat.maternitySpecificStats !== null;
        const hasDentalSpecific = cat.dentalSpecificStats !== null;
        const hasVision = cat.visionStats !== null;
        const hasBrokerCarrier = cat.brokerCarrierStats !== null;
        const hasRegulatory = cat.regulatoryStats !== null;
        const hasPolicyMetadata = cat.policyMetadataStats !== null;

        if (!hasPlanDesign && !hasGenerosity && !hasMaternity && !hasDentalSpecific && !hasVision && !hasBrokerCarrier && !hasRegulatory && !hasPolicyMetadata) {
          return null;
        }

        return (
          <div key={`extended-${cat.category}`} className="space-y-6">
            {hasPlanDesign && (
              <PlanDesignSection cat={cat} pos={pos} targetCurrency={targetCurrency} />
            )}
            {hasGenerosity && (
              <GenerositySection cat={cat} pos={pos} />
            )}
            {hasMaternity && (
              <MaternitySpecificSection cat={cat} pos={pos} targetCurrency={targetCurrency} />
            )}
            {hasDentalSpecific && (
              <DentalSpecificSection cat={cat} pos={pos} targetCurrency={targetCurrency} />
            )}
            {hasVision && (
              <VisionSection cat={cat} pos={pos} targetCurrency={targetCurrency} />
            )}
            {hasBrokerCarrier && (
              <BrokerCarrierSection cat={cat} pos={pos} targetCurrency={targetCurrency} />
            )}
            {hasRegulatory && (
              <RegulatorySection cat={cat} />
            )}
            {hasPolicyMetadata && (
              <PolicyMetadataSection cat={cat} />
            )}
          </div>
        );
      })}
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
  const sections: { title: string; description: string; metrics: CategoryMetric[]; companyCount: number; limitInfo?: { label: string; withLimit: number; fullCover: number }[] }[] = [];

  // HEALTH
  const healthCat = categories.find((c) => c.category === "HEALTH");
  if (healthCat) {
    const pos = companyPosition?.find((p) => p.category === "HEALTH");
    const hs = healthCat.healthStats;
    const metrics: CategoryMetric[] = [
      { label: "Excess (Deductible)", stats: hs?.excessStats ?? null, yourValue: pos?.healthExcessConverted ?? null, formatType: "currency" },
      { label: "Co-Pay %", stats: hs?.copayStats ?? null, yourValue: pos?.healthCopayPercent ?? null, formatType: "percent" },
    ];

    // Add dynamic limit type rows from new HealthLimit model
    const limitTypeStats = hs?.limitTypeStats ?? [];
    if (limitTypeStats.length > 0) {
      for (const lts of limitTypeStats) {
        const myLimitPos = pos?.healthLimitPositions?.find((p) => p.limitType === lts.limitType);
        metrics.push({
          label: `${lts.limitTypeLabel} Limit`,
          stats: lts.limitStats,
          yourValue: myLimitPos?.limitAmountConverted ?? null,
          formatType: "currency",
        });
      }
    } else {
      // Fallback to old flat fields if no limitTypeStats
      metrics.push(
        { label: "Inpatient Limit", stats: hs?.inpatientLimitStats ?? null, yourValue: pos?.healthInpatientLimitConverted ?? null, formatType: "currency" },
        { label: "Outpatient Limit", stats: hs?.outpatientLimitStats ?? null, yourValue: pos?.healthOutpatientLimitConverted ?? null, formatType: "currency" },
      );
    }

    if (metrics.some((m) => m.stats !== null || m.yourValue !== null)) {
      // Build extra info lines for limit types that have full cover counts
      const limitInfoLines: { label: string; withLimit: number; fullCover: number }[] = [];
      for (const lts of limitTypeStats) {
        if (lts.totalCompanies > 0) {
          limitInfoLines.push({
            label: lts.limitTypeLabel,
            withLimit: lts.companiesWithLimit,
            fullCover: lts.companiesFullCover,
          });
        }
      }

      sections.push({
        title: "Health Insurance Plan Details",
        description: "Comparison of health plan parameters across the market",
        metrics,
        companyCount: healthCat.companyCount,
        limitInfo: limitInfoLines.length > 0 ? limitInfoLines : undefined,
      });
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
      { label: "Employer Contribution %", stats: ps?.employerPctStats ?? null, yourValue: pos?.pensionContributionRateEmployer ?? pos?.pensionEmployerPct ?? null, formatType: "percent" },
      { label: "Employee Contribution %", stats: ps?.employeePctStats ?? null, yourValue: pos?.pensionContributionRateEmployee ?? pos?.pensionEmployeePct ?? null, formatType: "percent" },
      { label: "Total Contribution %", stats: ps?.totalContributionStats ?? null, yourValue: pos?.pensionTotalContributionRate ?? null, formatType: "percent" },
      { label: "Death Benefit Multiple", stats: ps?.deathBenefitMultipleStats ?? null, yourValue: pos?.pensionDeathBenefitMultiple ?? null, formatType: "multiple" },
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

            {section.limitInfo && section.limitInfo.length > 0 && (
              <div className="mt-4 rounded-md bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Cover Limits Breakdown</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {section.limitInfo.map((li) => (
                    <div key={li.label} className="text-sm text-slate-700">
                      <span className="font-medium">{li.label}:</span>{" "}
                      {li.withLimit > 0 && <span>{li.withLimit} with limit</span>}
                      {li.withLimit > 0 && li.fullCover > 0 && <span>, </span>}
                      {li.fullCover > 0 && <span className="text-emerald-600">{li.fullCover} full cover</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section.metrics.some((m) => m.stats !== null) && (
              <div className="mt-6 space-y-4">
                {section.metrics
                  .filter((m) => m.stats !== null)
                  .map((m) => {
                    const s = m.stats!;
                    const fmtFn =
                      m.formatType === "currency"
                        ? (v: number) => formatCurrency(v, targetCurrency)
                        : m.formatType === "percent"
                          ? (v: number) => `${v}%`
                          : m.formatType === "multiple"
                            ? (v: number) => `${v}x`
                            : (v: number) => `${Math.round(v)}`;
                    return (
                      <div key={m.label}>
                        <p className="mb-1 text-sm font-medium" style={{ color: BRAND.primary }}>{m.label}</p>
                        <PercentileRangeInline
                          p25={s.p25}
                          median={s.median}
                          p75={s.p75}
                          min={s.min}
                          max={s.max}
                          yourValue={m.yourValue}
                          formatValue={fmtFn}
                        />
                      </div>
                    );
                  })}
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

function PensionBreakdownCard({ data }: { data: BenchmarkResult }) {
  const pensionCat = data.categories.find((c) => c.category === "PENSION");
  if (!pensionCat || !pensionCat.meetsMinimum) return null;

  const ps = pensionCat.pensionStats;
  if (!ps) return null;

  const hasPlanTypes = ps.planTypeBreakdown.length > 0;
  const hasFormulaTypes = ps.formulaTypeBreakdown.length > 0;
  const hasDeathBenefitTypes = ps.deathBenefitTypeBreakdown.length > 0;
  const hasSalaryBandStats = (data.pensionSalaryBandStats ?? []).length > 0;

  if (!hasPlanTypes && !hasFormulaTypes && !hasDeathBenefitTypes && !hasSalaryBandStats && ps.employerOnlyPct === 0 && ps.employerPlusEmployeePct === 0) {
    return null;
  }

  // Donut data for plan types
  const planTypeDonut = ps.planTypeBreakdown.map((pt) => ({
    name: PLAN_TYPE_LABELS[pt.type] || pt.type,
    value: pt.percentage,
  }));

  // Donut data for contribution structure
  const contribStructDonut = [
    { name: "Employer Only", value: ps.employerOnlyPct },
    { name: "Employer + Employee", value: ps.employerPlusEmployeePct },
  ];

  // Donut data for formula types
  const formulaDonut = ps.formulaTypeBreakdown.map((ft) => ({
    name: PENSION_FORMULA_TYPE_LABELS[ft.type] || ft.type,
    value: ft.percentage,
  }));

  // Donut data for death benefit types
  const deathBenefitDonut = ps.deathBenefitTypeBreakdown.map((dt) => ({
    name: DEATH_BENEFIT_TYPE_LABELS[dt.type] || dt.type,
    value: dt.percentage,
  }));

  // Stacked salary band chart data
  const salaryBandChartData = (data.pensionSalaryBandStats ?? [])
    .filter((sb) => sb.contributionStats)
    .map((sb) => {
      // Use median employer/employee split from the contribution data
      // We approximate: if total contribution median exists, split based on overall ratio
      const totalMedian = sb.contributionStats?.median ?? 0;
      const overallEmployerPct = ps.employerPctStats?.median ?? totalMedian;
      const overallEmployeePct = ps.employeePctStats?.median ?? 0;
      const overallTotal = overallEmployerPct + overallEmployeePct || 1;
      return {
        band: sb.salaryBand,
        bandLabel: sb.salaryBandLabel,
        employerPct: Math.round((overallEmployerPct / overallTotal) * totalMedian * 10) / 10,
        employeePct: Math.round((overallEmployeePct / overallTotal) * totalMedian * 10) / 10,
        companyCount: sb.companyCount,
      };
    });

  return (
    <>
      {/* Pension Market Structure — Donut charts */}
      {(hasPlanTypes || ps.employerOnlyPct > 0 || ps.belowThresholdPct > 0) && (
        <ChartWrapper
          title="Pension Market Structure"
          description="Plan types, contribution structure, and threshold analysis"
          downloadFilename="pension-market-structure"
        >
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {hasPlanTypes && (
              <div className="text-center">
                <p className="mb-3 text-sm font-semibold" style={{ color: BRAND.primary }}>Plan Type Split</p>
                <DonutChart
                  data={planTypeDonut}
                  size={180}
                  colors={[BRAND.accent, BRAND.primary, BRAND.secondary, BRAND.highlight]}
                />
                <DonutLegend
                  data={planTypeDonut}
                  colors={[BRAND.accent, BRAND.primary, BRAND.secondary, BRAND.highlight]}
                />
              </div>
            )}
            <div className="text-center">
              <p className="mb-3 text-sm font-semibold" style={{ color: BRAND.primary }}>Contribution Structure</p>
              <DonutChart
                data={contribStructDonut}
                size={180}
                innerLabel="Below 3%"
                innerValue={`${ps.belowThresholdPct}%`}
                colors={[BRAND.accent, "#e2e8f0"]}
              />
              <DonutLegend
                data={contribStructDonut}
                colors={[BRAND.accent, "#e2e8f0"]}
              />
            </div>
            {hasFormulaTypes && (
              <div className="text-center">
                <p className="mb-3 text-sm font-semibold" style={{ color: BRAND.primary }}>Formula Type</p>
                <DonutChart
                  data={formulaDonut}
                  size={180}
                  colors={[BRAND.primary, BRAND.teal, BRAND.secondary, BRAND.amber]}
                />
                <DonutLegend
                  data={formulaDonut}
                  colors={[BRAND.primary, BRAND.teal, BRAND.secondary, BRAND.amber]}
                />
              </div>
            )}
          </div>

          {hasDeathBenefitTypes && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="mb-3 text-sm font-semibold" style={{ color: BRAND.primary }}>Death Benefit Type</p>
              <div className="mx-auto max-w-xs">
                <DonutChart
                  data={deathBenefitDonut}
                  size={180}
                  colors={[BRAND.primary, BRAND.accent, BRAND.secondary, BRAND.highlight]}
                />
                <DonutLegend
                  data={deathBenefitDonut}
                  colors={[BRAND.primary, BRAND.accent, BRAND.secondary, BRAND.highlight]}
                />
              </div>
            </div>
          )}
        </ChartWrapper>
      )}

      {/* Salary band analysis — stacked bar chart + data table */}
      {hasSalaryBandStats && (
        <ChartWrapper
          title="Pension Contributions by Salary Band"
          description="Median employer + employee contribution rates by salary band"
          downloadFilename="pension-salary-bands"
        >
          {salaryBandChartData.length > 0 && (
            <StackedSalaryBandChart data={salaryBandChartData} />
          )}

          {/* Data table below chart */}
          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salary Band</TableHead>
                  <TableHead className="text-center">Companies</TableHead>
                  <TableHead className="text-center">Contrib P25</TableHead>
                  <TableHead className="text-center">Contrib Median</TableHead>
                  <TableHead className="text-center">Contrib P75</TableHead>
                  <TableHead className="text-center">Death Benefit Median</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.pensionSalaryBandStats ?? []).map((sb) => (
                  <TableRow key={sb.salaryBand}>
                    <TableCell className="font-medium">{sb.salaryBandLabel}</TableCell>
                    <TableCell className="text-center">{sb.companyCount}</TableCell>
                    <TableCell className="text-center">
                      {sb.contributionStats ? `${sb.contributionStats.p25}%` : <span className="text-slate-400">--</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {sb.contributionStats ? `${sb.contributionStats.median}%` : <span className="text-slate-400">--</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {sb.contributionStats ? `${sb.contributionStats.p75}%` : <span className="text-slate-400">--</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {sb.deathBenefitStats ? `${sb.deathBenefitStats.median}x` : <span className="text-slate-400">--</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ChartWrapper>
      )}
    </>
  );
}

// ─── Reusable BreakdownList ───

function BreakdownList({
  entries,
  labels,
  title,
}: {
  entries: DistributionEntry[];
  labels: Record<string, string>;
  title: string;
}) {
  if (!entries || entries.length === 0) return null;
  const maxPct = Math.max(...entries.map((e) => e.percentage), 1);
  return (
    <div>
      <p className="mb-2 text-sm font-semibold" style={{ color: BRAND.primary }}>{title}</p>
      <div className="space-y-1.5">
        {entries.map((e) => (
          <div key={e.type} className="flex items-center gap-2 text-sm">
            <span className="w-32 shrink-0 truncate text-slate-700">{labels[e.type] || e.type}</span>
            <div className="flex-1 h-4 rounded bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded"
                style={{
                  width: `${(e.percentage / maxPct) * 100}%`,
                  backgroundColor: BRAND.accent,
                  minWidth: e.percentage > 0 ? "4px" : "0",
                }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs text-slate-500">
              {e.percentage}% ({e.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat row helper ───

function StatRow({
  label,
  stats,
  yourValue,
  formatFn,
}: {
  label: string;
  stats: PercentileStats | null;
  yourValue?: number | null;
  formatFn: (v: number) => string;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell>
        {yourValue != null ? (
          <span className="font-semibold text-[#00B4D8]">{formatFn(yourValue)}</span>
        ) : (
          <span className="text-slate-400">--</span>
        )}
      </TableCell>
      <TableCell>{stats ? formatFn(stats.p25) : <span className="text-slate-400">--</span>}</TableCell>
      <TableCell>{stats ? formatFn(stats.median) : <span className="text-slate-400">--</span>}</TableCell>
      <TableCell>{stats ? formatFn(stats.p75) : <span className="text-slate-400">--</span>}</TableCell>
    </TableRow>
  );
}

// ─── Plan Design Section ───

function PlanDesignSection({
  cat,
  pos,
  targetCurrency,
}: {
  cat: CategoryBenchmark;
  pos: CompanyPosition | undefined;
  targetCurrency: string;
}) {
  const pd = cat.planDesignStats!;
  const catLabel = BENEFIT_CATEGORY_LABELS[cat.category] || cat.category;
  const fmtCur = (v: number) => formatCurrency(v, targetCurrency);
  const fmtPct = (v: number) => `${v}%`;
  const fmtX = (v: number) => `${v}x`;
  const fmtInt = (v: number) => `${Math.round(v)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{catLabel} &mdash; Plan Design Details</CardTitle>
        <CardDescription>
          Plan design benchmarks based on {pd.detailedCompanyCount} companies with detailed data (out of {cat.companyCount} total)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <StatRow label="Deductible" stats={pd.deductibleStats} yourValue={pos?.deductibleAmount} formatFn={fmtCur} />
            <StatRow label="Co-Pay %" stats={pd.coPayPercentStats} yourValue={pos?.coPayPercent} formatFn={fmtPct} />
            <StatRow label="Sum Insured" stats={pd.sumInsuredStats} yourValue={pos?.sumInsured} formatFn={fmtCur} />
            <StatRow label="Cover Multiple" stats={pd.coverMultipleStats} yourValue={pos?.coverMultiple} formatFn={fmtX} />
            <StatRow label="Reimbursement %" stats={pd.reimbursementPercentStats} yourValue={pos?.reimbursementPercent} formatFn={fmtPct} />
            <StatRow label="Benefit Max (Annual)" stats={pd.benefitMaxAnnualStats} yourValue={pos?.benefitMaxAnnual} formatFn={fmtCur} />
            {pd.waitingPeriodDaysStats && (
              <StatRow label="Waiting Period (days)" stats={pd.waitingPeriodDaysStats} yourValue={pos?.waitingPeriodDays} formatFn={fmtInt} />
            )}
            {pd.benefitDurationDaysStats && (
              <StatRow label="Benefit Duration (days)" stats={pd.benefitDurationDaysStats} yourValue={pos?.benefitDurationDays} formatFn={fmtInt} />
            )}
            {pd.eliminationPeriodDaysStats && (
              <StatRow label="Elimination Period (days)" stats={pd.eliminationPeriodDaysStats} yourValue={pos?.eliminationPeriodDays} formatFn={fmtInt} />
            )}
            {pd.insuredLivesStats && (
              <StatRow label="Insured Lives" stats={pd.insuredLivesStats} yourValue={pos?.insuredLives} formatFn={fmtInt} />
            )}
          </TableBody>
        </Table>

        {/* Percentile bars for numeric stats */}
        <div className="space-y-4">
          {[
            { label: "Deductible", stats: pd.deductibleStats, yourValue: pos?.deductibleAmount, fn: fmtCur },
            { label: "Co-Pay %", stats: pd.coPayPercentStats, yourValue: pos?.coPayPercent, fn: fmtPct },
            { label: "Sum Insured", stats: pd.sumInsuredStats, yourValue: pos?.sumInsured, fn: fmtCur },
            { label: "Cover Multiple", stats: pd.coverMultipleStats, yourValue: pos?.coverMultiple, fn: fmtX },
            { label: "Reimbursement %", stats: pd.reimbursementPercentStats, yourValue: pos?.reimbursementPercent, fn: fmtPct },
            { label: "Benefit Max (Annual)", stats: pd.benefitMaxAnnualStats, yourValue: pos?.benefitMaxAnnual, fn: fmtCur },
          ]
            .filter((m) => m.stats !== null)
            .map((m) => (
              <div key={m.label}>
                <p className="mb-1 text-sm font-medium" style={{ color: BRAND.primary }}>{m.label}</p>
                <PercentileRangeInline
                  p25={m.stats!.p25}
                  median={m.stats!.median}
                  p75={m.stats!.p75}
                  min={m.stats!.min}
                  max={m.stats!.max}
                  yourValue={m.yourValue}
                  formatValue={m.fn}
                />
              </div>
            ))}
        </div>

        {/* Categorical breakdowns */}
        <div className="grid gap-6 sm:grid-cols-2">
          <BreakdownList entries={pd.roomCategoryBreakdown} labels={ROOM_CATEGORY_LABELS} title="Room Category" />
          <BreakdownList entries={pd.networkTypeBreakdown} labels={NETWORK_TYPE_LABELS} title="Network Type" />
          <BreakdownList entries={pd.coverageScopeBreakdown} labels={COVERAGE_SCOPE_LABELS} title="Coverage Scope" />
          <BreakdownList entries={pd.dependentCoverageTypeBreakdown} labels={DEPENDENT_COVERAGE_TYPE_LABELS} title="Dependent Coverage" />
          <BreakdownList entries={pd.hospitalLevelBreakdown} labels={HOSPITAL_LEVEL_LABELS} title="Hospital Level" />
          <BreakdownList entries={pd.coverMultipleBaseBreakdown} labels={COVER_MULTIPLE_BASE_LABELS} title="Cover Multiple Base" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Generosity Index Section ───

function GenerositySection({
  cat,
  pos,
}: {
  cat: CategoryBenchmark;
  pos: CompanyPosition | undefined;
}) {
  const gi = cat.generosityIndex!;
  const catLabel = BENEFIT_CATEGORY_LABELS[cat.category] || cat.category;
  const yourScore = pos?.generosityScore ?? null;
  const fmtScore = (v: number) => `${Math.round(v)}/100`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{catLabel} &mdash; Generosity Index</CardTitle>
        <CardDescription>
          A composite score (0-100) reflecting overall plan generosity relative to peers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {yourScore !== null && (
          <p className="text-lg font-semibold" style={{ color: BRAND.accent }}>
            Your Score: {Math.round(yourScore)}/100
          </p>
        )}

        {gi.stats && (
          <div>
            <p className="mb-1 text-sm font-medium" style={{ color: BRAND.primary }}>Generosity Score Distribution</p>
            <PercentileRangeInline
              p25={gi.stats.p25}
              median={gi.stats.median}
              p75={gi.stats.p75}
              min={gi.stats.min}
              max={gi.stats.max}
              yourValue={yourScore}
              formatValue={fmtScore}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Maternity Specific Section ───

function MaternitySpecificSection({
  cat,
  pos,
  targetCurrency,
}: {
  cat: CategoryBenchmark;
  pos: CompanyPosition | undefined;
  targetCurrency: string;
}) {
  const ms = cat.maternitySpecificStats!;
  const catLabel = BENEFIT_CATEGORY_LABELS[cat.category] || cat.category;
  const fmtCur = (v: number) => formatCurrency(v, targetCurrency);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{catLabel} &mdash; Maternity Cover</CardTitle>
        <CardDescription>Delivery cover benchmarks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <StatRow label="Normal Delivery Cover" stats={ms.normalDeliveryStats} yourValue={pos?.maternityNormalDelivery} formatFn={fmtCur} />
            <StatRow label="C-Section Cover" stats={ms.cSectionStats} yourValue={pos?.maternityCSection} formatFn={fmtCur} />
          </TableBody>
        </Table>

        {[
          { label: "Normal Delivery Cover", stats: ms.normalDeliveryStats, yourValue: pos?.maternityNormalDelivery },
          { label: "C-Section Cover", stats: ms.cSectionStats, yourValue: pos?.maternityCSection },
        ]
          .filter((m) => m.stats !== null)
          .map((m) => (
            <div key={m.label}>
              <p className="mb-1 text-sm font-medium" style={{ color: BRAND.primary }}>{m.label}</p>
              <PercentileRangeInline
                p25={m.stats!.p25}
                median={m.stats!.median}
                p75={m.stats!.p75}
                min={m.stats!.min}
                max={m.stats!.max}
                yourValue={m.yourValue}
                formatValue={fmtCur}
              />
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

// ─── Enhanced Dental Section ───

function DentalSpecificSection({
  cat,
  pos,
  targetCurrency,
}: {
  cat: CategoryBenchmark;
  pos: CompanyPosition | undefined;
  targetCurrency: string;
}) {
  const ds = cat.dentalSpecificStats!;
  const catLabel = BENEFIT_CATEGORY_LABELS[cat.category] || cat.category;
  const fmtCur = (v: number) => formatCurrency(v, targetCurrency);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{catLabel} &mdash; Enhanced Dental</CardTitle>
        <CardDescription>Dental-specific cover benchmarks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <StatRow label="Annual Max" stats={ds.dentalAnnualMaxStats} yourValue={pos?.dentalAnnualMax} formatFn={fmtCur} />
          </TableBody>
        </Table>

        {ds.dentalAnnualMaxStats && (
          <div>
            <p className="mb-1 text-sm font-medium" style={{ color: BRAND.primary }}>Annual Max</p>
            <PercentileRangeInline
              p25={ds.dentalAnnualMaxStats.p25}
              median={ds.dentalAnnualMaxStats.median}
              p75={ds.dentalAnnualMaxStats.p75}
              min={ds.dentalAnnualMaxStats.min}
              max={ds.dentalAnnualMaxStats.max}
              yourValue={pos?.dentalAnnualMax}
              formatValue={fmtCur}
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preventive Coverage</p>
            <p className="mt-1 text-lg font-bold" style={{ color: BRAND.primary }}>{ds.pctPreventiveCoverage}%</p>
            <p className="text-xs text-slate-500">of plans include preventive</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Major Coverage</p>
            <p className="mt-1 text-lg font-bold" style={{ color: BRAND.primary }}>{ds.pctMajorCoverage}%</p>
            <p className="text-xs text-slate-500">of plans include major procedures</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Vision Section ───

function VisionSection({
  cat,
  pos,
  targetCurrency,
}: {
  cat: CategoryBenchmark;
  pos: CompanyPosition | undefined;
  targetCurrency: string;
}) {
  const vs = cat.visionStats!;
  const catLabel = BENEFIT_CATEGORY_LABELS[cat.category] || cat.category;
  const fmtCur = (v: number) => formatCurrency(v, targetCurrency);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{catLabel} &mdash; Vision</CardTitle>
        <CardDescription>Vision benefit benchmarks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <StatRow label="Annual Max" stats={vs.annualMaxStats} yourValue={pos?.visionAnnualMax} formatFn={fmtCur} />
          </TableBody>
        </Table>

        {vs.annualMaxStats && (
          <div>
            <p className="mb-1 text-sm font-medium" style={{ color: BRAND.primary }}>Annual Max</p>
            <PercentileRangeInline
              p25={vs.annualMaxStats.p25}
              median={vs.annualMaxStats.median}
              p75={vs.annualMaxStats.p75}
              min={vs.annualMaxStats.min}
              max={vs.annualMaxStats.max}
              yourValue={pos?.visionAnnualMax}
              formatValue={fmtCur}
            />
          </div>
        )}

        <div className="rounded-md bg-slate-50 p-3 max-w-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Exam Covered</p>
          <p className="mt-1 text-lg font-bold" style={{ color: BRAND.primary }}>{vs.pctExamCovered}%</p>
          <p className="text-xs text-slate-500">of plans cover eye exams</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Broker & Carrier Section ───

function BrokerCarrierSection({
  cat,
  pos,
  targetCurrency,
}: {
  cat: CategoryBenchmark;
  pos: CompanyPosition | undefined;
  targetCurrency: string;
}) {
  const bc = cat.brokerCarrierStats!;
  const catLabel = BENEFIT_CATEGORY_LABELS[cat.category] || cat.category;
  const fmtPct = (v: number) => `${v}%`;
  const fmtCur = (v: number) => formatCurrency(v, targetCurrency);
  const fmtInt = (v: number) => `${Math.round(v)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{catLabel} &mdash; Broker &amp; Carrier</CardTitle>
        <CardDescription>Broker, carrier and pooling benchmarks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <StatRow label="Commission Rate %" stats={bc.brokerCommissionStats} yourValue={pos?.brokerCommissionPercent} formatFn={fmtPct} />
            <StatRow label="Broker Fee" stats={bc.brokerFeeStats} yourValue={pos?.brokerFee} formatFn={fmtCur} />
            <StatRow label="Termination Notice (days)" stats={bc.terminationNoticeDaysStats} yourValue={pos?.carrierTerminationNoticeDays} formatFn={fmtInt} />
          </TableBody>
        </Table>

        <div className="rounded-md bg-slate-50 p-3 max-w-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Multinational Pooling</p>
          <p className="mt-1 text-lg font-bold" style={{ color: BRAND.primary }}>{bc.pctInMultinationalPool}%</p>
          <p className="text-xs text-slate-500">of companies participate in pooling</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {bc.poolProviderBreakdown.length > 0 && (
            <BreakdownList
              entries={bc.poolProviderBreakdown}
              labels={{}}
              title="Pool Provider"
            />
          )}
          {bc.carrierBreakdown.length > 0 && (
            <BreakdownList
              entries={bc.carrierBreakdown}
              labels={{}}
              title="Carrier"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Regulatory Section ───

function RegulatorySection({ cat }: { cat: CategoryBenchmark }) {
  const rs = cat.regulatoryStats!;
  const catLabel = BENEFIT_CATEGORY_LABELS[cat.category] || cat.category;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{catLabel} &mdash; Regulatory</CardTitle>
        <CardDescription>Mandatory/supplemental classification and tax treatment</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          <BreakdownList entries={rs.mandatoryClassificationBreakdown} labels={MANDATORY_CLASSIFICATION_LABELS} title="Mandatory vs Supplemental" />
          <BreakdownList entries={rs.taxTreatmentBreakdown} labels={TAX_TREATMENT_LABELS} title="Tax Treatment" />
          <BreakdownList entries={rs.employeeEligibilityBreakdown} labels={EMPLOYEE_ELIGIBILITY_LABELS} title="Employee Eligibility" />
        </div>
        {rs.pctRiders > 0 && (
          <p className="mt-4 text-sm text-slate-600">
            <span className="font-semibold">{rs.pctRiders}%</span> of plans in this category are riders / bundled benefits.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Policy Metadata Section ───

function PolicyMetadataSection({ cat }: { cat: CategoryBenchmark }) {
  const pm = cat.policyMetadataStats!;
  const catLabel = BENEFIT_CATEGORY_LABELS[cat.category] || cat.category;
  const fmtInt = (v: number) => `${Math.round(v)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{catLabel} &mdash; Policy Metadata</CardTitle>
        <CardDescription>Contract length and renewal outcomes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {pm.contractLengthStats && (
          <>
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
                <StatRow label="Contract Length (months)" stats={pm.contractLengthStats} formatFn={fmtInt} />
              </TableBody>
            </Table>

            <div>
              <p className="mb-1 text-sm font-medium" style={{ color: BRAND.primary }}>Contract Length (months)</p>
              <PercentileRangeInline
                p25={pm.contractLengthStats.p25}
                median={pm.contractLengthStats.median}
                p75={pm.contractLengthStats.p75}
                min={pm.contractLengthStats.min}
                max={pm.contractLengthStats.max}
                formatValue={fmtInt}
              />
            </div>
          </>
        )}

        <BreakdownList entries={pm.lastRenewalOutcomeBreakdown} labels={RENEWAL_OUTCOME_LABELS} title="Last Renewal Outcome" />
      </CardContent>
    </Card>
  );
}
