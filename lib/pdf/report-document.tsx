/* eslint-disable jsx-a11y/alt-text */
"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
} from "@react-pdf/renderer";
import type { ReportData, ComplianceReportData } from "./report-types";
import { styles, BRAND } from "./report-styles";
import {
  BENEFIT_CATEGORY_LABELS,
  COUNTRY_LABELS,
  NACE_INDUSTRIES,
  PLATFORM_TYPE_LABELS,
  FEE_MODEL_LABELS,
  formatCurrency,
} from "@/lib/utils";
import type { BenchmarkResult } from "@/lib/benchmarking-types";

const COUNTRY_FLAGS: Record<string, string> = {
  IE: "🇮🇪",
  GB: "🇬🇧",
  FR: "🇫🇷",
  ES: "🇪🇸",
  PT: "🇵🇹",
  US: "🇺🇸",
  DE: "🇩🇪",
  NL: "🇳🇱",
  AE: "🇦🇪",
  SG: "🇸🇬",
  AU: "🇦🇺",
};

function PageFooter({ pageLabel }: { pageLabel?: string }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>{pageLabel || "Eppione Benchmarking Report"}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function CoverPage({ data }: { data: ReportData }) {
  const { config, generatedAt } = data;
  const isGlobal = config.reportType === "global";
  const countryDisplay = isGlobal
    ? "Multi-Country Report"
    : `${COUNTRY_FLAGS[config.country] || ""} ${COUNTRY_LABELS[config.country] || config.country}`;
  const industryLabel = NACE_INDUSTRIES[config.companyIndustry] || config.companyIndustry;
  const dateStr = new Date(generatedAt).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.coverLogo}>eppione</Text>
      <Text style={styles.coverLogoSub}>BENCHMARKING</Text>
      <Text style={styles.coverTitle}>Employee Benefits{"\n"}Benchmarking Report</Text>
      <Text style={styles.coverSubtitle}>{countryDisplay}</Text>
      {isGlobal && (
        <Text style={[styles.coverMeta, { marginTop: 4 }]}>
          {config.countries.map((c) => `${COUNTRY_FLAGS[c] || ""} ${COUNTRY_LABELS[c] || c}`).join("  |  ")}
        </Text>
      )}
      <View style={styles.coverDivider} />
      <Text style={styles.coverMeta}>{config.companyName}</Text>
      <Text style={styles.coverMeta}>{industryLabel}</Text>
      <Text style={styles.coverMeta}>{dateStr}</Text>
      <Text style={styles.coverConfidential}>CONFIDENTIAL</Text>
    </Page>
  );
}

function ExecutiveSummaryPage({ data }: { data: ReportData }) {
  const { config, singleCountryData, findings } = data;
  const bm = singleCountryData;
  const currency = config.currency;

  const totalYourCost = bm?.companyPosition
    ? bm.companyPosition.reduce((s, p) => s + (p.yourCostConverted || 0), 0)
    : null;
  const totalMedian = bm
    ? bm.categories.reduce((s, c) => s + (c.costStats?.median || 0), 0)
    : 0;
  const yourBenefitCount = bm?.companyPosition
    ? bm.companyPosition.filter((p) => p.yourCost !== null && p.yourCost > 0).length
    : null;
  const avgBenefitsOffered =
    bm && bm.totalCompanies > 0
      ? Math.round(
          bm.categories.reduce((s, c) => s + c.companyCount, 0) / bm.totalCompanies
        )
      : 0;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>Executive Summary</Text>
      <Text style={styles.sectionDescription}>
        Key insights from your benefits benchmarking analysis
      </Text>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Your Total Cost / Employee</Text>
          <Text style={styles.statValue}>
            {totalYourCost !== null ? formatCurrency(totalYourCost, currency) : "N/A"}
          </Text>
          <Text style={styles.statComparison}>
            Market median: {totalMedian > 0 ? formatCurrency(totalMedian, currency) : "N/A"}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Benefits Offered</Text>
          <Text style={styles.statValue}>
            {yourBenefitCount !== null ? `${yourBenefitCount}` : "N/A"}
          </Text>
          <Text style={styles.statComparison}>Market average: {avgBenefitsOffered}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Companies in Dataset</Text>
          <Text style={styles.statValue}>{bm?.totalCompanies || 0}</Text>
          <Text style={styles.statComparison}>
            {COUNTRY_LABELS[config.country] || config.country}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionHeader, { fontSize: 14, marginTop: 12 }]}>Key Findings</Text>
      {findings.map((finding, i) => (
        <View key={i} style={styles.findingItem}>
          <Text style={styles.findingNumber}>{i + 1}.</Text>
          <Text style={styles.findingText}>{finding}</Text>
        </View>
      ))}

      <PageFooter />
    </Page>
  );
}

