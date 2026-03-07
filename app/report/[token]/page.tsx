"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import type { ReportData } from "@/lib/pdf/report-types";
import type { BenchmarkResult } from "@/lib/benchmarking-types";
import {
  BENEFIT_CATEGORY_LABELS, COUNTRY_LABELS, NACE_INDUSTRIES,
  PLATFORM_TYPE_LABELS, FEE_MODEL_LABELS, formatCurrency,
} from "@/lib/utils";
import { PLAN_TYPE_LABELS } from "@/lib/benchmarking-types";

// Brand colors
const B = {
  purple: "#8F4CFF",
  navy: "#1B2A4A",
  cyan: "#00B4D8",
  highlight: "#ABFF40",
  white: "#ffffff",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate500: "#64748b",
  slate700: "#334155",
  slate900: "#0f172a",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
};

const DONUT_COLORS = [B.cyan, B.navy, B.purple, B.highlight, "#48CAE4", B.amber, B.green, B.red];

const FLAGS: Record<string, string> = {
  IE: "\u{1F1EE}\u{1F1EA}", GB: "\u{1F1EC}\u{1F1E7}", FR: "\u{1F1EB}\u{1F1F7}",
  ES: "\u{1F1EA}\u{1F1F8}", PT: "\u{1F1F5}\u{1F1F9}", US: "\u{1F1FA}\u{1F1F8}",
  DE: "\u{1F1E9}\u{1F1EA}", NL: "\u{1F1F3}\u{1F1F1}", AE: "\u{1F1E6}\u{1F1EA}",
  SG: "\u{1F1F8}\u{1F1EC}", AU: "\u{1F1E6}\u{1F1FA}",
};

