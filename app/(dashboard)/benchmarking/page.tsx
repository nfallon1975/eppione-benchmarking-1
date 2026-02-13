"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CountrySelector } from "@/components/benchmarks/country-selector";
import { CurrencyToggle } from "@/components/benchmarks/currency-toggle";
import { BenchmarkDateStamp } from "@/components/benchmarks/benchmark-date-stamp";
import { BenchmarkOverviewTab } from "@/components/benchmarks/benchmark-overview-tab";
import { BenchmarkDetailedTab } from "@/components/benchmarks/benchmark-detailed-tab";
import { BenchmarkCostTab } from "@/components/benchmarks/benchmark-cost-tab";
import { BenchmarkPlatformTab } from "@/components/benchmarks/benchmark-platform-tab";
import { BenchmarkCrossCountryTab } from "@/components/benchmarks/benchmark-cross-country-tab";
import { BenchmarkGlobalTab } from "@/components/benchmarks/benchmark-global-tab";
import { ReportModal } from "@/components/benchmarks/report-modal";
import { FileText, CheckCircle2, AlertTriangle, Info, ChevronDown, ExternalLink } from "lucide-react";
import type { BenchmarkResult } from "@/lib/benchmarking-types";
import { COUNTRY_LABELS } from "@/lib/utils";