function PrevalencePage({ data }: { data: ReportData }) {
  const { singleCountryData, charts } = data;
  const bm = singleCountryData;
  if (!bm) return null;

  const sortedCats = [...bm.categories].sort((a, b) => b.prevalence - a.prevalence);

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>Benefit Prevalence</Text>
      <Text style={styles.sectionDescription}>
        Market prevalence of each benefit category compared to your coverage
      </Text>

      {charts.radarChart && (
        <View style={styles.chartContainer}>
          <Image src={charts.radarChart} style={styles.chartImage} />
          <Text style={styles.chartCaption}>
            Your coverage vs market prevalence
          </Text>
        </View>
      )}

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: "40%" }]}>Category</Text>
          <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>
            Companies
          </Text>
          <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>
            Prevalence
          </Text>
          <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>
            You Offer?
          </Text>
          <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>
            Employer %
          </Text>
        </View>
        {sortedCats.map((cat, i) => {
          const pos = bm.companyPosition?.find((p) => p.category === cat.category);
          const youOffer = pos?.yourCost !== null && pos?.yourCost !== undefined && pos.yourCost > 0;
          return (
            <View key={cat.category} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { width: "40%" }]}>
                {BENEFIT_CATEGORY_LABELS[cat.category] || cat.category}
              </Text>
              <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>
                {cat.companyCount} / {cat.totalCompanies}
              </Text>
              <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>
                {Math.round(cat.prevalence)}%
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  {
                    width: "15%",
                    textAlign: "center",
                    color: youOffer ? BRAND.green : BRAND.red,
                  },
                ]}
              >
                {youOffer ? "Yes" : "No"}
              </Text>
              <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>
                {Math.round(cat.pctEmployerFunded)}%
              </Text>
            </View>
          );
        })}
      </View>

      <PageFooter />
    </Page>
  );
}

function DetailedBenchmarkPages({ data }: { data: ReportData }) {
  const { singleCountryData, config } = data;
  const bm = singleCountryData;
  if (!bm) return null;

  const currency = config.currency;
  const meetsCats = bm.categories.filter((c) => c.meetsMinimum);
  const insufficientCats = bm.categories.filter((c) => !c.meetsMinimum);

  // Split categories into groups of ~5 per page
  const perPage = 5;
  const pages: typeof meetsCats[] = [];
  for (let i = 0; i < meetsCats.length; i += perPage) {
    pages.push(meetsCats.slice(i, i + perPage));
  }

  return (
    <>
      {pages.map((group, pageIdx) => (
        <Page key={pageIdx} size="A4" style={styles.page}>
          {pageIdx === 0 && (
            <>
              <Text style={styles.sectionHeader}>Detailed Benchmarks</Text>
              <Text style={styles.sectionDescription}>
                Per-category cost comparison with market percentiles
              </Text>
            </>
          )}

          {group.map((cat) => {
            const pos = bm.companyPosition?.find((p) => p.category === cat.category);
            return (
              <View key={cat.category} style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Helvetica-Bold",
                    color: BRAND.navy,
                    marginBottom: 4,
                  }}
                >
                  {BENEFIT_CATEGORY_LABELS[cat.category] || cat.category}
                </Text>

                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Metric</Text>
                    <Text style={[styles.tableHeaderCell, { width: "18.75%", textAlign: "center" }]}>
                      P25
                    </Text>
                    <Text style={[styles.tableHeaderCell, { width: "18.75%", textAlign: "center" }]}>
                      Median
                    </Text>
                    <Text style={[styles.tableHeaderCell, { width: "18.75%", textAlign: "center" }]}>
                      P75
                    </Text>
                    <Text style={[styles.tableHeaderCell, { width: "18.75%", textAlign: "center" }]}>
                      Your Cost
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: "25%" }]}>Annual Cost / Employee</Text>
                    <Text style={[styles.tableCell, { width: "18.75%", textAlign: "center" }]}>
                      {cat.costStats ? formatCurrency(cat.costStats.p25, currency) : "—"}
                    </Text>
                    <Text style={[styles.tableCell, { width: "18.75%", textAlign: "center" }]}>
                      {cat.costStats ? formatCurrency(cat.costStats.median, currency) : "—"}
                    </Text>
                    <Text style={[styles.tableCell, { width: "18.75%", textAlign: "center" }]}>
                      {cat.costStats ? formatCurrency(cat.costStats.p75, currency) : "—"}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        {
                          width: "18.75%",
                          textAlign: "center",
                          fontFamily: "Helvetica-Bold",
                          color: BRAND.cyan,
                        },
                      ]}
                    >
                      {pos?.yourCostConverted
                        ? formatCurrency(pos.yourCostConverted, currency)
                        : "—"}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 16, marginTop: 2 }}>
                  <Text style={{ fontSize: 8, color: BRAND.slate500 }}>
                    Percentile rank:{" "}
                    {pos?.percentileRank !== null && pos?.percentileRank !== undefined
                      ? `${Math.round(pos.percentileRank)}th`
                      : "N/A"}
                  </Text>
                  <Text style={{ fontSize: 8, color: BRAND.slate500 }}>
                    vs Median:{" "}
                    {pos?.vsMedian !== null && pos?.vsMedian !== undefined
                      ? `${pos.vsMedian > 0 ? "+" : ""}${Math.round(pos.vsMedian)}%`
                      : "N/A"}
                  </Text>
                  <Text style={{ fontSize: 8, color: BRAND.slate500 }}>
                    Covers spouse: {Math.round(cat.pctCoversSpouse)}%
                  </Text>
                  <Text style={{ fontSize: 8, color: BRAND.slate500 }}>
                    Covers dependents: {Math.round(cat.pctCoversDependents)}%
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Show insufficient categories on the last page */}
          {pageIdx === pages.length - 1 && insufficientCats.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: "Helvetica-Bold",
                  color: BRAND.slate500,
                  marginBottom: 6,
                }}
              >
                Insufficient Data (fewer than 5 companies)
              </Text>
              {insufficientCats.map((cat) => (
                <Text
                  key={cat.category}
                  style={{ fontSize: 9, color: BRAND.slate500, marginBottom: 2 }}
                >
                  {BENEFIT_CATEGORY_LABELS[cat.category] || cat.category} — {cat.companyCount}{" "}
                  {cat.companyCount === 1 ? "company" : "companies"}
                </Text>
              ))}
            </View>
          )}

          <PageFooter />
        </Page>
      ))}
    </>
  );
}