export default function ReportRenderPage() {
  const params = useParams();
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/report/data?token=${params.token}`);
        if (!res.ok) { setError("Token invalid or expired"); return; }
        setData(await res.json());
      } catch { setError("Failed to load report data"); }
    }
    load();
  }, [params.token]);

  useEffect(() => {
    if (data) {
      // Signal to Puppeteer that rendering is complete
      const timer = setTimeout(() => {
        (window as unknown as Record<string, unknown>).__REPORT_READY__ = true;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (error) return <div style={{ padding: 40, color: "red" }}>{error}</div>;
  if (!data) return <div style={{ padding: 40, color: "#999" }}>Loading report data...</div>;

  return (
    <div id="report-root" style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", color: B.slate900, background: B.white }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <CoverPage data={data} />
      <ExecutiveSummaryPage data={data} />
      {data.config.reportType === "global" && <GlobalSummaryPage data={data} />}
      <PrevalencePage data={data} />
      <DetailedBenchmarkPages data={data} />
      <AllCompaniesPage data={data} />
      {data.config.includeCostAnalysis && <CostAnalysisPage data={data} />}
      <PensionBenchmarkPage data={data} />
      {data.config.includePlatformBenchmarks && <PlatformPage data={data} />}
      {data.config.reportType === "global" && data.config.countries.map((c) => {
        const d = data.allCountryData[c];
        if (!d) return null;
        return <CountrySection key={c} countryCode={c} benchmarkData={d} currency={data.config.currency} companyName={data.config.companyName} />;
      })}
      {data.config.reportType === "global" && data.recommendations.length > 0 && <RecommendationsPage data={data} />}
      <DataSourcesPage data={data} />
      <MethodologyPage data={data} />
    </div>
  );
}

// ── Layout helpers ──

function PageBreak() {
  return <div style={{ pageBreakAfter: "always" }} />;
}

function PageHeader({ title }: { title: string }) {
  return (
    <div style={{ borderBottom: `3px solid ${B.purple}`, paddingBottom: 8, marginBottom: 20 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: B.navy, margin: 0 }}>{title}</h2>
    </div>
  );
}

function PageFooter({ companyName, label }: { companyName: string; label?: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      borderTop: `1px solid ${B.slate200}`, paddingTop: 8, marginTop: 30,
      fontSize: 9, color: B.slate500,
    }}>
      <span>{companyName} | {label || "Eppione Benchmarking Report"}</span>
      <span style={{ color: B.purple, fontWeight: 600 }}>eppione</span>
    </div>
  );
}

function PageWrapper({ children, companyName, label }: { children: React.ReactNode; companyName: string; label?: string }) {
  return (
    <div style={{ padding: "40px 50px", minHeight: "100vh", position: "relative", display: "flex", flexDirection: "column" }}>
      {/* Purple header bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: B.purple }} />
      <div style={{ flex: 1 }}>{children}</div>
      <PageFooter companyName={companyName} label={label} />
    </div>
  );
}

function StatBox({ label, value, subtitle, color }: { label: string; value: string; subtitle?: string; color?: string }) {
  return (
    <div style={{
      flex: 1, background: B.slate50, borderRadius: 8, padding: "16px 20px",
      borderLeft: `4px solid ${color || B.purple}`,
    }}>
      <div style={{ fontSize: 10, color: B.slate500, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: B.navy, marginTop: 4, lineHeight: 1.1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: B.slate500, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

function StatRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>{children}</div>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 16 }}>
      <thead>
        <tr style={{ background: B.navy }}>
          {headers.map((h, i) => (
            <th key={i} style={{ color: B.white, padding: "6px 10px", textAlign: i === 0 ? "left" : "center", fontWeight: 600, fontSize: 9 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ background: ri % 2 === 0 ? B.white : B.slate50, borderBottom: `1px solid ${B.slate200}` }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: "5px 10px", textAlign: ci === 0 ? "left" : "center" }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Pages ──

function CoverPage({ data }: { data: ReportData }) {
  const { config, generatedAt } = data;
  const isGlobal = config.reportType === "global";
  const countryDisplay = isGlobal
    ? "Multi-Country Report"
    : `${FLAGS[config.country] || ""} ${COUNTRY_LABELS[config.country] || config.country}`;
  const dateStr = new Date(generatedAt).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        background: `linear-gradient(135deg, ${B.navy} 0%, #2a1a4e 100%)`, padding: 60,
      }}>
        <div style={{ color: B.cyan, fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em" }}>eppione</div>
        <div style={{ color: B.slate500, fontSize: 13, letterSpacing: "0.3em", marginTop: 4, textTransform: "uppercase" }}>BENCHMARKING</div>
        <div style={{ width: 80, height: 3, background: B.purple, margin: "40px 0" }} />
        <div style={{ color: B.white, fontSize: 30, fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>
          Employee Benefits<br />Benchmarking Report
        </div>
        <div style={{ color: "#48CAE4", fontSize: 16, marginTop: 12 }}>{countryDisplay}</div>
        {isGlobal && (
          <div style={{ color: B.slate500, fontSize: 12, marginTop: 8 }}>
            {config.countries.map((c) => `${FLAGS[c] || ""} ${COUNTRY_LABELS[c] || c}`).join("  |  ")}
          </div>
        )}
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <div style={{ color: B.slate200, fontSize: 13 }}>{config.companyName}</div>
          <div style={{ color: B.slate500, fontSize: 12, marginTop: 4 }}>
            {NACE_INDUSTRIES[config.companyIndustry] || config.companyIndustry}
          </div>
          <div style={{ color: B.slate500, fontSize: 12, marginTop: 4 }}>{dateStr}</div>
        </div>
        <div style={{ position: "absolute", bottom: 40, color: B.slate500, fontSize: 10, letterSpacing: "0.3em" }}>CONFIDENTIAL</div>
      </div>
      <PageBreak />
    </>
  );
}

function ExecutiveSummaryPage({ data }: { data: ReportData }) {
  const { config, singleCountryData: bm, findings } = data;
  const currency = config.currency;
  const totalYourCost = bm?.companyPosition ? bm.companyPosition.reduce((s, p) => s + (p.yourCostConverted || 0), 0) : null;
  const totalMedian = bm ? bm.categories.reduce((s, c) => s + (c.costStats?.median || 0), 0) : 0;
  const yourBenefitCount = bm?.companyPosition ? bm.companyPosition.filter((p) => p.yourCost !== null && p.yourCost > 0).length : null;
  const avgBenefits = bm && bm.totalCompanies > 0
    ? Math.round(bm.categories.reduce((s, c) => s + c.companyCount, 0) / bm.totalCompanies) : 0;
  const diffPct = totalMedian > 0 && totalYourCost !== null ? Math.round(((totalYourCost - totalMedian) / totalMedian) * 100) : null;

  return (
    <>
      <PageWrapper companyName={config.companyName} label="Executive Summary">
        <PageHeader title="Executive Summary" />
        <StatRow>
          <StatBox label="Your Total Cost / Employee" value={totalYourCost !== null ? formatCurrency(totalYourCost, currency) : "N/A"} subtitle={totalMedian > 0 ? `Market median: ${formatCurrency(totalMedian, currency)}` : undefined} color={B.cyan} />
          <StatBox label="Benefits Offered" value={yourBenefitCount !== null ? `${yourBenefitCount}` : "N/A"} subtitle={`Market average: ${avgBenefits}`} color={B.purple} />
          <StatBox label="vs Market" value={diffPct !== null ? `${diffPct > 0 ? "+" : ""}${diffPct}%` : "N/A"} subtitle={diffPct !== null ? (diffPct > 0 ? "Above median" : diffPct < 0 ? "Below median" : "At median") : undefined} color={diffPct !== null && diffPct > 0 ? B.green : B.amber} />
          <StatBox label="Companies" value={`${bm?.totalCompanies || 0}`} subtitle={COUNTRY_LABELS[config.country] || config.country} color={B.navy} />
        </StatRow>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: B.navy, marginBottom: 12, borderBottom: `2px solid ${B.purple}`, paddingBottom: 4 }}>Key Findings</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {findings.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 10 }}>
              <span style={{ color: B.purple, fontWeight: 700, fontSize: 13, minWidth: 20 }}>{i + 1}.</span>
              <span style={{ fontSize: 11, color: B.slate700, lineHeight: 1.5 }}>{f}</span>
            </div>
          ))}
        </div>
      </PageWrapper>
      <PageBreak />
    </>
  );
}

