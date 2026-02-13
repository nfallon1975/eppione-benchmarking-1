"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartWrapper } from "@/components/benchmarks/chart-wrapper";
import { StatCard } from "@/components/benchmarks/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { BENEFIT_CATEGORY_LABELS, formatCurrency } from "@/lib/utils";

interface AcquisitionPoint {
  month: string;
  invited: number;
  active: number;
  cumInvited: number;
  cumActive: number;
}

interface ComplianceGap {
  category: string;
  totalGaps: number;
  mandatoryGaps: number;
  countriesAffected: number;
}

interface BenefitTrend {
  category: string;
  clientCount: number;
  prevalence: number;
  avgCost: number | null;
  pctEmployerFunded: number;
}

interface ClientVsMarketItem {
  category: string;
  clientPrevalence: number;
  marketPrevalence: number;
  clientAvgCost: number | null;
  marketAvgCost: number | null;
}

interface AnalyticsData {
  acquisitionTimeline: AcquisitionPoint[];
  complianceGaps: ComplianceGap[];
  benefitTrends: BenefitTrend[];
  clientVsMarket: ClientVsMarketItem[];
  summary: {
    totalClients: number;
    totalMarketCompanies: number;
    totalComplianceGaps: number;
    mandatoryGapsCount: number;
    avgBenefitsPerClient: number;
    categoriesCoveredByClients: number;
  };
}

const CHART_COLORS = {
  cyan: "#00B4D8",
  navy: "#1B2A4A",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  slate: "#94a3b8",
};

const GAP_BAR_COLORS = [
  "#EF4444", "#F59E0B", "#F97316", "#EC4899", "#8B5CF6",
  "#6366F1", "#3B82F6", "#14B8A6", "#10B981", "#84CC16",
];