function CostAnalysisPage({ data }: { data: ReportData }) {
  const { charts, singleCountryData, config } = data;
  const bm = singleCountryData;
  if (!bm) return null;

  const currency = config.currency;
  const totalYourCost = bm.companyPosition
    ? bm.companyPosition.reduce((s, p) => s + (p.yourCostConverted || 0), 0)
    : 0;
  const totalMedian = bm.categories.reduce(
    (s, c) => s + (c.costStats?.median || 0),
    0
  );

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>Cost Analysis</Text>
      <Text style={styles.sectionDescription}>
        Detailed cost comparison across benefit categories
      </Text>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Your Total Spend / Employee</Text>
          <Text style={styles.statValue}>{formatCurrency(totalYourCost, currency)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Market Median Total</Text>
          <Text style={styles.statValue}>{formatCurrency(totalMedian, currency)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Difference</Text>
          <Text style={styles.statValue}>
            {totalMedian > 0
              ? `${totalYourCost > totalMedian ? "+" : ""}${Math.round(
                  ((totalYourCost - totalMedian) / totalMedian) * 100
                )}%`
              : "N/A"}
          </Text>
        </View>
      </View>

      {charts.costBarChart && (
        <View style={styles.chartContainer}>
          <Image src={charts.costBarChart} style={styles.chartImage} />
          <Text style={styles.chartCaption}>Cost by category: Your cost vs Median vs P75</Text>
        </View>
      )}

      {charts.costPieChart && (
        <View style={styles.chartContainer}>
          <Image src={charts.costPieChart} style={[styles.chartImage, { maxHeight: 200 }]} />
          <Text style={styles.chartCaption}>Your benefits spend distribution</Text>
        </View>
      )}

      <PageFooter />
    </Page>
  );
}

function FundingPage({ data }: { data: ReportData }) {
  const { charts } = data;

  if (!charts.fundingChart) return null;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>Employer vs Employee Funding</Text>
      <Text style={styles.sectionDescription}>
        How benefits costs are shared between employers and employees across the market
      </Text>

      <View style={styles.chartContainer}>
        <Image src={charts.fundingChart} style={styles.chartImage} />
        <Text style={styles.chartCaption}>
          Employer and employee contribution percentages by category
        </Text>
      </View>

      <PageFooter />
    </Page>
  );
}