function PrevalencePage({ data }: { data: ReportData }) {
  const bm = data.singleCountryData;
  if (!bm) return null;

  const sorted = [...bm.categories].sort((a, b) => b.prevalence - a.prevalence);
  const radarData = sorted.map((cat) => {
    const pos = bm.companyPosition?.find((p) => p.category === cat.category);
    return {
      category: BENEFIT_CATEGORY_LABELS[cat.category]?.split("/")[0]?.trim() || cat.category,
      marketPct: cat.prevalence,
      you: pos?.yourCost !== null && pos?.yourCost !== undefined ? 100 : 0,
    };
  });

  return (
    <>
      <PageWrapper companyName={data.config.companyName} label="Benefit Prevalence">
        <PageHeader title="Benefit Prevalence" />
        <div style={{ height: 400, marginBottom: 20 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke={B.slate200} />
              <PolarAngleAxis dataKey="category" fontSize={11} tick={{ fill: B.navy }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} stroke={B.slate500} />
              <Radar name="Market %" dataKey="marketPct" stroke={B.navy} fill={B.navy} fillOpacity={0.15} />
              <Radar name="You" dataKey="you" stroke={B.cyan} fill={B.cyan} fillOpacity={0.3} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <DataTable
          headers={["Category", "Companies", "Prevalence", "You Offer?", "Employer %"]}
          rows={sorted.map((cat) => {
            const pos = bm.companyPosition?.find((p) => p.category === cat.category);
            const youOffer = pos?.yourCost != null && pos.yourCost > 0;
            return [
              BENEFIT_CATEGORY_LABELS[cat.category] || cat.category,
              `${cat.companyCount} / ${cat.totalCompanies}`,
              `${Math.round(cat.prevalence)}%`,
              <span key="offer" style={{ color: youOffer ? B.green : B.red, fontWeight: 600 }}>{youOffer ? "Yes" : "No"}</span>,
              `${Math.round(cat.pctEmployerFunded)}%`,
            ];
          })}
        />
      </PageWrapper>
      <PageBreak />
    </>
  );
}

function DetailedBenchmarkPages({ data }: { data: ReportData }) {
  const bm = data.singleCountryData;
  if (!bm) return null;

  const currency = data.config.currency;
  const meetsCats = bm.categories.filter((c) => c.meetsMinimum);

  return (
    <>
      <PageWrapper companyName={data.config.companyName} label="Detailed Benchmarks">
        <PageHeader title="Detailed Benchmarks" />
        <p style={{ fontSize: 10, color: B.slate500, marginBottom: 16 }}>Per-category cost comparison with market percentiles</p>

        {/* Cost bar chart */}
        {meetsCats.length > 0 && (
          <div style={{ height: 350, marginBottom: 24 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meetsCats.map((cat) => {
                const pos = bm.companyPosition?.find((p) => p.category === cat.category);
                return {
                  name: BENEFIT_CATEGORY_LABELS[cat.category]?.split(" ")[0] || cat.category,
                  yourCost: pos?.yourCostConverted || 0,
                  median: cat.costStats?.median || 0,
                  p75: cat.costStats?.p75 || 0,
                };
              })} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke={B.slate200} />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: B.navy }} />
                <YAxis fontSize={11} tickFormatter={(v) => formatCurrency(v, currency)} stroke={B.slate500} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="yourCost" name="Your Cost" fill={B.highlight} stroke={B.navy} strokeWidth={1} radius={[4, 4, 0, 0]} />
                <Bar dataKey="median" name="Median" fill={B.cyan} radius={[4, 4, 0, 0]} />
                <Bar dataKey="p75" name="P75" fill={B.navy} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <DataTable
          headers={["Category", "Your Cost", "P25", "Median", "P75", "Rank"]}
          rows={meetsCats.map((cat) => {
            const pos = bm.companyPosition?.find((p) => p.category === cat.category);
            return [
              BENEFIT_CATEGORY_LABELS[cat.category] || cat.category,
              <span key="yc" style={{ color: B.cyan, fontWeight: 700 }}>{pos?.yourCostConverted ? formatCurrency(pos.yourCostConverted, currency) : "—"}</span>,
              cat.costStats ? formatCurrency(cat.costStats.p25, currency) : "—",
              cat.costStats ? formatCurrency(cat.costStats.median, currency) : "—",
              cat.costStats ? formatCurrency(cat.costStats.p75, currency) : "—",
              pos?.percentileRank != null ? `${Math.round(pos.percentileRank)}th` : "N/A",
            ];
          })}
        />
      </PageWrapper>
      <PageBreak />
    </>
  );
}

function AllCompaniesPage({ data }: { data: ReportData }) {
  const bm = data.singleCountryData;
  const ci = data.crossIndustryData;
  if (!bm || !ci) return null;

  const currency = data.config.currency;

  // Build a unified list of categories present in either dataset
  const allCategories = new Map<string, { industry: typeof bm.categories[0] | null; allCo: typeof ci.categories[0] | null }>();
  for (const cat of bm.categories) {
    allCategories.set(cat.category, { industry: cat, allCo: null });
  }
  for (const cat of ci.categories) {
    const existing = allCategories.get(cat.category);
    if (existing) {
      existing.allCo = cat;
    } else {
      allCategories.set(cat.category, { industry: null, allCo: cat });
    }
  }

  const rows: (string | React.ReactNode)[][] = [];
  for (const [category, { industry, allCo }] of Array.from(allCategories.entries())) {
    const pos = bm.companyPosition?.find((p) => p.category === category);
    const yourCost = pos?.yourCostConverted ?? null;
    const industryMedian = industry?.costStats?.median ?? null;
    const allCoMedian = allCo?.costStats?.median ?? null;
    const industryPrev = industry ? `${Math.round(industry.prevalence)}%` : "—";
    const allCoPrev = allCo ? `${Math.round(allCo.prevalence)}%` : "—";

    const costCell = (cost: number | null, median: number | null) => {
      if (cost === null || cost === 0) return <span style={{ color: B.slate500 }}>{"—"}</span>;
      if (median === null || median === 0) return <span style={{ color: B.cyan, fontWeight: 600 }}>{formatCurrency(cost, currency)}</span>;
      const diff = cost - median;
      const color = diff > 0 ? B.red : diff < 0 ? B.green : B.slate700;
      return <span style={{ color, fontWeight: 600 }}>{formatCurrency(cost, currency)}</span>;
    };

    rows.push([
      BENEFIT_CATEGORY_LABELS[category] || category,
      industryPrev,
      allCoPrev,
      industryMedian !== null ? formatCurrency(industryMedian, currency) : "—",
      allCoMedian !== null ? formatCurrency(allCoMedian, currency) : "—",
      costCell(yourCost, industryMedian),
    ]);
  }

  return (
    <>
      <PageWrapper companyName={data.config.companyName} label="All Companies Comparison">
        <PageHeader title="All Companies Comparison" />
        <p style={{ fontSize: 10, color: B.slate500, marginBottom: 6 }}>
          Comparison of your benefits against your industry peers and all companies in {COUNTRY_LABELS[data.config.country] || data.config.country}.
        </p>
        <p style={{ fontSize: 9, color: B.slate500, marginBottom: 16 }}>
          Industry: {NACE_INDUSTRIES[data.config.companyIndustry] || data.config.companyIndustry} ({bm.totalCompanies} companies) | All Companies: {ci.totalCompanies} companies
        </p>

        <DataTable
          headers={["Category", "Industry Prevalence", "All Companies Prevalence", "Industry Median Cost", "All Companies Median Cost", "Your Cost"]}
          rows={rows}
        />

        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 9, color: B.slate500 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: B.green }} />
            Below median
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: B.red }} />
            Above median
          </div>
        </div>
      </PageWrapper>
      <PageBreak />
    </>
  );
}

