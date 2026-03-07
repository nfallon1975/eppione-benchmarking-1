"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CountryPicker } from "@/components/ui/country-picker";
import { COUNTRY_LABELS, BENEFIT_CATEGORY_LABELS } from "@/lib/utils";
import {
  Loader2,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Upload,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BaselineDataSource {
  id: string;
  name: string;
  publisher: string;
  country: string;
  year: number;
  sampleSize: number | null;
  sourceUrl: string | null;
  sourceType: string;
  isActive: boolean;
  notes: string | null;
  licenseNotes: string;
  createdAt: string;
  importedBy: { id: string; name: string | null; email: string } | null;
  _count: { benchmarks: number };
}

interface BaselineBenchmark {
  id: string;
  sourceId: string;
  country: string;
  industry: string | null;
  industryNACE: string | null;
  companySize: string | null;
  salaryBand: string | null;
  benefitCategory: string;
  metricType: string;
  metricLabel: string;
  value: number;
  unit: string;
  currency: string | null;
  percentile25: number | null;
  percentile75: number | null;
  notes: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Enum option arrays
// ---------------------------------------------------------------------------

const SOURCE_TYPES = [
  { value: "INDUSTRY_SURVEY", label: "Industry Survey" },
  { value: "INSURER_REPORT", label: "Insurer Report" },
  { value: "GOVERNMENT_DATA", label: "Government Data" },
  { value: "CONSULTANCY_REPORT", label: "Consultancy Report" },
  { value: "TRADE_BODY", label: "Trade Body" },
  { value: "OTHER", label: "Other" },
] as const;

const BENEFIT_CATEGORIES = [
  "HEALTH",
  "LIFE",
  "INCOME_PROTECTION",
  "CRITICAL_ILLNESS",
  "DENTAL",
  "PENSION",
  "WELLBEING",
  "EAP",
  "OTHER",
  "CASH_PLAN",
  "TRAVEL",
  "OPTICAL",
] as const;

const METRIC_TYPES = [
  { value: "PREVALENCE", label: "Prevalence" },
  { value: "MEDIAN_CONTRIBUTION_RATE", label: "Median Contribution Rate" },
  { value: "AVERAGE_CONTRIBUTION_RATE", label: "Average Contribution Rate" },
  { value: "MEDIAN_COST_PER_EMPLOYEE", label: "Median Cost per Employee" },
  { value: "AVERAGE_COST_PER_EMPLOYEE", label: "Average Cost per Employee" },
  { value: "PLAN_TYPE_SPLIT_DC", label: "Plan Type Split (DC)" },
  { value: "PLAN_TYPE_SPLIT_DB", label: "Plan Type Split (DB)" },
  { value: "DEATH_BENEFIT_MULTIPLE", label: "Death Benefit Multiple" },
  { value: "EMPLOYER_FUNDING_RATE", label: "Employer Funding Rate" },
  { value: "COVER_LEVEL_MEDIAN", label: "Cover Level Median" },
  { value: "PLATFORM_ADOPTION_RATE", label: "Platform Adoption Rate" },
  { value: "SPOUSE_COVER_PREVALENCE", label: "Spouse Cover Prevalence" },
  { value: "DEPENDENT_COVER_PREVALENCE", label: "Dependent Cover Prevalence" },
  { value: "REPLACEMENT_RATIO", label: "Replacement Ratio" },
  { value: "CUSTOM", label: "Custom" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSourceStale(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return currentYear - year > 3;
}

function sourceTypeLabel(val: string): string {
  return SOURCE_TYPES.find((s) => s.value === val)?.label ?? val;
}

function metricTypeLabel(val: string): string {
  return METRIC_TYPES.find((m) => m.value === val)?.label ?? val;
}

function countryLabel(code: string): string {
  return (COUNTRY_LABELS as Record<string, string>)[code] ?? code;
}

function categoryLabel(cat: string): string {
  return BENEFIT_CATEGORY_LABELS[cat] ?? cat;
}

// ---------------------------------------------------------------------------
// Empty form states
// ---------------------------------------------------------------------------

const EMPTY_SOURCE_FORM = {
  name: "",
  publisher: "",
  country: "",
  year: new Date().getFullYear(),
  sampleSize: "",
  sourceUrl: "",
  sourceType: "",
  notes: "",
  licenseNotes: "",
};

const EMPTY_BENCHMARK_FORM = {
  country: "",
  benefitCategory: "",
  metricType: "",
  metricLabel: "",
  value: "",
  unit: "",
  currency: "",
  industry: "",
  salaryBand: "",
  percentile25: "",
  percentile75: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function BaselineDataPage() {
  const { data: session } = useSession();

  // Source list
  const [sources, setSources] = useState<BaselineDataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCountry, setFilterCountry] = useState("");

  // Expanded source & its benchmarks
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [benchmarks, setBenchmarks] = useState<BaselineBenchmark[]>([]);
  const [benchmarksLoading, setBenchmarksLoading] = useState(false);

  // Add source dialog
  const [showAddSource, setShowAddSource] = useState(false);
  const [sourceForm, setSourceForm] = useState({ ...EMPTY_SOURCE_FORM });
  const [sourceSubmitting, setSourceSubmitting] = useState(false);

  // Add benchmark dialog
  const [showAddBenchmark, setShowAddBenchmark] = useState(false);
  const [benchmarkForm, setBenchmarkForm] = useState({ ...EMPTY_BENCHMARK_FORM });
  const [benchmarkSubmitting, setBenchmarkSubmitting] = useState(false);

  // Bulk import
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importPreview, setImportPreview] = useState<Record<string, unknown>[] | null>(null);
  const [importError, setImportError] = useState("");
  const [importSubmitting, setImportSubmitting] = useState(false);

  // Action in progress
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // --------------------------------------------------
  // Fetch sources
  // --------------------------------------------------
  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterCountry ? `?country=${filterCountry}` : "";
      const res = await fetch(`/api/admin/baseline${params}`);
      if (res.ok) setSources(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterCountry]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // --------------------------------------------------
  // Fetch benchmarks for expanded source
  // --------------------------------------------------
  const fetchBenchmarks = useCallback(async (sourceId: string) => {
    setBenchmarksLoading(true);
    try {
      const res = await fetch(`/api/admin/baseline/${sourceId}/benchmarks`);
      if (res.ok) setBenchmarks(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setBenchmarksLoading(false);
    }
  }, []);

  function toggleExpandSource(sourceId: string) {
    if (expandedSourceId === sourceId) {
      setExpandedSourceId(null);
      setBenchmarks([]);
    } else {
      setExpandedSourceId(sourceId);
      fetchBenchmarks(sourceId);
    }
  }

  // --------------------------------------------------
  // Toggle active
  // --------------------------------------------------
  async function handleToggleActive(source: BaselineDataSource) {
    setActionLoading(source.id);
    try {
      const res = await fetch(`/api/admin/baseline/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !source.isActive }),
      });
      if (res.ok) await fetchSources();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  // --------------------------------------------------
  // Delete source
  // --------------------------------------------------
  async function handleDeleteSource(sourceId: string) {
    if (!confirm("Are you sure you want to delete this data source and all its benchmarks? This cannot be undone.")) return;
    setActionLoading(sourceId);
    try {
      const res = await fetch(`/api/admin/baseline/${sourceId}`, { method: "DELETE" });
      if (res.ok) {
        if (expandedSourceId === sourceId) {
          setExpandedSourceId(null);
          setBenchmarks([]);
        }
        await fetchSources();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  // --------------------------------------------------
  // Copy to new year
  // --------------------------------------------------
  async function handleCopySource(sourceId: string) {
    setActionLoading(sourceId);
    try {
      const res = await fetch(`/api/admin/baseline/${sourceId}/copy`, { method: "POST" });
      if (res.ok) await fetchSources();
      else {
        const err = await res.json();
        alert(`Copy failed: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  // --------------------------------------------------
  // Add source
  // --------------------------------------------------
  async function handleAddSource() {
    setSourceSubmitting(true);
    try {
      const res = await fetch("/api/admin/baseline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sourceForm.name,
          publisher: sourceForm.publisher,
          country: sourceForm.country,
          year: Number(sourceForm.year),
          sampleSize: sourceForm.sampleSize ? Number(sourceForm.sampleSize) : null,
          sourceUrl: sourceForm.sourceUrl || null,
          sourceType: sourceForm.sourceType,
          notes: sourceForm.notes || null,
          licenseNotes: sourceForm.licenseNotes,
        }),
      });
      if (res.ok) {
        setShowAddSource(false);
        setSourceForm({ ...EMPTY_SOURCE_FORM });
        await fetchSources();
      } else {
        const err = await res.json();
        alert(`Failed to create source: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create source");
    } finally {
      setSourceSubmitting(false);
    }
  }

  // --------------------------------------------------
  // Add benchmark
  // --------------------------------------------------
  async function handleAddBenchmark() {
    if (!expandedSourceId) return;
    setBenchmarkSubmitting(true);
    try {
      const res = await fetch(`/api/admin/baseline/${expandedSourceId}/benchmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: benchmarkForm.country,
          benefitCategory: benchmarkForm.benefitCategory,
          metricType: benchmarkForm.metricType,
          metricLabel: benchmarkForm.metricLabel,
          value: Number(benchmarkForm.value),
          unit: benchmarkForm.unit,
          currency: benchmarkForm.currency || null,
          industry: benchmarkForm.industry || null,
          salaryBand: benchmarkForm.salaryBand || null,
          percentile25: benchmarkForm.percentile25 ? Number(benchmarkForm.percentile25) : null,
          percentile75: benchmarkForm.percentile75 ? Number(benchmarkForm.percentile75) : null,
          notes: benchmarkForm.notes || null,
        }),
      });
      if (res.ok) {
        setShowAddBenchmark(false);
        setBenchmarkForm({ ...EMPTY_BENCHMARK_FORM });
        await fetchBenchmarks(expandedSourceId);
        await fetchSources(); // refresh count
      } else {
        const err = await res.json();
        alert(`Failed to add benchmark: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBenchmarkSubmitting(false);
    }
  }

  // --------------------------------------------------
  // Delete benchmark
  // --------------------------------------------------
  async function handleDeleteBenchmark(benchmarkId: string) {
    if (!expandedSourceId) return;
    if (!confirm("Delete this data point?")) return;
    try {
      const res = await fetch(
        `/api/admin/baseline/${expandedSourceId}/benchmarks/${benchmarkId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        await fetchBenchmarks(expandedSourceId);
        await fetchSources();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // --------------------------------------------------
  // Bulk import
  // --------------------------------------------------
  function handleParseImportJson() {
    setImportError("");
    setImportPreview(null);
    try {
      const parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) {
        setImportError("Input must be a JSON array");
        return;
      }
      if (parsed.length === 0) {
        setImportError("Array is empty");
        return;
      }
      setImportPreview(parsed);
    } catch {
      setImportError("Invalid JSON");
    }
  }

  async function handleImportSubmit() {
    if (!importPreview || !expandedSourceId) return;
    setImportSubmitting(true);
    try {
      const res = await fetch("/api/admin/baseline/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: expandedSourceId, benchmarks: importPreview }),
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Successfully imported ${result.imported} data points.`);
        setShowImport(false);
        setImportJson("");
        setImportPreview(null);
        await fetchBenchmarks(expandedSourceId);
        await fetchSources();
      } else {
        const err = await res.json();
        alert(`Import failed: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Import failed");
    } finally {
      setImportSubmitting(false);
    }
  }

  // --------------------------------------------------
  // Coverage summary
  // --------------------------------------------------
  const coverageSummary = sources.reduce<Record<string, number>>((acc, s) => {
    acc[s.country] = (acc[s.country] ?? 0) + s._count.benchmarks;
    return acc;
  }, {});

  // --------------------------------------------------
  // Guards
  // --------------------------------------------------
  if (!session) {
    return <div className="py-12 text-center text-sm text-slate-500">Loading...</div>;
  }

  if (session.user?.role !== "ADMIN") {
    return <p className="p-8 text-slate-500">Admin access required.</p>;
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Baseline Data Management</h1>
        <p className="mt-1 text-slate-500">
          Manage baseline benchmark data sources and their data points
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Total Sources</p>
          <p className="text-2xl font-bold text-slate-900">{sources.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Active Sources</p>
          <p className="text-2xl font-bold text-green-600">
            {sources.filter((s) => s.isActive).length}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Total Data Points</p>
          <p className="text-2xl font-bold text-blue-600">
            {sources.reduce((sum, s) => sum + s._count.benchmarks, 0)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Countries Covered</p>
          <p className="text-2xl font-bold text-slate-900">
            {Object.keys(coverageSummary).length}
          </p>
        </div>
      </div>

      {/* Coverage Summary */}
      {Object.keys(coverageSummary).length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Coverage by Country</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(coverageSummary)
              .sort((a, b) => b[1] - a[1])
              .map(([code, count]) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {countryLabel(code)}
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                    {count}
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Filter by Country
          </label>
          <CountryPicker value={filterCountry} onChange={setFilterCountry} />
        </div>
        <Button onClick={() => setShowAddSource(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Source
        </Button>
      </div>

      {/* Source Table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Loading baseline sources...
        </div>
      ) : sources.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-lg font-medium text-slate-700">No baseline data sources found</p>
          <p className="mt-2 text-sm text-slate-500">
            Click &ldquo;Add Source&rdquo; to create your first baseline data source.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600 w-8" />
                <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 font-medium text-slate-600">Publisher</th>
                <th className="px-4 py-3 font-medium text-slate-600">Country</th>
                <th className="px-4 py-3 font-medium text-slate-600">Year</th>
                <th className="px-4 py-3 font-medium text-slate-600">Sample Size</th>
                <th className="px-4 py-3 font-medium text-slate-600">Source Type</th>
                <th className="px-4 py-3 font-medium text-slate-600">Data Points</th>
                <th className="px-4 py-3 font-medium text-slate-600">Active</th>
                <th className="px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <>
                  <tr
                    key={source.id}
                    className={`border-b last:border-0 cursor-pointer hover:bg-slate-50 ${
                      expandedSourceId === source.id ? "bg-slate-50" : ""
                    }`}
                    onClick={() => toggleExpandSource(source.id)}
                  >
                    <td className="px-4 py-3">
                      {expandedSourceId === source.id ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {source.name}
                      {isSourceStale(source.year) && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          <AlertTriangle className="h-3 w-3" />
                          Stale ({source.year})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{source.publisher}</td>
                    <td className="px-4 py-3">{countryLabel(source.country)}</td>
                    <td className="px-4 py-3">{source.year}</td>
                    <td className="px-4 py-3">
                      {source.sampleSize != null ? source.sampleSize.toLocaleString() : (
                        <span className="text-slate-400">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {sourceTypeLabel(source.sourceType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{source._count.benchmarks}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={source.isActive}
                        onCheckedChange={() => handleToggleActive(source)}
                        disabled={actionLoading === source.id}
                      />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Copy to new year"
                          disabled={actionLoading === source.id}
                          onClick={() => handleCopySource(source.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete source"
                          disabled={actionLoading === source.id}
                          onClick={() => handleDeleteSource(source.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded benchmarks panel */}
                  {expandedSourceId === source.id && (
                    <tr key={`${source.id}-detail`}>
                      <td colSpan={10} className="bg-slate-50 px-6 py-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-700">
                              Data Points for &ldquo;{source.name}&rdquo;
                            </h3>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => setShowImport(true)}
                              >
                                <Upload className="h-3 w-3" />
                                Bulk Import
                              </Button>
                              <Button
                                size="sm"
                                className="gap-1"
                                onClick={() => {
                                  setBenchmarkForm({
                                    ...EMPTY_BENCHMARK_FORM,
                                    country: source.country,
                                  });
                                  setShowAddBenchmark(true);
                                }}
                              >
                                <Plus className="h-3 w-3" />
                                Add Data Point
                              </Button>
                            </div>
                          </div>

                          {benchmarksLoading ? (
                            <div className="py-6 text-center text-sm text-slate-500">
                              <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                              Loading data points...
                            </div>
                          ) : benchmarks.length === 0 ? (
                            <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                              No data points yet. Add individual points or use bulk import.
                            </div>
                          ) : (
                            <div className="rounded-lg border bg-white overflow-x-auto max-h-[500px] overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="sticky top-0">
                                  <tr className="border-b bg-white text-left">
                                    <th className="px-3 py-2 font-medium text-slate-600">Category</th>
                                    <th className="px-3 py-2 font-medium text-slate-600">Metric Type</th>
                                    <th className="px-3 py-2 font-medium text-slate-600">Metric Label</th>
                                    <th className="px-3 py-2 font-medium text-slate-600">Value</th>
                                    <th className="px-3 py-2 font-medium text-slate-600">Unit</th>
                                    <th className="px-3 py-2 font-medium text-slate-600">Industry</th>
                                    <th className="px-3 py-2 font-medium text-slate-600">Salary Band</th>
                                    <th className="px-3 py-2 font-medium text-slate-600">P25</th>
                                    <th className="px-3 py-2 font-medium text-slate-600">P75</th>
                                    <th className="px-3 py-2 font-medium text-slate-600 w-8" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {benchmarks.map((bp) => (
                                    <tr key={bp.id} className="border-b last:border-0 hover:bg-slate-50">
                                      <td className="px-3 py-2">{categoryLabel(bp.benefitCategory)}</td>
                                      <td className="px-3 py-2">{metricTypeLabel(bp.metricType)}</td>
                                      <td className="px-3 py-2">{bp.metricLabel}</td>
                                      <td className="px-3 py-2 font-mono">{bp.value}</td>
                                      <td className="px-3 py-2">{bp.unit}</td>
                                      <td className="px-3 py-2">
                                        {bp.industry || <span className="text-slate-400">&mdash;</span>}
                                      </td>
                                      <td className="px-3 py-2">
                                        {bp.salaryBand || <span className="text-slate-400">&mdash;</span>}
                                      </td>
                                      <td className="px-3 py-2 font-mono">
                                        {bp.percentile25 != null ? bp.percentile25 : (
                                          <span className="text-slate-400">&mdash;</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 font-mono">
                                        {bp.percentile75 != null ? bp.percentile75 : (
                                          <span className="text-slate-400">&mdash;</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => handleDeleteBenchmark(bp.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================= */}
      {/* Add Source Dialog                                               */}
      {/* ============================================================= */}
      <Dialog open={showAddSource} onOpenChange={setShowAddSource}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Baseline Data Source</DialogTitle>
            <DialogDescription>
              Register a new external data source for baseline benchmarks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="src-name">Name *</Label>
              <Input
                id="src-name"
                value={sourceForm.name}
                onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                placeholder="e.g. CIPD Health & Wellbeing 2025"
              />
            </div>
            <div>
              <Label htmlFor="src-publisher">Publisher *</Label>
              <Input
                id="src-publisher"
                value={sourceForm.publisher}
                onChange={(e) => setSourceForm({ ...sourceForm, publisher: e.target.value })}
                placeholder="e.g. CIPD"
              />
            </div>
            <div>
              <Label>Country *</Label>
              <CountryPicker
                value={sourceForm.country}
                onChange={(c) => setSourceForm({ ...sourceForm, country: c })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="src-year">Year *</Label>
                <Input
                  id="src-year"
                  type="number"
                  value={sourceForm.year}
                  onChange={(e) =>
                    setSourceForm({ ...sourceForm, year: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label htmlFor="src-sample">Sample Size</Label>
                <Input
                  id="src-sample"
                  type="number"
                  value={sourceForm.sampleSize}
                  onChange={(e) =>
                    setSourceForm({ ...sourceForm, sampleSize: e.target.value })
                  }
                  placeholder="e.g. 5000"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="src-url">Source URL</Label>
              <Input
                id="src-url"
                value={sourceForm.sourceUrl}
                onChange={(e) => setSourceForm({ ...sourceForm, sourceUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Source Type *</Label>
              <Select
                value={sourceForm.sourceType || undefined}
                onValueChange={(v) => setSourceForm({ ...sourceForm, sourceType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source type..." />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((st) => (
                    <SelectItem key={st.value} value={st.value}>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="src-notes">Notes</Label>
              <Textarea
                id="src-notes"
                value={sourceForm.notes}
                onChange={(e) => setSourceForm({ ...sourceForm, notes: e.target.value })}
                placeholder="Any additional context about this source..."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="src-license">License / Usage Rights *</Label>
              <div className="mb-1 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mr-1 inline h-3 w-3" />
                By entering license notes you acknowledge that you have reviewed and confirmed the
                usage rights for this data source.
              </div>
              <Textarea
                id="src-license"
                value={sourceForm.licenseNotes}
                onChange={(e) =>
                  setSourceForm({ ...sourceForm, licenseNotes: e.target.value })
                }
                placeholder="e.g. Public report, free to use for benchmarking..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddSource(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddSource}
                disabled={
                  sourceSubmitting ||
                  !sourceForm.name ||
                  !sourceForm.publisher ||
                  !sourceForm.country ||
                  !sourceForm.sourceType ||
                  !sourceForm.licenseNotes
                }
              >
                {sourceSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Source
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================= */}
      {/* Add Benchmark Dialog                                           */}
      {/* ============================================================= */}
      <Dialog open={showAddBenchmark} onOpenChange={setShowAddBenchmark}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Data Point</DialogTitle>
            <DialogDescription>
              Add a single benchmark data point to this source.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Country *</Label>
              <CountryPicker
                value={benchmarkForm.country}
                onChange={(c) => setBenchmarkForm({ ...benchmarkForm, country: c })}
              />
            </div>
            <div>
              <Label>Benefit Category *</Label>
              <Select
                value={benchmarkForm.benefitCategory || undefined}
                onValueChange={(v) =>
                  setBenchmarkForm({ ...benchmarkForm, benefitCategory: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {BENEFIT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Metric Type *</Label>
              <Select
                value={benchmarkForm.metricType || undefined}
                onValueChange={(v) =>
                  setBenchmarkForm({ ...benchmarkForm, metricType: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select metric type..." />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_TYPES.map((mt) => (
                    <SelectItem key={mt.value} value={mt.value}>
                      {mt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bp-label">Metric Label *</Label>
              <Input
                id="bp-label"
                value={benchmarkForm.metricLabel}
                onChange={(e) =>
                  setBenchmarkForm({ ...benchmarkForm, metricLabel: e.target.value })
                }
                placeholder="e.g. Employer contribution rate"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bp-value">Value *</Label>
                <Input
                  id="bp-value"
                  type="number"
                  step="any"
                  value={benchmarkForm.value}
                  onChange={(e) =>
                    setBenchmarkForm({ ...benchmarkForm, value: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="bp-unit">Unit *</Label>
                <Input
                  id="bp-unit"
                  value={benchmarkForm.unit}
                  onChange={(e) =>
                    setBenchmarkForm({ ...benchmarkForm, unit: e.target.value })
                  }
                  placeholder="e.g. %, GBP, multiple"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="bp-currency">Currency</Label>
              <Input
                id="bp-currency"
                value={benchmarkForm.currency}
                onChange={(e) =>
                  setBenchmarkForm({ ...benchmarkForm, currency: e.target.value })
                }
                placeholder="e.g. GBP, EUR"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bp-industry">Industry</Label>
                <Input
                  id="bp-industry"
                  value={benchmarkForm.industry}
                  onChange={(e) =>
                    setBenchmarkForm({ ...benchmarkForm, industry: e.target.value })
                  }
                  placeholder="e.g. Financial Services"
                />
              </div>
              <div>
                <Label htmlFor="bp-salary">Salary Band</Label>
                <Input
                  id="bp-salary"
                  value={benchmarkForm.salaryBand}
                  onChange={(e) =>
                    setBenchmarkForm({ ...benchmarkForm, salaryBand: e.target.value })
                  }
                  placeholder="e.g. 30000-50000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bp-p25">Percentile 25</Label>
                <Input
                  id="bp-p25"
                  type="number"
                  step="any"
                  value={benchmarkForm.percentile25}
                  onChange={(e) =>
                    setBenchmarkForm({ ...benchmarkForm, percentile25: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="bp-p75">Percentile 75</Label>
                <Input
                  id="bp-p75"
                  type="number"
                  step="any"
                  value={benchmarkForm.percentile75}
                  onChange={(e) =>
                    setBenchmarkForm({ ...benchmarkForm, percentile75: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="bp-notes">Notes</Label>
              <Textarea
                id="bp-notes"
                value={benchmarkForm.notes}
                onChange={(e) =>
                  setBenchmarkForm({ ...benchmarkForm, notes: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddBenchmark(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddBenchmark}
                disabled={
                  benchmarkSubmitting ||
                  !benchmarkForm.country ||
                  !benchmarkForm.benefitCategory ||
                  !benchmarkForm.metricType ||
                  !benchmarkForm.metricLabel ||
                  !benchmarkForm.value ||
                  !benchmarkForm.unit
                }
              >
                {benchmarkSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Data Point
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================= */}
      {/* Bulk Import Dialog                                             */}
      {/* ============================================================= */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import Data Points</DialogTitle>
            <DialogDescription>
              Paste a JSON array of benchmark data points. Each object should include:
              country, benefitCategory, metricType, metricLabel, value, unit, and
              optionally currency, industry, salaryBand, percentile25, percentile75, notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="import-json">JSON Data</Label>
              <Textarea
                id="import-json"
                value={importJson}
                onChange={(e) => {
                  setImportJson(e.target.value);
                  setImportPreview(null);
                  setImportError("");
                }}
                rows={8}
                className="font-mono text-xs"
                placeholder={`[\n  {\n    "country": "GB",\n    "benefitCategory": "HEALTH",\n    "metricType": "PREVALENCE",\n    "metricLabel": "PMI prevalence",\n    "value": 75,\n    "unit": "%"\n  }\n]`}
              />
            </div>
            {importError && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {importError}
              </div>
            )}
            <Button variant="outline" onClick={handleParseImportJson} disabled={!importJson.trim()}>
              Preview
            </Button>

            {importPreview && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  {importPreview.length} data point{importPreview.length !== 1 ? "s" : ""} ready
                  to import:
                </p>
                <div className="rounded-lg border bg-white overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0">
                      <tr className="border-b bg-slate-50 text-left">
                        <th className="px-3 py-2 font-medium text-slate-600">Category</th>
                        <th className="px-3 py-2 font-medium text-slate-600">Metric Type</th>
                        <th className="px-3 py-2 font-medium text-slate-600">Label</th>
                        <th className="px-3 py-2 font-medium text-slate-600">Value</th>
                        <th className="px-3 py-2 font-medium text-slate-600">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-1.5">
                            {categoryLabel(String(row.benefitCategory ?? ""))}
                          </td>
                          <td className="px-3 py-1.5">
                            {metricTypeLabel(String(row.metricType ?? ""))}
                          </td>
                          <td className="px-3 py-1.5">{String(row.metricLabel ?? "")}</td>
                          <td className="px-3 py-1.5 font-mono">{String(row.value ?? "")}</td>
                          <td className="px-3 py-1.5">{String(row.unit ?? "")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportPreview(null);
                      setImportJson("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleImportSubmit} disabled={importSubmitting}>
                    {importSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import {importPreview.length} Data Point{importPreview.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
