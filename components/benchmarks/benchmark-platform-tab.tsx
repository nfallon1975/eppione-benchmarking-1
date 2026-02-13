"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ChartWrapper } from "./chart-wrapper";
import { StatCard } from "./stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BenchmarkResult } from "@/lib/benchmarking-types";
import { PLATFORM_TYPE_LABELS, FEE_MODEL_LABELS, formatCurrency } from "@/lib/utils";

interface BenchmarkPlatformTabProps {
  data: BenchmarkResult;
}

const COLORS = ["#00B4D8", "#0077B6", "#48CAE4", "#90E0EF", "#5B8DEE", "#94A3B8"];

export function BenchmarkPlatformTab({ data }: BenchmarkPlatformTabProps) {
  const { platform, targetCurrency } = data;

  const typeData = platform.platformTypes.map((t) => ({
    name: PLATFORM_TYPE_LABELS[t.type] || t.type,
    value: t.count,
    percentage: t.percentage,
  }));

  const feeModelData = platform.feeModels.map((f) => ({
    name: FEE_MODEL_LABELS[f.model] || f.model,
    value: f.count,
    percentage: f.percentage,
  }));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Platform Adoption"
          value={`${platform.adoptionRate}%`}
          comparison={`${platform.totalCompanies} companies in dataset`}
        />
        <StatCard
          label="Median Platform Fee"
          value={
            platform.avgFee
              ? formatCurrency(platform.avgFee.median, targetCurrency)
              : "Insufficient data"
          }
          comparison={
            platform.avgFee
              ? `Range: ${formatCurrency(platform.avgFee.min, targetCurrency)} - ${formatCurrency(platform.avgFee.max, targetCurrency)}`
              : undefined
          }
        />
        <StatCard
          label="Median Satisfaction"
          value={
            platform.satisfactionStats
              ? `${platform.satisfactionStats.median}/10`
              : "Insufficient data"
          }
          comparison={
            platform.satisfactionStats
              ? `Range: ${platform.satisfactionStats.min} - ${platform.satisfactionStats.max}`
              : undefined
          }
        />
        <StatCard
          label="Data Quality"
          value={platform.meetsMinimum ? "Sufficient" : "Below threshold"}
          comparison={platform.meetsMinimum ? "5+ companies" : "< 5 companies"}
        />
      </div>

      {!platform.meetsMinimum && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-slate-500">
              Insufficient data for detailed platform analytics. At least 5 companies are needed.
            </p>
          </CardContent>
        </Card>
      )}

      {platform.meetsMinimum && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Platform type breakdown */}
          <ChartWrapper
            title="Platform Types"
            description="Distribution of platform types in use"
            downloadFilename="platform-types"
          >
            {typeData.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No platform type data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={({ name, percentage }: any) => `${name || ""} (${percentage ?? 0}%)`}
                    fontSize={11}
                  >
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartWrapper>

          {/* Fee model breakdown */}
          <ChartWrapper
            title="Fee Models"
            description="How companies pay for their platforms"
            downloadFilename="fee-models"
          >
            {feeModelData.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No fee model data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={feeModelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={140} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Companies" fill="#00B4D8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartWrapper>
        </div>
      )}

      {/* Fee comparison */}
      {platform.avgFee && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Fee Benchmarks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 text-center text-sm">
              <div>
                <p className="text-slate-500">Min</p>
                <p className="font-semibold">{formatCurrency(platform.avgFee.min, targetCurrency)}</p>
              </div>
              <div>
                <p className="text-slate-500">P25</p>
                <p className="font-semibold">{formatCurrency(platform.avgFee.p25, targetCurrency)}</p>
              </div>
              <div>
                <p className="text-slate-500">Median</p>
                <p className="text-lg font-bold text-eppione-cyan">
                  {formatCurrency(platform.avgFee.median, targetCurrency)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">P75</p>
                <p className="font-semibold">{formatCurrency(platform.avgFee.p75, targetCurrency)}</p>
              </div>
              <div>
                <p className="text-slate-500">Max</p>
                <p className="font-semibold">{formatCurrency(platform.avgFee.max, targetCurrency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