function PensionBenchmarkPage({ data }: { data: ReportData }) {
  const bm = data.singleCountryData;
  if (!bm) return null;

  const pensionCat = bm.categories.find((c) => c.category === "PENSION");
  if (!pensionCat || !pensionCat.meetsMinimum || !pensionCat.pensionStats) return null;

  const ps = pensionCat.pensionStats;
  const hasPlanTypes = ps.planTypeBreakdown.length > 0;
  const hasDeathBenefitTypes = ps.deathBenefitTypeBreakdown.length > 0;
  const hasSalaryBandStats = (bm.pensionSalaryBandStats ?? []).length > 0;

  if (!hasPlanTypes && !hasSalaryBandStats && ps.employerOnlyPct === 0) return null;

  const PLAN_LABELS: Record<string, string> = { DC: "Defined Contribution", DB: "Defined Benefit", CASH_BALANCE: "Cash Balance", HYBRID: "Hybrid" };
  const DB_LABELS: Record<string, string> = { ACCUMULATED_RESERVES: "Accumulated Reserves", FIXED_MULTIPLE: "Fixed Multiple", MIXED: "Mixed", NONE: "None" };

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>Pension Benchmarking</Text>
      <Text style={styles.sectionDescription}>
        Plan type prevalence, contribution analysis, and death benefit benchmarks
      </Text>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Median Total Contribution</Text>
          <Text style={styles.statValue}>
            {ps.totalContributionStats ? `${ps.totalContributionStats.median}%` : "N/A"}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Employer Only Plans</Text>
          <Text style={styles.statValue}>{ps.employerOnlyPct}%</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Below 3% ER Rate</Text>
          <Text style={styles.statValue}>{ps.belowThresholdPct}%</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Median Death Benefit</Text>
          <Text style={styles.statValue}>
            {ps.deathBenefitMultipleStats ? `${ps.deathBenefitMultipleStats.median}x` : "N/A"}
          </Text>
        </View>
      </View>

      {hasPlanTypes && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND.navy, marginBottom: 6 }}>
            DC vs DB Plan Prevalence
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "60%" }]}>Plan Type</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>Count</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>%</Text>
            </View>
            {ps.planTypeBreakdown.map((pt, i) => (
              <View key={pt.type} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: "60%" }]}>{PLAN_LABELS[pt.type] || pt.type}</Text>
                <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>{pt.count}</Text>
                <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>{pt.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {hasDeathBenefitTypes && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND.navy, marginBottom: 6 }}>
            Death Benefit Structure
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "60%" }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>Count</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>%</Text>
            </View>
            {ps.deathBenefitTypeBreakdown.map((dt, i) => (
              <View key={dt.type} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: "60%" }]}>{DB_LABELS[dt.type] || dt.type}</Text>
                <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>{dt.count}</Text>
                <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>{dt.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {hasSalaryBandStats && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND.navy, marginBottom: 6 }}>
            Contributions by Salary Band
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Salary Band</Text>
              <Text style={[styles.tableHeaderCell, { width: "14%", textAlign: "center" }]}>Cos</Text>
              <Text style={[styles.tableHeaderCell, { width: "14%", textAlign: "center" }]}>P25</Text>
              <Text style={[styles.tableHeaderCell, { width: "14%", textAlign: "center" }]}>Med</Text>
              <Text style={[styles.tableHeaderCell, { width: "14%", textAlign: "center" }]}>P75</Text>
              <Text style={[styles.tableHeaderCell, { width: "14%", textAlign: "center" }]}>Death</Text>
            </View>
            {(bm.pensionSalaryBandStats ?? []).map((sb, i) => (
              <View key={sb.salaryBand} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: "30%" }]}>{sb.salaryBandLabel}</Text>
                <Text style={[styles.tableCell, { width: "14%", textAlign: "center" }]}>{sb.companyCount}</Text>
                <Text style={[styles.tableCell, { width: "14%", textAlign: "center" }]}>
                  {sb.contributionStats ? `${sb.contributionStats.p25}%` : "—"}
                </Text>
                <Text style={[styles.tableCell, { width: "14%", textAlign: "center" }]}>
                  {sb.contributionStats ? `${sb.contributionStats.median}%` : "—"}
                </Text>
                <Text style={[styles.tableCell, { width: "14%", textAlign: "center" }]}>
                  {sb.contributionStats ? `${sb.contributionStats.p75}%` : "—"}
                </Text>
                <Text style={[styles.tableCell, { width: "14%", textAlign: "center" }]}>
                  {sb.deathBenefitStats ? `${sb.deathBenefitStats.median}x` : "—"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <PageFooter />
    </Page>
  );
}

