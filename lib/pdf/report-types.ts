import type { BenchmarkResult, CategoryBenchmark } from "@/lib/benchmarking-types";

export interface ReportConfig {
  reportType: "single" | "global";
  country: string;
  countries: string[];
  includeCostAnalysis: boolean;
  includePlatformBenchmarks: boolean;
  includeCompliance: boolean;
  currency: string;
  companyName: string;
  companyIndustry: string;
}

export interface ComplianceReportData {
  country: string;
  results: Array<{
    status: string;
    gap: string | null;
    recommendation: string | null;
    requirement: {
      benefitCategory: string;
      requirementType: string;
      description: string;
      minimumLevel: string | null;
      legalReference: string | null;
    };
  }>;
  limits: Array<{
    limitType: string;
    benefitCategory: string | null;
    description: string;
    limitValue: string;
    currency: string | null;
    taxYear: string;
    legalReference: string | null;
  }>;
  summary: {
    totalRequirements: number;
    compliant: number;
    nonCompliant: number;
    partiallyCompliant: number;
    mandatoryIssues: number;
  };
}

export interface ReportCharts {
  radarChart: string | null;
  costBarChart: string | null;
  costPieChart: string | null;
  fundingChart: string | null;
  crossCountryChart: string | null;
}

export interface CrossCountryData {
  countries: string[];
  targetCurrency: string;
  benchmarks: Record<string, CategoryBenchmark[]>;
}

export interface ReportData {
  config: ReportConfig;
  singleCountryData: BenchmarkResult | null;
  crossIndustryData: BenchmarkResult | null;
  allCountryData: Record<string, BenchmarkResult>;
  crossCountryData: CrossCountryData | null;
  charts: ReportCharts;
  findings: string[];
  globalFindings: string[];
  recommendations: string[];
  complianceData: ComplianceReportData | null;
  generatedAt: string;
}