function CostAnalysisPage({ data }: { data: ReportData }) {
  const bm = data.singleCountryData;
  if (!bm) return null;

  const currency = data.config.currency;
  const totalYourCost = bm.companyPosition ? bm.companyPosition.reduce((s, p) => s + (p.yourCostConverted || 0), 0) : 0;
  const totalMedian = bm.categories.reduce((s, c) => s + (c.costStats?.median || 0), 0);

  // Donut data
  const pieData = bm.companyPosition
    ? bm.companyPosition.filter((p) => p.yourCostConverted && p.yourCostConverted > 0)
      .map((p) => ({ name: BENEFIT_CATEGORY_LABELS[p.category]?.split("/")[0]?.trim() || p.category, value: p.yourCostConverted || 0 }))
    : [];

  // Funding data
  const fundingData = bm.categories.filter((c) => c.companyCount > 0).map((c) => ({
    name: BENEFIT_CATEGORY_LABELS[c.category]?.split(" ")[0] || c.category,
    employerPct: c.pctEmployerFunded,
    employeePct: 100 - c.pctEmployerFunded,
  }));

  return (
    <>
      <PageWrapper companyName={data.config.companyName} label="Cost Analysis">
        <PageHeader title="Cost Analysis" />
        <StatRow>
          <StatBox label="Your Total Spend / Employee" value={formatCurrency(totalYourCost, currency)} color={B.cyan} />
          <StatBox label="Market Median Total" value={formatCurrency(totalMedian, currency)} color={B.navy} />
          <StatBox label="Difference" value={totalMedian > 0 ? `${totalYourCost > totalMedian ? "+" : ""}${Math.round(((totalYourCost - totalMedian) / totalMedian) * 100)}%` : "N/A"} color={totalYourCost > totalMedian ? B.green : B.amber} />
        </StatRow>

        <div style={{ display: "flex", gap: 24 }}>
          {/* Donut chart */}
          {pieData.length > 0 && (
            <div style={{ width: 300, height: 300 }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, color: B.navy, marginBottom: 8 }}>Your Cost Distribution</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} strokeWidth={0}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={({ name, percent }: any) => (percent ?? 0) >= 0.05 ? `${name} ${Math.round((percent ?? 0) * 100)}%` : null}
                    labelLine={false} fontSize={9}>
                    {pieData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0, currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Funding chart */}
          {fundingData.length > 0 && (
            <div style={{ flex: 1, height: 300 }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, color: B.navy, marginBottom: 8 }}>Employer vs Employee Funding</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fundingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={B.slate200} />
                  <XAxis dataKey="name" fontSize={10} tick={{ fill: B.navy }} />
                  <YAxis fontSize={10} domain={[0, 100]} stroke={B.slate500} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="employerPct" name="Employer %" fill={B.cyan} stackId="a" />
                  <Bar dataKey="employeePct" name="Employee %" fill={B.slate200} stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </PageWrapper>
      <PageBreak />
    </>
  );
}

function PensionBenchmarkPage({ data }: { data: ReportData }) {
  const bm = data.singleCountryData;
  if (!bm) return null;

  const pensionCat = bm.categories.find((c) => c.category === "PENSION");
  if (!pensionCat || !pensionCat.meetsMinimum || !pensionCat.pensionStats) return null;

  const ps = pensionCat.pensionStats;
  const hasPlanTypes = ps.planTypeBreakdown.length > 0;
  const hasSalaryBand = (bm.pensionSalaryBandStats ?? []).length > 0;

  if (!hasPlanTypes && !hasSalaryBand && ps.employerOnlyPct === 0) return null;

  const planDonut = ps.planTypeBreakdown.map((pt) => ({ name: PLAN_TYPE_LABELS[pt.type] || pt.type, value: pt.percentage }));
  const contribDonut = [{ name: "Employer Only", value: ps.employerOnlyPct }, { name: "Employer + Employee", value: ps.employerPlusEmployeePct }];

  // Salary band bar chart
  const salaryBandData = (bm.pensionSalaryBandStats ?? []).filter((sb) => sb.contributionStats).map((sb) => ({
    band: sb.salaryBandLabel,
    median: sb.contributionStats?.median ?? 0,
    p25: sb.contributionStats?.p25 ?? 0,
    p75: sb.contributionStats?.p75 ?? 0,
  }));

  return (
    <>
      <PageWrapper companyName={data.config.companyName} label="Pension Benchmarking">
        <PageHeader title="Pension Benchmarking" />
        <StatRow>
          <StatBox label="Median Total Contribution" value={ps.totalContributionStats ? `${ps.totalContributionStats.median}%` : "N/A"} color={B.cyan} />
          <StatBox label="Employer Only Plans" value={`${ps.employerOnlyPct}%`} color={B.purple} />
          <StatBox label="Below 3% ER Rate" value={`${ps.belowThresholdPct}%`} color={ps.belowThresholdPct > 30 ? B.amber : B.green} />
          <StatBox label="Death Benefit" value={ps.deathBenefitMultipleStats ? `${ps.deathBenefitMultipleStats.median}x` : "N/A"} color={B.navy} />
        </StatRow>

        <div style={{ display: "flex", gap: 30, marginBottom: 24 }}>
          {hasPlanTypes && (
            <div style={{ width: 250, textAlign: "center" }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, color: B.navy, marginBottom: 8 }}>Plan Type Split</h4>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} strokeWidth={0}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      label={({ name, percent }: any) => (percent ?? 0) >= 0.05 ? `${name} ${Math.round((percent ?? 0) * 100)}%` : null}
                      labelLine={false} fontSize={9}>
                      {planDonut.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div style={{ width: 250, textAlign: "center" }}>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: B.navy, marginBottom: 8 }}>Contribution Structure</h4>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={contribDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} strokeWidth={0}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={({ name, percent }: any) => (percent ?? 0) >= 0.05 ? `${name} ${Math.round((percent ?? 0) * 100)}%` : null}
                    labelLine={false} fontSize={9}>
                    {contribDonut.map((_, i) => <Cell key={i} fill={[B.cyan, B.slate200][i] || DONUT_COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {salaryBandData.length > 0 && (
          <>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: B.navy, marginBottom: 8 }}>Contributions by Salary Band</h4>
            <div style={{ height: 250, marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryBandData} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke={B.slate200} />
                  <XAxis dataKey="band" fontSize={10} tick={{ fill: B.navy }} />
                  <YAxis fontSize={10} tickFormatter={(v) => `${v}%`} stroke={B.slate500} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="p25" name="P25" fill={B.slate200} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="median" name="Median" fill={B.cyan} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="p75" name="P75" fill={B.navy} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </PageWrapper>
      <PageBreak />
    </>
  );
}

function PlatformPage({ data }: { data: ReportData }) {
  const bm = data.singleCountryData;
  if (!bm || !bm.platform.meetsMinimum) return null;

  const p = bm.platform;
  const currency = data.config.currency;

  return (
    <>
      <PageWrapper companyName={data.config.companyName} label="Platform Benchmarks">
        <PageHeader title="Platform Benchmarks" />
        <StatRow>
          <StatBox label="Platform Adoption" value={`${p.adoptionRate}%`} subtitle={`${p.totalCompanies} companies`} color={B.cyan} />
          <StatBox label="Median Fee" value={p.avgFee ? formatCurrency(p.avgFee.median, currency) : "N/A"} subtitle="per employee per annum" color={B.purple} />
          <StatBox label="Satisfaction" value={p.satisfactionStats ? `${p.satisfactionStats.mean.toFixed(1)}/10` : "N/A"} subtitle={p.satisfactionStats ? `${p.satisfactionStats.count} responses` : ""} color={B.navy} />
        </StatRow>

        {p.platformTypes.length > 0 && (
          <>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: B.navy, marginBottom: 8 }}>Platform Types</h4>
            <DataTable
              headers={["Type", "Count", "%"]}
              rows={p.platformTypes.map((pt) => [PLATFORM_TYPE_LABELS[pt.type] || pt.type, `${pt.count}`, `${Math.round(pt.percentage)}%`])}
            />
          </>
        )}

        {p.feeModels.length > 0 && (
          <>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: B.navy, marginBottom: 8 }}>Fee Models</h4>
            <DataTable
              headers={["Model", "Count", "%"]}
              rows={p.feeModels.map((fm) => [FEE_MODEL_LABELS[fm.model] || fm.model, `${fm.count}`, `${Math.round(fm.percentage)}%`])}
            />
          </>
        )}
      </PageWrapper>
      <PageBreak />
    </>
  );
}

