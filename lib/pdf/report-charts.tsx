"use client";

import { createRoot } from "react-dom/client";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { BenchmarkResult, CategoryBenchmark } from "@/lib/benchmarking-types";
import { BENEFIT_CATEGORY_LABELS, COUNTRY_LABELS, formatCurrency } from "@/lib/utils";
import type { ReportConfig, ReportCharts, CrossCountryData } from "./report-types";

const COLORS = [
  "#00B4D8", "#0077B6", "#023E8A", "#48CAE4", "#90E0EF",
  "#ADE8F4", "#CAF0F8", "#5B8DEE", "#7C3AED", "#F59E0B",
  "#10B981", "#EF4444", "#6366F1", "#8B5CF6", "#EC4899",
  "#94A3B8",
];

const COUNTRY_COLORS: Record<string, string> = {
  IE: "#00B4D8",
  GB: "#0077B6",
  US: "#023E8A",
  DE: "#48CAE4",
  FR: "#90E0EF",
  NL: "#5B8DEE",
  ES: "#7C3AED",
  PT: "#F59E0B",
  AE: "#10B981",
  SG: "#EF4444",
  AU: "#6366F1",
};

async function renderAndCapture(
  element: React.ReactElement,
  width = 800,
  height = 500
): Promise<string> {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.backgroundColor = "#ffffff";
  document.body.appendChild(container);

  const root = createRoot(container);

  // Render and wait for paint
  await new Promise<void>((resolve) => {
    root.render(element);
    // Give Recharts time to render SVG
    setTimeout(resolve, 800);
  });

  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(container, {
    backgroundColor: "#ffffff",
    scale: 2,
    logging: false,
  });
  const dataUrl = canvas.toDataURL("image/png");

  root.unmount();
  document.body.removeChild(container);

  return dataUrl;
}