export default function BenchmarkingPage() {
  useSession(); // ensure authenticated
  const [country, setCountry] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [industry, setIndustry] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [localCurrency, setLocalCurrency] = useState("EUR");
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMultiCountry, setIsMultiCountry] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // Load company info on mount
  useEffect(() => {
    async function loadCompany() {
      try {
        const res = await fetch("/api/companies");
        if (!res.ok) return;
        const data = await res.json();

        // Determine countries
        const companyCountries: string[] = [];
        if (data.countryProfiles && data.countryProfiles.length > 0) {
          companyCountries.push(...data.countryProfiles.map((p: { country: string }) => p.country));
        } else {
          companyCountries.push(data.country);
        }

        setCountries(companyCountries);
        setCountry(companyCountries[0] || data.country);
        setIndustry(data.industry || "");
        setIsMultiCountry(companyCountries.length > 1);
        setCompanyName(data.name || "");

        // Set local currency from country config
        try {
          const configRes = await fetch(`/api/country-config?country=${companyCountries[0] || data.country}`);
          if (configRes.ok) {
            const config = await configRes.json();
            setLocalCurrency(config.currency || "EUR");
            setCurrency(config.currency || "EUR");
          }
        } catch {
          // fallback to EUR
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadCompany();
  }, []);

  // Fetch benchmark data
  const fetchBenchmarks = useCallback(async () => {
    if (!country) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ country, currency });
      if (industry) params.set("industry", industry);
      const res = await fetch(`/api/benchmarking?${params}`);
      if (res.ok) {
        setBenchmarkData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [country, industry, currency]);

  useEffect(() => {
    fetchBenchmarks();
  }, [fetchBenchmarks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Benchmarking</h1>
        <p className="mt-1 text-slate-500">
          Compare your benefits against the market with detailed analytics
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {countries.length > 1 && (
          <CountrySelector
            value={country}
            onChange={setCountry}
            countries={countries}
          />
        )}
        <CurrencyToggle
          value={currency}
          onChange={setCurrency}
          localCurrency={localCurrency}
        />
        {benchmarkData && (
          <BenchmarkDateStamp
            dataAsOf={benchmarkData.dataAsOf}
            totalCompanies={benchmarkData.totalCompanies}
          />
        )}
        {benchmarkData && benchmarkData.totalCompanies > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReportModalOpen(true)}
          >
            <FileText className="mr-1.5 h-4 w-4" />
            Download Report
          </Button>
        )}
      </div>

      {loading && (
        <div className="py-12 text-center text-sm text-slate-500">
          Loading benchmark data...
        </div>
      )}

      {/* Data quality banner */}
      {!loading && benchmarkData && benchmarkData.dataQuality && benchmarkData.categories.length > 0 && (
        <div
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
            benchmarkData.dataQuality === "industry"
              ? "border-green-200 bg-green-50 text-green-800"
              : benchmarkData.dataQuality === "cross_industry"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          {benchmarkData.dataQuality === "industry" && (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          {benchmarkData.dataQuality === "cross_industry" && (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          {benchmarkData.dataQuality === "reference" && (
            <Info className="h-4 w-4 shrink-0" />
          )}
          <span>{benchmarkData.dataQualityMessage}</span>
        </div>
      )}

      {/* Reference Data Sources */}
      {!loading && benchmarkData && benchmarkData.dataQuality === "reference" && benchmarkData.categories.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <button
            onClick={() => setSourcesOpen(!sourcesOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <span>Data Sources & Confidence</span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${sourcesOpen ? "rotate-180" : ""}`}
            />
          </button>
          {sourcesOpen && (
            <div className="border-t px-4 pb-4">
              <div className="mt-3 space-y-3">
                {benchmarkData.categories
                  .filter((c) => c.sourceDescription || c.confidenceLevel)
                  .map((cat) => (
                    <div key={cat.category} className="flex items-start gap-3 text-sm">
                      <div className="w-36 shrink-0">
                        <span className="font-medium text-slate-700">{cat.categoryLabel}</span>
                        {cat.confidenceLevel && (
                          <span
                            className={`ml-2 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                              cat.confidenceLevel === "HIGH"
                                ? "border-green-200 bg-green-50 text-green-700"
                                : cat.confidenceLevel === "MEDIUM"
                                  ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                                  : "border-red-200 bg-red-50 text-red-700"
                            }`}
                          >
                            {cat.confidenceLevel}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {cat.sourceDescription && (
                          <p className="text-slate-600">{cat.sourceDescription}</p>
                        )}
                        {cat.sourceUrls && cat.sourceUrls.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-2">
                            {cat.sourceUrls.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {(() => { try { return new URL(url).hostname.replace("www.", ""); } catch { return url; } })()}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && benchmarkData && (benchmarkData.totalCompanies > 0 || benchmarkData.dataQuality === "reference") && benchmarkData.categories.length > 0 && (
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed</TabsTrigger>
            <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
            {benchmarkData.dataQuality !== "reference" && (
              <TabsTrigger value="platform">Platform</TabsTrigger>
            )}
            {isMultiCountry && benchmarkData.dataQuality !== "reference" && (
              <TabsTrigger value="cross-country">Cross-Country</TabsTrigger>
            )}
            {benchmarkData.dataQuality !== "reference" && (
              <TabsTrigger value="global">Industry</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview">
            <BenchmarkOverviewTab data={benchmarkData} countries={countries} />
          </TabsContent>

          <TabsContent value="detailed">
            <BenchmarkDetailedTab data={benchmarkData} />
          </TabsContent>

          <TabsContent value="costs">
            <BenchmarkCostTab data={benchmarkData} />
          </TabsContent>

          {benchmarkData.dataQuality !== "reference" && (
            <TabsContent value="platform">
              <BenchmarkPlatformTab data={benchmarkData} />
            </TabsContent>
          )}

          {isMultiCountry && benchmarkData.dataQuality !== "reference" && (
            <TabsContent value="cross-country">
              <BenchmarkCrossCountryTab currency={currency} />
            </TabsContent>
          )}

          {benchmarkData.dataQuality !== "reference" && (
            <TabsContent value="global">
              <BenchmarkGlobalTab
                country={country}
                industry={industry}
                currency={currency}
              />
            </TabsContent>
          )}
        </Tabs>
      )}

      {!loading && benchmarkData && benchmarkData.totalCompanies === 0 && benchmarkData.dataQuality !== "reference" && benchmarkData.categories.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-lg font-medium text-slate-700">No benchmark data available</p>
          <p className="mt-2 text-sm text-slate-500">
            Data will appear as more companies in {COUNTRY_LABELS[country] || country} contribute
            to the benchmarking survey.
          </p>
        </div>
      )}

      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        countries={countries}
        country={country}
        industry={industry}
        currency={currency}
        companyName={companyName}
      />
    </div>
  );
}
