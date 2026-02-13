"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Globe, Loader2 } from "lucide-react";
import { COUNTRY_LABELS } from "@/lib/utils";
import { pdf } from "@react-pdf/renderer";
import type { BenchmarkResult } from "@/lib/benchmarking-types";
import type { ReportConfig, ReportData, CrossCountryData, ComplianceReportData } from "@/lib/pdf/report-types";
import { captureCharts } from "@/lib/pdf/report-charts";
import { generateFindings, generateGlobalFindings, generateRecommendations } from "@/lib/pdf/report-findings";
import { BenchmarkReportDocument } from "@/lib/pdf/report-document";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  countries: string[];
  country: string;
  industry: string;
  currency: string;
  companyName: string;
}

const STATUS_MESSAGES = [
  "Fetching benchmark data...",
  "Capturing charts...",
  "Generating insights...",
  "Building PDF document...",
  "Finalising report...",
];

export function ReportModal({
  open,
  onClose,
  countries,
  country,
  industry,
  currency,
  companyName,
}: ReportModalProps) {
  const [reportType, setReportType] = useState<"single" | "global">(
    countries.length > 1 ? "single" : "single"
  );
  const [selectedCountry, setSelectedCountry] = useState(country);
  const [includeCost, setIncludeCost] = useState(true);
  const [includePlatform, setIncludePlatform] = useState(true);
  const [includeCompliance, setIncludeCompliance] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isGlobal = reportType === "global";

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setStatusIdx(0);

    try {
      const config: ReportConfig = {
        reportType,
        country: isGlobal ? countries[0] : selectedCountry,
        countries: isGlobal ? countries : [selectedCountry],
        includeCostAnalysis: includeCost,
        includePlatformBenchmarks: includePlatform,
        includeCompliance: includeCompliance,
        currency,
        companyName,
        companyIndustry: industry,
      };

      // 1. Fetch benchmark data
      setStatusIdx(0);
      let singleCountryData: BenchmarkResult | null = null;
      const allCountryData: Record<string, BenchmarkResult> = {};
      let crossCountryData: CrossCountryData | null = null;

      if (isGlobal) {
        // Fetch all countries
        for (const c of countries) {
          const params = new URLSearchParams({ country: c, currency });
          if (industry) params.set("industry", industry);
          const res = await fetch(`/api/benchmarking?${params}`);
          if (res.ok) {
            allCountryData[c] = await res.json();
          }
        }
        // Use first country as primary
        singleCountryData = allCountryData[countries[0]] || null;

        // Fetch cross-country data
        const crossRes = await fetch(`/api/benchmarking/cross-country?currency=${currency}`);
        if (crossRes.ok) {
          crossCountryData = await crossRes.json();
        }
      } else {
        const params = new URLSearchParams({ country: selectedCountry, currency });
        if (industry) params.set("industry", industry);
        const res = await fetch(`/api/benchmarking?${params}`);
        if (res.ok) {
          singleCountryData = await res.json();
          allCountryData[selectedCountry] = singleCountryData!;
        }
      }

      if (!singleCountryData) {
        setError("No benchmark data available for the selected market.");
        setGenerating(false);
        return;
      }

      // 2. Capture charts
      setStatusIdx(1);
      const charts = await captureCharts(singleCountryData, crossCountryData, config);

      // 2b. Fetch compliance data if enabled
      let complianceData: ComplianceReportData | null = null;
      if (includeCompliance) {
        const complianceCountry = isGlobal ? countries[0] : selectedCountry;
        try {
          // Trigger a fresh check
          const checkRes = await fetch("/api/compliance/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country: complianceCountry }),
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            // Also fetch limits
            const limitsRes = await fetch(`/api/compliance/results?country=${complianceCountry}`);
            const limitsData = limitsRes.ok ? await limitsRes.json() : { results: [], limits: [] };
            complianceData = {
              country: complianceCountry,
              results: (limitsData.results || []).map((r: Record<string, unknown>) => ({
                status: r.status,
                gap: r.gap,
                recommendation: r.recommendation,
                requirement: r.requirement,
              })),
              limits: limitsData.limits || [],
              summary: checkData.summary || {
                totalRequirements: 0,
                compliant: 0,
                nonCompliant: 0,
                partiallyCompliant: 0,
                mandatoryIssues: 0,
              },
            };
          }
        } catch (err) {
          console.error("Failed to fetch compliance data for report:", err);
        }
      }

      // 3. Generate findings
      setStatusIdx(2);
      const findings = generateFindings(singleCountryData, companyName);
      const globalFindings = isGlobal ? generateGlobalFindings(allCountryData) : [];
      const recommendations = isGlobal ? generateRecommendations(allCountryData) : [];

      // 4. Build PDF
      setStatusIdx(3);
      const reportData: ReportData = {
        config,
        singleCountryData,
        allCountryData,
        crossCountryData,
        charts,
        findings,
        globalFindings,
        recommendations,
        complianceData,
        generatedAt: new Date().toISOString(),
      };

      setStatusIdx(4);
      const blob = await pdf(<BenchmarkReportDocument data={reportData} />).toBlob();

      // 5. Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      const countryStr = isGlobal ? "global" : selectedCountry.toLowerCase();
      link.download = `eppione-benchmarking-${countryStr}-${dateStr}.pdf`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Benchmarking Report</DialogTitle>
          <DialogDescription>
            Generate a professional PDF report of your benchmarking analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Report type selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Report Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReportType("single")}
                disabled={generating}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                  reportType === "single"
                    ? "border-[#00B4D8] bg-[#00B4D8]/10 text-[#00B4D8]"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FileText className="h-4 w-4" />
                Single Country
              </button>
              <button
                type="button"
                onClick={() => setReportType("global")}
                disabled={generating || countries.length < 2}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                  reportType === "global"
                    ? "border-[#00B4D8] bg-[#00B4D8]/10 text-[#00B4D8]"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                } ${countries.length < 2 ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <Globe className="h-4 w-4" />
                Global
              </button>
            </div>
            {countries.length < 2 && (
              <p className="text-xs text-slate-400">
                Global reports require benefits data in 2+ countries.
              </p>
            )}
          </div>

          {/* Country selector (single mode only) */}
          {!isGlobal && countries.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Country</Label>
              <Select
                value={selectedCountry}
                onValueChange={setSelectedCountry}
                disabled={generating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {COUNTRY_LABELS[c] || c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Global shows included countries */}
          {isGlobal && (
            <div className="space-y-1">
              <Label className="text-sm font-medium">Included Markets</Label>
              <p className="text-sm text-slate-500">
                {countries.map((c) => COUNTRY_LABELS[c] || c).join(", ")}
              </p>
            </div>
          )}

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="include-cost" className="text-sm">
                Include Cost Analysis
              </Label>
              <Switch
                id="include-cost"
                checked={includeCost}
                onCheckedChange={setIncludeCost}
                disabled={generating}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="include-platform" className="text-sm">
                Include Platform Benchmarks
              </Label>
              <Switch
                id="include-platform"
                checked={includePlatform}
                onCheckedChange={setIncludePlatform}
                disabled={generating}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="include-compliance" className="text-sm">
                Include Compliance Summary
              </Label>
              <Switch
                id="include-compliance"
                checked={includeCompliance}
                onCheckedChange={setIncludeCompliance}
                disabled={generating}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {STATUS_MESSAGES[statusIdx] || "Generating..."}
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