function RadarChartComponent({
  categories,
  companyPosition,
}: {
  categories: BenchmarkResult["categories"];
  companyPosition: BenchmarkResult["companyPosition"];
}) {
  const radarData = categories.map((cat) => {
    const pos = companyPosition?.find((p) => p.category === cat.category);
    return {
      category:
        BENEFIT_CATEGORY_LABELS[cat.category]?.split("/")[0]?.trim() ||
        cat.category,
      marketPct: cat.prevalence,
      you: pos?.yourCost !== null && pos?.yourCost !== undefined ? 100 : 0,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={radarData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="category" fontSize={11} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} />
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
      </RadarChart>
    </ResponsiveContainer>
  );
}

function CostBarChartComponent({
  categories,
  companyPosition,
  currency,
}: {
  categories: BenchmarkResult["categories"];
  companyPosition: BenchmarkResult["companyPosition"];
  currency: string;
}) {
  const barData = categories
    .filter((cat) => cat.meetsMinimum && cat.costStats)
    .map((cat) => {
      const pos = companyPosition?.find((p) => p.category === cat.category);
      return {
        name:
          BENEFIT_CATEGORY_LABELS[cat.category]?.split(" ")[0] || cat.category,
        yourCost: pos?.yourCostConverted || 0,
        median: cat.costStats?.median || 0,
        p75: cat.costStats?.p75 || 0,
      };
    });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={barData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" fontSize={11} />
        <YAxis
          fontSize={11}
          tickFormatter={(v) => formatCurrency(v, currency)}
        />
        <Legend />
        <Bar dataKey="yourCost" name="Your Cost" fill="#00B4D8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="median" name="Median" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="p75" name="P75" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CostPieChartComponent({
  companyPosition,
}: {
  companyPosition: BenchmarkResult["companyPosition"];
}) {
  const pieData = companyPosition
    ? companyPosition
        .filter((p) => p.yourCostConverted && p.yourCostConverted > 0)
        .map((p) => ({
          name:
            BENEFIT_CATEGORY_LABELS[p.category]?.split("/")[0]?.trim() ||
            p.category,
          value: p.yourCostConverted || 0,
        }))
    : [];

  if (pieData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={160}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={({ name, percent }: any) =>
            `${name || ""} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          fontSize={11}
        >
          {pieData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

function FundingChartComponent({
  categories,
}: {
  categories: BenchmarkResult["categories"];
}) {
  const fundingData = categories
    .filter((cat) => cat.companyCount > 0)
    .map((cat) => ({
      name:
        BENEFIT_CATEGORY_LABELS[cat.category]?.split(" ")[0] || cat.category,
      employerPct: cat.pctEmployerFunded,
      employeePct: 100 - cat.pctEmployerFunded,
    }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={fundingData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" fontSize={11} />
        <YAxis fontSize={11} domain={[0, 100]} />
        <Legend />
        <Bar dataKey="employerPct" name="Employer %" fill="#00B4D8" stackId="a" />
        <Bar dataKey="employeePct" name="Employee %" fill="#e2e8f0" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CrossCountryChartComponent({
  crossCountryData,
  currency,
}: {
  crossCountryData: CrossCountryData;
  currency: string;
}) {
  const { countries, benchmarks } = crossCountryData;
  const allCategories = new Set<string>();
  for (const bms of Object.values(benchmarks)) {
    for (const bm of bms) allCategories.add(bm.category);
  }

  const groupedData = Array.from(allCategories).map((cat) => {
    const row: Record<string, string | number> = {
      name: BENEFIT_CATEGORY_LABELS[cat]?.split(" ")[0] || cat,
    };
    for (const c of countries) {
      const bm = benchmarks[c]?.find((b: CategoryBenchmark) => b.category === cat);
      row[c] = bm?.costStats?.median || 0;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={groupedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" fontSize={11} />
        <YAxis
          fontSize={11}
          tickFormatter={(v) => formatCurrency(v, currency)}
        />
        <Legend formatter={(v) => COUNTRY_LABELS[v] || v} />
        {countries.map((c, i) => (
          <Bar
            key={c}
            dataKey={c}
            fill={COUNTRY_COLORS[c] || `hsl(${i * 60}, 70%, 50%)`}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export async function captureCharts(
  singleData: BenchmarkResult | null,
  crossCountryData: CrossCountryData | null,
  config: ReportConfig
): Promise<ReportCharts> {
  const charts: ReportCharts = {
    radarChart: null,
    costBarChart: null,
    costPieChart: null,
    fundingChart: null,
    crossCountryChart: null,
  };

  const data = singleData;

  // Radar chart
  if (data && data.categories.length > 0) {
    try {
      charts.radarChart = await renderAndCapture(
        <RadarChartComponent
          categories={data.categories}
          companyPosition={data.companyPosition}
        />,
        800,
        500
      );
    } catch (e) {
      console.error("Failed to capture radar chart:", e);
    }
  }

  // Cost bar chart
  if (config.includeCostAnalysis && data && data.categories.length > 0) {
    try {
      charts.costBarChart = await renderAndCapture(
        <CostBarChartComponent
          categories={data.categories}
          companyPosition={data.companyPosition}
          currency={config.currency}
        />,
        800,
        450
      );
    } catch (e) {
      console.error("Failed to capture cost bar chart:", e);
    }

    // Cost pie chart
    if (data.companyPosition) {
      try {
        charts.costPieChart = await renderAndCapture(
          <CostPieChartComponent companyPosition={data.companyPosition} />,
          600,
          450
        );
      } catch (e) {
        console.error("Failed to capture cost pie chart:", e);
      }
    }

    // Funding chart
    try {
      charts.fundingChart = await renderAndCapture(
        <FundingChartComponent categories={data.categories} />,
        800,
        450
      );
    } catch (e) {
      console.error("Failed to capture funding chart:", e);
    }
  }

  // Cross-country chart
  if (
    config.reportType === "global" &&
    crossCountryData &&
    crossCountryData.countries.length >= 2
  ) {
    try {
      charts.crossCountryChart = await renderAndCapture(
        <CrossCountryChartComponent
          crossCountryData={crossCountryData}
          currency={config.currency}
        />,
        900,
        500
      );
    } catch (e) {
      console.error("Failed to capture cross-country chart:", e);
    }
  }

  return charts;
}