function GlobalSummaryPage({ data }: { data: ReportData }) {
  const { config, allCountryData, globalFindings } = data;
  const currency = config.currency;

  return (
    <>
      <PageWrapper companyName={config.companyName} label="Global Summary">
        <PageHeader title="Global Executive Summary" />
        <DataTable
          headers={["Market", "Your Cost", "Median", "Benefits", "Companies"]}
          rows={config.countries.map((c) => {
            const d = allCountryData[c];
            if (!d) return [COUNTRY_LABELS[c] || c, "—", "—", "—", "—"];
            const yourCost = d.companyPosition ? d.companyPosition.reduce((s, p) => s + (p.yourCostConverted || 0), 0) : 0;
            const median = d.categories.reduce((s, cat) => s + (cat.costStats?.median || 0), 0);
            const benefitCount = d.companyPosition ? d.companyPosition.filter((p) => p.yourCost != null && p.yourCost > 0).length : 0;
            return [
              `${FLAGS[c] || ""} ${COUNTRY_LABELS[c] || c}`,
              formatCurrency(yourCost, currency),
              formatCurrency(median, currency),
              `${benefitCount}`,
              `${d.totalCompanies}`,
            ];
          })}
        />

        {globalFindings.length > 0 && (
          <>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: B.navy, marginTop: 16, marginBottom: 10, borderBottom: `2px solid ${B.purple}`, paddingBottom: 4 }}>Cross-Market Findings</h3>
            {globalFindings.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                <span style={{ color: B.purple, fontWeight: 700, fontSize: 12, minWidth: 20 }}>{i + 1}.</span>
                <span style={{ fontSize: 10, color: B.slate700, lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </>
        )}
      </PageWrapper>
      <PageBreak />
    </>
  );
}

function CountrySection({ countryCode, benchmarkData, currency, companyName }: { countryCode: string; benchmarkData: BenchmarkResult; currency: string; companyName: string }) {
  const totalYourCost = benchmarkData.companyPosition ? benchmarkData.companyPosition.reduce((s, p) => s + (p.yourCostConverted || 0), 0) : 0;
  const totalMedian = benchmarkData.categories.reduce((s, c) => s + (c.costStats?.median || 0), 0);
  const meetsCats = benchmarkData.categories.filter((c) => c.meetsMinimum);

  return (
    <>
      <PageWrapper companyName={companyName} label={COUNTRY_LABELS[countryCode] || countryCode}>
        <PageHeader title={`${FLAGS[countryCode] || ""} ${COUNTRY_LABELS[countryCode] || countryCode}`} />
        <StatRow>
          <StatBox label="Your Total Cost" value={formatCurrency(totalYourCost, currency)} color={B.cyan} />
          <StatBox label="Market Median" value={formatCurrency(totalMedian, currency)} color={B.navy} />
          <StatBox label="Dataset" value={`${benchmarkData.totalCompanies} co.`} color={B.purple} />
        </StatRow>
        <DataTable
          headers={["Category", "Prevalence", "Median", "Your Cost", "Rank"]}
          rows={meetsCats.map((cat) => {
            const pos = benchmarkData.companyPosition?.find((p) => p.category === cat.category);
            return [
              BENEFIT_CATEGORY_LABELS[cat.category] || cat.category,
              `${Math.round(cat.prevalence)}%`,
              cat.costStats ? formatCurrency(cat.costStats.median, currency) : "—",
              <span key="yc" style={{ color: B.cyan, fontWeight: 600 }}>{pos?.yourCostConverted ? formatCurrency(pos.yourCostConverted, currency) : "—"}</span>,
              pos?.percentileRank != null ? `${Math.round(pos.percentileRank)}th` : "N/A",
            ];
          })}
        />
      </PageWrapper>
      <PageBreak />
    </>
  );
}

function RecommendationsPage({ data }: { data: ReportData }) {
  return (
    <>
      <PageWrapper companyName={data.config.companyName} label="Recommendations">
        <PageHeader title="Recommendations" />
        {data.recommendations.map((rec, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <span style={{ color: B.purple, fontWeight: 700, fontSize: 13, minWidth: 20 }}>{i + 1}.</span>
            <span style={{ fontSize: 11, color: B.slate700, lineHeight: 1.5 }}>{rec}</span>
          </div>
        ))}
        <div style={{ marginTop: 24, padding: 12, background: B.slate50, borderRadius: 6, fontSize: 9, color: B.slate500, lineHeight: 1.5 }}>
          Note: These recommendations are based on market benchmarking data and should be considered alongside your organisation&apos;s specific circumstances, local regulations, and strategic objectives.
        </div>
      </PageWrapper>
      <PageBreak />
    </>
  );
}

function DataSourcesPage({ data }: { data: ReportData }) {
  const bm = data.singleCountryData;
  if (!bm) return null;

  const hasSources = bm.baselineSources && bm.baselineSources.length > 0;
  const hasDataQuality = bm.dataQuality || bm.dataQualityMessage;
  const categoriesWithMeta = bm.categories.filter(
    (c) => c.sourceDescription || c.confidenceLevel || (c.sourceUrls && c.sourceUrls.length > 0)
  );

  // Don't render this page if there's nothing to show
  if (!hasSources && !hasDataQuality && categoriesWithMeta.length === 0) return null;

  const confidenceBadge = (level: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      HIGH: { bg: "#D1FAE5", text: B.green },
      MEDIUM: { bg: "#FEF3C7", text: B.amber },
      LOW: { bg: "#FEE2E2", text: B.red },
    };
    const c = colors[level.toUpperCase()] || colors.MEDIUM;
    return (
      <span style={{
        display: "inline-block", padding: "2px 8px", borderRadius: 4,
        fontSize: 8, fontWeight: 600, background: c.bg, color: c.text, textTransform: "uppercase",
      }}>
        {level}
      </span>
    );
  };

  return (
    <>
      <PageWrapper companyName={data.config.companyName} label="Data Sources & References">
        <PageHeader title="Data Sources & References" />

        {/* Data Quality Indicator */}
        {hasDataQuality && (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: B.slate50, borderRadius: 8, borderLeft: `4px solid ${B.purple}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: B.navy, marginBottom: 4 }}>Data Quality</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {bm.dataQuality && confidenceBadge(bm.dataQuality === "industry" ? "HIGH" : bm.dataQuality === "cross_industry" ? "MEDIUM" : "MEDIUM")}
              <span style={{ fontSize: 10, color: B.slate700 }}>
                {bm.dataQualityMessage || (bm.dataQuality === "industry" ? "Industry-specific benchmark data" : bm.dataQuality === "cross_industry" ? "Cross-industry benchmark data" : "Reference benchmark data")}
              </span>
            </div>
          </div>
        )}

        {/* Baseline Sources */}
        {hasSources && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: B.navy, marginBottom: 8, borderBottom: `2px solid ${B.purple}`, paddingBottom: 4 }}>
              Baseline Data Sources
            </h3>
            {bm.baselineSources!.map((source, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ color: B.purple, fontSize: 11 }}>&bull;</span>
                <span style={{ fontSize: 10, color: B.slate700, lineHeight: 1.5 }}>{source}</span>
              </div>
            ))}
          </div>
        )}

        {/* Per-category source details */}
        {categoriesWithMeta.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: B.navy, marginBottom: 8, borderBottom: `2px solid ${B.purple}`, paddingBottom: 4 }}>
              Category Data Sources
            </h3>
            <DataTable
              headers={["Category", "Confidence", "Source", "References"]}
              rows={categoriesWithMeta.map((cat) => [
                BENEFIT_CATEGORY_LABELS[cat.category] || cat.category,
                cat.confidenceLevel ? confidenceBadge(cat.confidenceLevel) : "—",
                cat.sourceDescription || "—",
                cat.sourceUrls && cat.sourceUrls.length > 0
                  ? <span style={{ fontSize: 9, color: B.cyan, wordBreak: "break-all" as const }}>{cat.sourceUrls.join(", ")}</span>
                  : "—",
              ])}
            />
          </div>
        )}

        {/* Data Confidence Legend */}
        <div style={{ marginTop: 16, padding: "16px 20px", background: B.slate50, borderRadius: 8 }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, color: B.navy, marginBottom: 10 }}>Data Confidence Levels</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              {confidenceBadge("HIGH")}
              <span style={{ fontSize: 10, color: B.slate700, lineHeight: 1.5 }}>Verified from multiple independent sources with strong sample sizes.</span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              {confidenceBadge("MEDIUM")}
              <span style={{ fontSize: 10, color: B.slate700, lineHeight: 1.5 }}>Based on a single reliable source or moderate sample size.</span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              {confidenceBadge("LOW")}
              <span style={{ fontSize: 10, color: B.slate700, lineHeight: 1.5 }}>Estimated or derived from limited data. Use with caution.</span>
            </div>
          </div>
        </div>
      </PageWrapper>
      <PageBreak />
    </>
  );
}

function MethodologyPage({ data }: { data: ReportData }) {
  const { singleCountryData: bm, config, generatedAt } = data;
  const bullets = [
    `Sample size: ${bm?.totalCompanies || 0} companies in ${COUNTRY_LABELS[config.country] || config.country}${config.reportType === "global" ? ` (${config.countries.length} markets analysed)` : ""}`,
    `Industry filter: ${NACE_INDUSTRIES[config.companyIndustry] || "All industries"}`,
    `Data as of: ${bm?.dataAsOf ? new Date(bm.dataAsOf).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" }) : new Date(generatedAt).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" })}`,
    `Anonymity: All benchmarking data is anonymised. A minimum of 5 companies is required per category.`,
    `Currency: All monetary values are displayed in ${config.currency}.`,
    `Percentile rankings: A rank of 50 indicates your cost is at the market median.`,
    `Report generated: ${new Date(generatedAt).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
  ];

  // Add baseline source attribution if present
  if (bm?.baselineSources && bm.baselineSources.length > 0) {
    bullets.push(
      `Baseline data sources: ${bm.baselineSources.join("; ")}`
    );
  }
  if (bm?.dataQuality === "reference") {
    bullets.push(
      `Data quality: ${bm.dataQualityMessage || "Reference benchmarks based on published market data."}`
    );
  }

  return (
    <PageWrapper companyName={config.companyName} label="Methodology">
      <PageHeader title="Methodology" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bullets.map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <span style={{ color: B.purple, fontSize: 11 }}>&bull;</span>
            <span style={{ fontSize: 10, color: B.slate700, lineHeight: 1.5 }}>{b}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 30, padding: 12, background: B.slate50, borderRadius: 6, fontSize: 8, color: B.slate500, lineHeight: 1.5 }}>
        This report is produced by Eppione for the exclusive use of {config.companyName}.
        The data and analysis contained herein are based on survey responses from participating companies
        and should be used for indicative benchmarking purposes only.
      </div>
    </PageWrapper>
  );
}