function PlatformPage({ data }: { data: ReportData }) {
  const { singleCountryData, config } = data;
  const bm = singleCountryData;
  if (!bm || !bm.platform.meetsMinimum) return null;

  const p = bm.platform;
  const currency = config.currency;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>Platform Benchmarks</Text>
      <Text style={styles.sectionDescription}>
        Benefits platform adoption and satisfaction metrics
      </Text>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Platform Adoption</Text>
          <Text style={styles.statValue}>{p.adoptionRate}%</Text>
          <Text style={styles.statComparison}>{p.totalCompanies} companies</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Median Fee</Text>
          <Text style={styles.statValue}>
            {p.avgFee ? formatCurrency(p.avgFee.median, currency) : "N/A"}
          </Text>
          <Text style={styles.statComparison}>per employee per annum</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Satisfaction</Text>
          <Text style={styles.statValue}>
            {p.satisfactionStats ? `${p.satisfactionStats.mean.toFixed(1)}/10` : "N/A"}
          </Text>
          <Text style={styles.statComparison}>
            {p.satisfactionStats ? `${p.satisfactionStats.count} responses` : ""}
          </Text>
        </View>
      </View>

      {/* Platform type breakdown */}
      {p.platformTypes.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND.navy, marginBottom: 6 }}>
            Platform Types
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "60%" }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>
                Count
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>%</Text>
            </View>
            {p.platformTypes.map((pt, i) => (
              <View key={pt.type} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: "60%" }]}>
                  {PLATFORM_TYPE_LABELS[pt.type] || pt.type}
                </Text>
                <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>
                  {pt.count}
                </Text>
                <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>
                  {Math.round(pt.percentage)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Fee model breakdown */}
      {p.feeModels.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND.navy, marginBottom: 6 }}>
            Fee Models
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "60%" }]}>Model</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>
                Count
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>%</Text>
            </View>
            {p.feeModels.map((fm, i) => (
              <View key={fm.model} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: "60%" }]}>
                  {FEE_MODEL_LABELS[fm.model] || fm.model}
                </Text>
                <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>
                  {fm.count}
                </Text>
                <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>
                  {Math.round(fm.percentage)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <PageFooter />
    </Page>
  );
}

function GlobalSummaryPage({ data }: { data: ReportData }) {
  const { config, allCountryData, globalFindings } = data;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>Global Executive Summary</Text>
      <Text style={styles.sectionDescription}>
        Cross-market overview of your benefits positioning
      </Text>

      {/* Per-country summary */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Market</Text>
          <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>
            Your Cost
          </Text>
          <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>
            Median
          </Text>
          <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>
            Benefits
          </Text>
          <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>
            Companies
          </Text>
        </View>
        {config.countries.map((c, i) => {
          const d = allCountryData[c];
          if (!d) return null;
          const yourCost = d.companyPosition
            ? d.companyPosition.reduce((s, p) => s + (p.yourCostConverted || 0), 0)
            : 0;
          const median = d.categories.reduce(
            (s, cat) => s + (cat.costStats?.median || 0),
            0
          );
          const benefitCount = d.companyPosition
            ? d.companyPosition.filter((p) => p.yourCost !== null && p.yourCost > 0).length
            : 0;
          return (
            <View key={c} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { width: "25%" }]}>
                {COUNTRY_FLAGS[c] || ""} {COUNTRY_LABELS[c] || c}
              </Text>
              <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>
                {formatCurrency(yourCost, config.currency)}
              </Text>
              <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>
                {formatCurrency(median, config.currency)}
              </Text>
              <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>
                {benefitCount}
              </Text>
              <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>
                {d.totalCompanies}
              </Text>
            </View>
          );
        })}
      </View>

      {globalFindings.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.sectionHeader, { fontSize: 14 }]}>Cross-Market Findings</Text>
          {globalFindings.map((f, i) => (
            <View key={i} style={styles.findingItem}>
              <Text style={styles.findingNumber}>{i + 1}.</Text>
              <Text style={styles.findingText}>{f}</Text>
            </View>
          ))}
        </View>
      )}

      <PageFooter />
    </Page>
  );
}