export default function BrokerAnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== "BROKER") {
      router.push("/dashboard");
      return;
    }
    fetch("/api/broker/analytics")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Failed to load analytics data.
      </div>
    );
  }

  const { acquisitionTimeline, complianceGaps, benefitTrends, clientVsMarket, summary } = data;

  // Format month labels
  const timelineData = acquisitionTimeline.map((p) => ({
    ...p,
    label: formatMonth(p.month),
  }));

  // Radar chart data for client vs market
  const radarData = clientVsMarket
    .filter((item) => item.marketPrevalence > 0 || item.clientPrevalence > 0)
    .slice(0, 10)
    .map((item) => ({
      category: shortLabel(item.category),
      "Your Clients": item.clientPrevalence,
      "Market Average": item.marketPrevalence,
    }));

  // Bar data for cost comparison
  const costComparisonData = clientVsMarket
    .filter((item) => item.clientAvgCost !== null && item.marketAvgCost !== null)
    .slice(0, 8)
    .map((item) => ({
      category: shortLabel(item.category),
      "Client Avg": item.clientAvgCost,
      "Market Avg": item.marketAvgCost,
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-slate-500">
          Insights across your client portfolio and the wider market
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Active Clients"
          value={String(summary.totalClients)}
          comparison={`of ${summary.totalMarketCompanies} total on platform`}
        />
        <StatCard
          label="Avg Benefits / Client"
          value={String(summary.avgBenefitsPerClient)}
          comparison={`across ${summary.categoriesCoveredByClients} categories`}
        />
        <StatCard
          label="Compliance Gaps"
          value={String(summary.totalComplianceGaps)}
          comparison={`${summary.mandatoryGapsCount} mandatory`}
          trend={summary.mandatoryGapsCount > 0 ? "down" : "up"}
        />
        <StatCard
          label="Market Coverage"
          value={
            summary.totalMarketCompanies > 0
              ? `${Math.round((summary.totalClients / summary.totalMarketCompanies) * 100)}%`
              : "0%"
          }
          comparison="of platform companies are your clients"
        />
      </div>

      {/* Row 1: Acquisition + Compliance Gaps */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client Acquisition Over Time */}
        <ChartWrapper
          title="Client Acquisition"
          description="Cumulative clients over time"
          downloadFilename="client-acquisition"
        >
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cumActive"
                  name="Active Clients"
                  stroke={CHART_COLORS.cyan}
                  fill={CHART_COLORS.cyan}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cumInvited"
                  name="Total Invited"
                  stroke={CHART_COLORS.slate}
                  fill={CHART_COLORS.slate}
                  fillOpacity={0.1}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">
              No client history yet.
            </p>
          )}
        </ChartWrapper>

        {/* Common Compliance Gaps */}
        <ChartWrapper
          title="Common Compliance Gaps"
          description="Most frequent gaps across your client base"
          downloadFilename="compliance-gaps"
        >
          {complianceGaps.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={complianceGaps.slice(0, 8).map((g) => ({
                  category: shortLabel(g.category),
                  "Total Gaps": g.totalGaps,
                  "Mandatory": g.mandatoryGaps,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="Total Gaps" fill={CHART_COLORS.amber} radius={[0, 4, 4, 0]} />
                <Bar dataKey="Mandatory" fill={CHART_COLORS.red} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">
              No compliance gaps found. Run compliance checks for your clients first.
            </p>
          )}
        </ChartWrapper>
      </div>

      {/* Row 2: Client vs Market Radar + Cost Comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Prevalence Radar */}
        <ChartWrapper
          title="Client Benefits vs Market"
          description="Benefit prevalence among your clients compared to the wider platform"
          downloadFilename="client-vs-market"
        >
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Radar
                  name="Your Clients"
                  dataKey="Your Clients"
                  stroke={CHART_COLORS.cyan}
                  fill={CHART_COLORS.cyan}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name="Market Average"
                  dataKey="Market Average"
                  stroke={CHART_COLORS.navy}
                  fill={CHART_COLORS.navy}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">
              Not enough data for comparison.
            </p>
          )}
        </ChartWrapper>

        {/* Cost Comparison */}
        <ChartWrapper
          title="Average Cost Comparison"
          description="Avg cost per employee: your clients vs wider market (EUR)"
          downloadFilename="cost-comparison"
        >
          {costComparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={costComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number | undefined) => value != null ? formatCurrency(value, "EUR") : "—"}
                />
                <Legend />
                <Bar
                  dataKey="Client Avg"
                  fill={CHART_COLORS.cyan}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Market Avg"
                  fill={CHART_COLORS.navy}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">
              Not enough cost data for comparison.
            </p>
          )}
        </ChartWrapper>
      </div>

      {/* Row 3: Benefit Trends Table + Compliance Gaps Table */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Benefit Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Benefit Trends</CardTitle>
            <CardDescription>
              Prevalence and cost across your {summary.totalClients} active clients
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Clients</TableHead>
                  <TableHead className="text-center">Prevalence</TableHead>
                  <TableHead className="text-center">Avg Cost</TableHead>
                  <TableHead className="text-center">Employer %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benefitTrends.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
                      No benefit data from clients yet.
                    </TableCell>
                  </TableRow>
                )}
                {benefitTrends.map((bt) => (
                  <TableRow key={bt.category}>
                    <TableCell className="font-medium">
                      {BENEFIT_CATEGORY_LABELS[bt.category] || bt.category}
                    </TableCell>
                    <TableCell className="text-center">{bt.clientCount}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          bt.prevalence >= 75
                            ? "success"
                            : bt.prevalence >= 50
                              ? "default"
                              : "secondary"
                        }
                      >
                        {bt.prevalence}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {bt.avgCost ? formatCurrency(bt.avgCost, "EUR") : "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm text-slate-600">
                      {bt.pctEmployerFunded}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Compliance Gap Details */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Gap Details</CardTitle>
            <CardDescription>
              {summary.totalComplianceGaps} gaps across your client base
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Total Gaps</TableHead>
                  <TableHead className="text-center">Mandatory</TableHead>
                  <TableHead className="text-center">Countries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceGaps.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-400">
                      No compliance gaps found.
                    </TableCell>
                  </TableRow>
                )}
                {complianceGaps.map((gap, i) => (
                  <TableRow key={gap.category}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: GAP_BAR_COLORS[i % GAP_BAR_COLORS.length] }}
                        />
                        {BENEFIT_CATEGORY_LABELS[gap.category] || gap.category}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{gap.totalGaps}</TableCell>
                    <TableCell className="text-center">
                      {gap.mandatoryGaps > 0 ? (
                        <Badge variant="destructive">{gap.mandatoryGaps}</Badge>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm text-slate-600">
                      {gap.countriesAffected}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

function shortLabel(category: string): string {
  const label = BENEFIT_CATEGORY_LABELS[category] || category;
  // Truncate long labels for chart axes
  if (label.length > 14) return label.slice(0, 12) + "...";
  return label;
}