function CrossCountryPage({ data }: { data: ReportData }) {
  const { crossCountryData, charts } = data;
  if (!crossCountryData || crossCountryData.countries.length < 2) return null;

  const { countries, benchmarks } = crossCountryData;
  const allCategories = new Set<string>();
  for (const bms of Object.values(benchmarks)) {
    for (const bm of bms) allCategories.add(bm.category);
  }
  const catList = Array.from(allCategories);

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>Cross-Country Comparison</Text>
      <Text style={styles.sectionDescription}>
        Benefit prevalence and cost comparison across your operating markets
      </Text>

      {charts.crossCountryChart && (
        <View style={styles.chartContainer}>
          <Image src={charts.crossCountryChart} style={styles.chartImage} />
          <Text style={styles.chartCaption}>Median cost by category across countries</Text>
        </View>
      )}

      {/* Prevalence heatmap */}
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Helvetica-Bold",
          color: BRAND.navy,
          marginBottom: 6,
          marginTop: 8,
        }}
      >
        Prevalence Heatmap
      </Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: `${40}%` }]}>Category</Text>
          {countries.map((c) => (
            <Text
              key={c}
              style={[
                styles.tableHeaderCell,
                { width: `${60 / countries.length}%`, textAlign: "center" },
              ]}
            >
              {COUNTRY_LABELS[c] || c}
            </Text>
          ))}
        </View>
        {catList.map((cat, i) => (
          <View key={cat} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={[styles.tableCell, { width: "40%" }]}>
              {BENEFIT_CATEGORY_LABELS[cat] || cat}
            </Text>
            {countries.map((c) => {
              const bm = benchmarks[c]?.find((b) => b.category === cat);
              const prev = bm?.prevalence || 0;
              let bgColor = BRAND.slate100;
              let textColor = BRAND.slate500;
              if (prev >= 75) {
                bgColor = "#dcfce7";
                textColor = "#166534";
              } else if (prev >= 50) {
                bgColor = "#f0fdf4";
                textColor = "#15803d";
              } else if (prev >= 25) {
                bgColor = "#fffbeb";
                textColor = "#b45309";
              } else if (prev > 0) {
                bgColor = "#fef2f2";
                textColor = "#dc2626";
              }
              return (
                <View
                  key={c}
                  style={[
                    styles.heatmapCell,
                    {
                      width: `${60 / countries.length}%`,
                      backgroundColor: bgColor,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 8, color: textColor, textAlign: "center" }}>
                    {prev > 0 ? `${Math.round(prev)}%` : "--"}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <PageFooter />
    </Page>
  );
}

function CountrySection({
  countryCode,
  benchmarkData,
  currency,
}: {
  countryCode: string;
  benchmarkData: BenchmarkResult;
  currency: string;
}) {
  const totalYourCost = benchmarkData.companyPosition
    ? benchmarkData.companyPosition.reduce(
        (s, p) => s + (p.yourCostConverted || 0),
        0
      )
    : 0;
  const totalMedian = benchmarkData.categories.reduce(
    (s, c) => s + (c.costStats?.median || 0),
    0
  );
  const meetsCats = benchmarkData.categories.filter((c) => c.meetsMinimum);

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.countryHeader}>
        {COUNTRY_FLAGS[countryCode] || ""} {COUNTRY_LABELS[countryCode] || countryCode}
      </Text>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Your Total Cost</Text>
          <Text style={styles.statValue}>{formatCurrency(totalYourCost, currency)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Market Median</Text>
          <Text style={styles.statValue}>{formatCurrency(totalMedian, currency)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Dataset</Text>
          <Text style={styles.statValue}>{benchmarkData.totalCompanies} co.</Text>
        </View>
      </View>

      {/* Abbreviated per-category table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: "35%" }]}>Category</Text>
          <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>
            Prevalence
          </Text>
          <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>
            Median
          </Text>
          <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>
            Your Cost
          </Text>
          <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>
            Rank
          </Text>
        </View>
        {meetsCats.map((cat, i) => {
          const pos = benchmarkData.companyPosition?.find(
            (p) => p.category === cat.category
          );
          return (
            <View key={cat.category} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { width: "35%" }]}>
                {BENEFIT_CATEGORY_LABELS[cat.category] || cat.category}
              </Text>
              <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>
                {Math.round(cat.prevalence)}%
              </Text>
              <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>
                {cat.costStats ? formatCurrency(cat.costStats.median, currency) : "—"}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  { width: "15%", textAlign: "center", color: BRAND.cyan },
                ]}
              >
                {pos?.yourCostConverted
                  ? formatCurrency(pos.yourCostConverted, currency)
                  : "—"}
              </Text>
              <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>
                {pos?.percentileRank !== null && pos?.percentileRank !== undefined
                  ? `${Math.round(pos.percentileRank)}th pctile`
                  : "N/A"}
              </Text>
            </View>
          );
        })}
      </View>

      <PageFooter />
    </Page>
  );
}

function RecommendationsPage({ data }: { data: ReportData }) {
  const { recommendations } = data;
  if (recommendations.length === 0) return null;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>Recommendations</Text>
      <Text style={styles.sectionDescription}>
        Actionable insights based on your cross-market benchmarking analysis
      </Text>

      {recommendations.map((rec, i) => (
        <View key={i} style={styles.findingItem}>
          <Text style={styles.findingNumber}>{i + 1}.</Text>
          <Text style={styles.findingText}>{rec}</Text>
        </View>
      ))}

      <View style={{ marginTop: 20 }}>
        <Text style={styles.methodologyNote}>
          Note: These recommendations are based on market benchmarking data and should be
          considered alongside your organisation&apos;s specific circumstances, local regulations,
          and strategic objectives. We recommend consulting with your benefits advisor before
          making changes.
        </Text>
      </View>

      <PageFooter />
    </Page>
  );
}

function MethodologyPage({ data }: { data: ReportData }) {
  const { singleCountryData, config, generatedAt } = data;
  const bm = singleCountryData;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>Methodology</Text>
      <Text style={styles.sectionDescription}>
        How this benchmarking report was compiled
      </Text>

      <View style={{ gap: 10 }}>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            Sample size: {bm?.totalCompanies || 0} companies in {COUNTRY_LABELS[config.country] || config.country}
            {config.reportType === "global"
              ? ` (${config.countries.length} markets analysed)`
              : ""}
          </Text>
        </View>

        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            Industry filter: {NACE_INDUSTRIES[config.companyIndustry] || "All industries"}
          </Text>
        </View>

        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            Data as of:{" "}
            {bm?.dataAsOf
              ? new Date(bm.dataAsOf).toLocaleDateString("en-IE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : new Date(generatedAt).toLocaleDateString("en-IE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
          </Text>
        </View>

        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            Anonymity: All benchmarking data is anonymised. A minimum of 5 companies is
            required per category before data is disclosed, ensuring no individual company
            can be identified.
          </Text>
        </View>

        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            Currency: All monetary values are displayed in {config.currency}. Where
            original data was submitted in a different currency, exchange rates as of the
            report generation date have been applied.
          </Text>
        </View>

        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            Percentile rankings: A percentile rank of 50 indicates your cost is at the
            market median. A rank above 50 indicates higher-than-median spend. Lower
            cost does not necessarily indicate inferior coverage.
          </Text>
        </View>

        <View style={styles.bulletItem}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>
            Report generated:{" "}
            {new Date(generatedAt).toLocaleDateString("en-IE", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 30, padding: 12, backgroundColor: BRAND.slate100, borderRadius: 4 }}>
        <Text style={{ fontSize: 8, color: BRAND.slate500, lineHeight: 1.5 }}>
          This report is produced by Eppione for the exclusive use of {config.companyName}.
          The data and analysis contained herein are based on survey responses from
          participating companies and should be used for indicative benchmarking purposes
          only. Eppione accepts no liability for decisions made based on this report.
        </Text>
      </View>

      <PageFooter />
    </Page>
  );
}

function ComplianceSummaryPage({ data }: { data: ComplianceReportData; }) {
  const { results, limits, summary, country } = data;

  const mandatoryResults = results.filter(
    (r) => r.requirement.requirementType === "MANDATORY" || r.requirement.requirementType === "QUASI_MANDATORY"
  );
  const issueResults = results.filter(
    (r) => r.status === "NON_COMPLIANT" || r.status === "PARTIALLY_COMPLIANT"
  );

  const trafficColor = summary.mandatoryIssues > 0
    ? BRAND.red
    : (summary.nonCompliant + summary.partiallyCompliant) > 0
      ? BRAND.amber
      : BRAND.green;

  const trafficLabel = summary.mandatoryIssues > 0
    ? "Issues Found"
    : (summary.nonCompliant + summary.partiallyCompliant) > 0
      ? "Review Needed"
      : "Compliant";

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionHeader}>Compliance Summary</Text>
      <Text style={styles.sectionDescription}>
        Regulatory compliance status for {COUNTRY_LABELS[country] || country}
      </Text>

      {/* Traffic light + stats */}
      <View style={styles.statRow}>
        <View style={[styles.statBox, { borderLeftWidth: 4, borderLeftColor: trafficColor }]}>
          <Text style={styles.statLabel}>Overall Status</Text>
          <Text style={[styles.statValue, { color: trafficColor }]}>{trafficLabel}</Text>
          <Text style={styles.statComparison}>{COUNTRY_LABELS[country] || country}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Compliant</Text>
          <Text style={[styles.statValue, { color: BRAND.green }]}>{summary.compliant}</Text>
          <Text style={styles.statComparison}>of {summary.totalRequirements}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Issues</Text>
          <Text style={[styles.statValue, { color: BRAND.red }]}>
            {summary.nonCompliant + summary.partiallyCompliant}
          </Text>
          <Text style={styles.statComparison}>
            {summary.mandatoryIssues} mandatory
          </Text>
        </View>
      </View>

      {/* Mandatory requirements table */}
      {mandatoryResults.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND.navy, marginBottom: 6 }}>
            Mandatory Requirements
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "8%" }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Category</Text>
              <Text style={[styles.tableHeaderCell, { width: "40%" }]}>Requirement</Text>
              <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Min. Level</Text>
              <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Ref</Text>
            </View>
            {mandatoryResults.slice(0, 12).map((r, i) => {
              const statusColor = r.status === "COMPLIANT" ? BRAND.green
                : r.status === "NON_COMPLIANT" ? BRAND.red
                : r.status === "PARTIALLY_COMPLIANT" ? BRAND.amber
                : BRAND.slate500;
              const statusSymbol = r.status === "COMPLIANT" ? "OK"
                : r.status === "NON_COMPLIANT" ? "FAIL"
                : r.status === "PARTIALLY_COMPLIANT" ? "PART"
                : "N/A";
              return (
                <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { width: "8%", color: statusColor, fontFamily: "Helvetica-Bold" }]}>
                    {statusSymbol}
                  </Text>
                  <Text style={[styles.tableCell, { width: "22%" }]}>
                    {BENEFIT_CATEGORY_LABELS[r.requirement.benefitCategory] || r.requirement.benefitCategory}
                  </Text>
                  <Text style={[styles.tableCell, { width: "40%" }]}>
                    {r.requirement.description.length > 80
                      ? r.requirement.description.substring(0, 77) + "..."
                      : r.requirement.description}
                  </Text>
                  <Text style={[styles.tableCell, { width: "15%", fontSize: 8 }]}>
                    {r.requirement.minimumLevel || "—"}
                  </Text>
                  <Text style={[styles.tableCell, { width: "15%", fontSize: 7 }]}>
                    {r.requirement.legalReference || "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Gap Analysis */}
      {issueResults.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND.navy, marginBottom: 6 }}>
            Gap Analysis
          </Text>
          {issueResults.slice(0, 6).map((r, i) => (
            <View key={i} style={styles.findingItem}>
              <Text style={[styles.findingNumber, { color: r.status === "NON_COMPLIANT" ? BRAND.red : BRAND.amber }]}>
                {i + 1}.
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.findingText, { fontFamily: "Helvetica-Bold" }]}>
                  {BENEFIT_CATEGORY_LABELS[r.requirement.benefitCategory] || r.requirement.benefitCategory}
                </Text>
                {r.gap && (
                  <Text style={{ fontSize: 9, color: BRAND.slate700, marginTop: 2 }}>
                    {r.gap}
                  </Text>
                )}
                {r.recommendation && (
                  <Text style={{ fontSize: 8, color: BRAND.cyan, marginTop: 2 }}>
                    Recommendation: {r.recommendation}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Statutory Limits summary */}
      {limits.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND.navy, marginBottom: 6 }}>
            Key Statutory Limits ({limits[0]?.taxYear || ""})
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Description</Text>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Category</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "center" }]}>Limit</Text>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Reference</Text>
            </View>
            {limits.slice(0, 8).map((l, i) => (
              <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: "30%" }]}>
                  {l.description.length > 40 ? l.description.substring(0, 37) + "..." : l.description}
                </Text>
                <Text style={[styles.tableCell, { width: "25%" }]}>
                  {l.benefitCategory ? (BENEFIT_CATEGORY_LABELS[l.benefitCategory] || l.benefitCategory) : "General"}
                </Text>
                <Text style={[styles.tableCell, { width: "20%", textAlign: "center", fontFamily: "Helvetica-Bold" }]}>
                  {l.currency ? `${l.currency} ` : ""}{l.limitValue}
                </Text>
                <Text style={[styles.tableCell, { width: "25%", fontSize: 7 }]}>
                  {l.legalReference || "—"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Disclaimer */}
      <View style={{ marginTop: 16, padding: 8, backgroundColor: BRAND.slate100, borderRadius: 4 }}>
        <Text style={{ fontSize: 7, color: BRAND.slate500, lineHeight: 1.4 }}>
          Disclaimer: This compliance summary is based on data contributed by benefits brokers and
          verified by Eppione administrators. It is provided for informational purposes only and does
          not constitute legal advice. Requirements and limits may change. Always consult qualified
          legal counsel for definitive compliance guidance.
        </Text>
      </View>

      <PageFooter />
    </Page>
  );
}

export function BenchmarkReportDocument({ data }: { data: ReportData }) {
  const isGlobal = data.config.reportType === "global";

  return (
    <Document
      title={`Benefits Benchmarking Report - ${data.config.companyName}`}
      author="Eppione"
      subject="Employee Benefits Benchmarking"
    >
      {/* Cover */}
      <CoverPage data={data} />

      {/* Executive Summary */}
      <ExecutiveSummaryPage data={data} />

      {/* Global Summary (global only) */}
      {isGlobal && <GlobalSummaryPage data={data} />}

      {/* Cross-Country Comparison (global only) */}
      {isGlobal && <CrossCountryPage data={data} />}

      {/* Prevalence */}
      <PrevalencePage data={data} />

      {/* Detailed Benchmarks */}
      <DetailedBenchmarkPages data={data} />

      {/* Cost Analysis */}
      {data.config.includeCostAnalysis && <CostAnalysisPage data={data} />}
      {data.config.includeCostAnalysis && <FundingPage data={data} />}

      {/* Pension Benchmarking */}
      <PensionBenchmarkPage data={data} />

      {/* Platform Benchmarks */}
      {data.config.includePlatformBenchmarks && <PlatformPage data={data} />}

      {/* Country-by-Country (global only) */}
      {isGlobal &&
        data.config.countries.map((c) => {
          const d = data.allCountryData[c];
          if (!d) return null;
          return (
            <CountrySection
              key={c}
              countryCode={c}
              benchmarkData={d}
              currency={data.config.currency}
            />
          );
        })}

      {/* Recommendations (global only) */}
      {isGlobal && <RecommendationsPage data={data} />}

      {/* Compliance Summary */}
      {data.config.includeCompliance && data.complianceData && (
        <ComplianceSummaryPage data={data.complianceData} />
      )}

      {/* Methodology */}
      <MethodologyPage data={data} />
    </Document>
  );
}
