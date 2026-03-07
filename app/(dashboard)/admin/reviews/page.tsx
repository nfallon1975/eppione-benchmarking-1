"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Play,
  RefreshCw,
  Check,
  X,
  Clock,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  TrendingUp,
  Flag,
  Calendar,
  Settings,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COUNTRY_LABELS: Record<string, string> = {
  IE: "Ireland",
  GB: "United Kingdom",
  BE: "Belgium",
  FR: "France",
  DE: "Germany",
  US: "United States",
};

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-200",
  LOW: "bg-blue-100 text-blue-800 border-blue-200",
  INFO: "bg-gray-100 text-gray-800 border-gray-200",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  DEFERRED: "bg-gray-100 text-gray-800",
};

const CYCLE_STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  SCHEDULED: { bg: "bg-gray-100", text: "text-gray-700", label: "Scheduled" },
  IN_PROGRESS: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    label: "In Progress",
  },
  COMPLETED: {
    bg: "bg-green-100",
    text: "text-green-700",
    label: "Completed",
  },
  FAILED: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
};

const FINDING_TYPE_LABELS: Record<string, string> = {
  VALUE_CHANGED: "Value Changed",
  NEW_DATA_AVAILABLE: "New Data",
  SOURCE_EXPIRED: "Source Expired",
  SOURCE_UPDATED: "Source Updated",
  CONFLICTING_DATA: "Conflict",
  NEW_REGULATION: "New Regulation",
  DATA_CONFIRMED: "Confirmed",
  SOURCE_UNAVAILABLE: "Source Down",
  NEW_SOURCE_DISCOVERED: "New Source",
};

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewCycleSummary {
  id: string;
  month: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  countriesReviewed: string[];
  totalDataPointsReviewed: number;
  totalUpdatesFound: number;
  totalFlagsRaised: number;
  totalSourcesChecked: number;
  newSourcesDiscovered: number;
  aiCostEstimate: number | null;
  summary: string | null;
  severityCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  _count: { findings: number };
}

interface Finding {
  id: string;
  findingType: string;
  country: string;
  benefitCategory: string | null;
  industry: string | null;
  linkedType: string | null;
  linkedId: string | null;
  currentValue: string | null;
  suggestedValue: string | null;
  sourceReferenceId: string | null;
  sourceReference: {
    id: string;
    title: string;
    url: string | null;
    publisher: string;
  } | null;
  newSourceUrl: string | null;
  confidence: number;
  severity: string;
  aiReasoning: string;
  status: string;
  reviewedById: string | null;
  reviewedBy: { name: string | null } | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

interface CycleDetail {
  id: string;
  month: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  countriesReviewed: string[];
  totalDataPointsReviewed: number;
  totalUpdatesFound: number;
  totalFlagsRaised: number;
  totalSourcesChecked: number;
  newSourcesDiscovered: number;
  aiCostEstimate: number | null;
  summary: string | null;
  runBy: { name: string | null } | null;
  findings: Finding[];
}

interface CostEstimate {
  countries: number;
  dataPoints: number;
  estimatedCost: number;
  estimatedMinutes: number;
  countryList: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function formatCurrency(val: number): string {
  return `$${val.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminReviewsPage() {
  const { data: session } = useSession();

  // Cycles list
  const [cycles, setCycles] = useState<ReviewCycleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected cycle detail
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleDetail, setCycleDetail] = useState<CycleDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Findings filter
  const [findingsFilter, setFindingsFilter] = useState<string>("ALL");

  // Expanded reasoning
  const [expandedReasonings, setExpandedReasonings] = useState<Set<string>>(
    new Set()
  );

  // Run review dialog
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [budgetCap, setBudgetCap] = useState(50);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [estimatingCost, setEstimatingCost] = useState(false);
  const [startingReview, setStartingReview] = useState(false);

  // Action dialogs
  const [actionDialog, setActionDialog] = useState<{
    type: "accept" | "reject" | "defer";
    findingId: string;
    cycleId: string;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Dashboard metrics
  const [metrics, setMetrics] = useState({
    healthScore: 0,
    flaggedItems: 0,
    staleData: 0,
    pendingFindings: 0,
  });

  // Schedule config
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    enabled: false,
    dayOfMonth: 1,
    priorityCountries: [] as string[],
    secondaryCountries: [] as string[],
    monthlyBudgetCap: 50,
    nextRunDate: null as string | null,
    lastRunDate: null as string | null,
  });

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchCycles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reviews");
      if (!res.ok) throw new Error("Failed to fetch");
      const data: ReviewCycleSummary[] = await res.json();
      setCycles(data);

      // Calculate metrics from cycles data
      let totalPending = 0;
      for (const c of data) {
        totalPending += c.statusCounts?.PENDING_REVIEW || 0;
      }
      setMetrics((prev) => ({ ...prev, pendingFindings: totalPending }));
    } catch (err) {
      console.error("Error fetching cycles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCycleDetail = useCallback(async (cycleId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/reviews/${cycleId}`);
      if (!res.ok) throw new Error("Failed to fetch cycle detail");
      const data: CycleDetail = await res.json();
      setCycleDetail(data);
    } catch (err) {
      console.error("Error fetching cycle detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const fetchRunInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reviews/run");
      if (!res.ok) throw new Error("Failed to fetch run info");
      const data = await res.json();
      setAvailableCountries(data.countryList || []);
    } catch (err) {
      console.error("Error fetching run info:", err);
    }
  }, []);

  const fetchSchedule = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const res = await fetch("/api/admin/reviews/schedule");
      if (!res.ok) throw new Error("Failed to fetch schedule");
      const data = await res.json();
      setScheduleConfig({
        enabled: data.enabled ?? false,
        dayOfMonth: data.dayOfMonth ?? 1,
        priorityCountries: data.priorityCountries ?? [],
        secondaryCountries: data.secondaryCountries ?? [],
        monthlyBudgetCap: data.monthlyBudgetCap ?? 50,
        nextRunDate: data.nextRunDate ?? null,
        lastRunDate: data.lastRunDate ?? null,
      });
    } catch (err) {
      console.error("Error fetching schedule:", err);
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  const saveSchedule = async () => {
    setScheduleSaving(true);
    try {
      const res = await fetch("/api/admin/reviews/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: scheduleConfig.enabled,
          dayOfMonth: scheduleConfig.dayOfMonth,
          priorityCountries: scheduleConfig.priorityCountries,
          secondaryCountries: scheduleConfig.secondaryCountries,
          monthlyBudgetCap: scheduleConfig.monthlyBudgetCap,
        }),
      });
      if (!res.ok) throw new Error("Failed to save schedule");
      const data = await res.json();
      setScheduleConfig((prev) => ({
        ...prev,
        nextRunDate: data.nextRunDate ?? prev.nextRunDate,
        lastRunDate: data.lastRunDate ?? prev.lastRunDate,
      }));
    } catch (err) {
      console.error("Error saving schedule:", err);
    } finally {
      setScheduleSaving(false);
    }
  };

  const toggleScheduleCountry = (
    list: "priorityCountries" | "secondaryCountries",
    code: string
  ) => {
    setScheduleConfig((prev) => {
      const otherList =
        list === "priorityCountries"
          ? "secondaryCountries"
          : "priorityCountries";
      return {
        ...prev,
        [list]: prev[list].includes(code)
          ? prev[list].filter((c) => c !== code)
          : [...prev[list], code],
        // Remove from the other list if present
        [otherList]: prev[otherList].filter((c) => c !== code),
      };
    });
  };

  useEffect(() => {
    fetchCycles();
    fetchSchedule();
  }, [fetchCycles, fetchSchedule]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleSelectCycle = (cycleId: string) => {
    if (selectedCycleId === cycleId) {
      setSelectedCycleId(null);
      setCycleDetail(null);
    } else {
      setSelectedCycleId(cycleId);
      setFindingsFilter("ALL");
      setExpandedReasonings(new Set());
      fetchCycleDetail(cycleId);
    }
  };

  const handleOpenRunDialog = () => {
    fetchRunInfo();
    setCostEstimate(null);
    setSelectedCountries([]);
    setBudgetCap(50);
    setShowRunDialog(true);
  };

  const handleEstimateCost = async () => {
    if (selectedCountries.length === 0) return;
    setEstimatingCost(true);
    try {
      const res = await fetch("/api/admin/reviews/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countries: selectedCountries,
          estimate: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to estimate cost");
      const data = await res.json();
      setCostEstimate(data);
    } catch (err) {
      console.error("Error estimating cost:", err);
    } finally {
      setEstimatingCost(false);
    }
  };

  const handleStartReview = async () => {
    if (selectedCountries.length === 0) return;
    setStartingReview(true);
    try {
      const res = await fetch("/api/admin/reviews/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countries: selectedCountries,
          budgetCap,
        }),
      });
      if (!res.ok) throw new Error("Failed to start review");
      setShowRunDialog(false);
      // Refresh cycles list after a short delay for the cycle to be created
      setTimeout(() => fetchCycles(), 2000);
    } catch (err) {
      console.error("Error starting review:", err);
    } finally {
      setStartingReview(false);
    }
  };

  const handleFindingAction = async () => {
    if (!actionDialog) return;
    if (actionDialog.type === "reject" && !actionNotes.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/admin/reviews/${actionDialog.cycleId}/${actionDialog.type}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingId: actionDialog.findingId,
            notes: actionNotes || undefined,
          }),
        }
      );
      if (!res.ok) throw new Error(`Failed to ${actionDialog.type} finding`);

      // Refresh detail
      await fetchCycleDetail(actionDialog.cycleId);
      await fetchCycles();
      setActionDialog(null);
      setActionNotes("");
    } catch (err) {
      console.error(`Error performing ${actionDialog?.type}:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleReasoning = (findingId: string) => {
    setExpandedReasonings((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return next;
    });
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
    setCostEstimate(null);
  };

  // ---------------------------------------------------------------------------
  // Filtered findings
  // ---------------------------------------------------------------------------

  const filteredFindings = cycleDetail
    ? cycleDetail.findings
        .filter((f) => findingsFilter === "ALL" || f.status === findingsFilter)
        .sort(
          (a, b) =>
            (SEVERITY_ORDER[a.severity] ?? 99) -
            (SEVERITY_ORDER[b.severity] ?? 99)
        )
    : [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1B2A4A" }}>
            Data Reviews
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monthly AI-powered review cycles for benchmarking data quality
          </p>
        </div>
        <Button
          onClick={handleOpenRunDialog}
          className="text-white"
          style={{ backgroundColor: "#8F4CFF" }}
        >
          <Play className="h-4 w-4 mr-2" />
          Run Review Now
        </Button>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Shield className="h-5 w-5" style={{ color: "#00B4D8" }} />}
          label="Data Health Score"
          value={
            metrics.healthScore > 0
              ? `${(metrics.healthScore * 100).toFixed(0)}%`
              : "--"
          }
          subtitle="Average confidence"
        />
        <MetricCard
          icon={<Flag className="h-5 w-5 text-red-500" />}
          label="Flagged Items"
          value={String(metrics.flaggedItems)}
          subtitle="Require attention"
        />
        <MetricCard
          icon={<Calendar className="h-5 w-5 text-amber-500" />}
          label="Stale Data"
          value={String(metrics.staleData)}
          subtitle="Not verified in 12+ months"
        />
        <MetricCard
          icon={
            <AlertTriangle className="h-5 w-5" style={{ color: "#8F4CFF" }} />
          }
          label="Pending Findings"
          value={String(metrics.pendingFindings)}
          subtitle="Awaiting review"
        />
      </div>

      {/* Review Schedule Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setScheduleOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" style={{ color: "#8F4CFF" }} />
            <span
              className="text-lg font-semibold"
              style={{ color: "#1B2A4A" }}
            >
              Review Schedule
            </span>
          </div>
          {scheduleOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {scheduleOpen && (
          <div className="border-t border-gray-200 px-4 py-5 space-y-6">
            {scheduleLoading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Enable / Disable toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">
                      Automatic Reviews
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Enable or disable scheduled automatic review runs
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={scheduleConfig.enabled}
                    onClick={() =>
                      setScheduleConfig((prev) => ({
                        ...prev,
                        enabled: !prev.enabled,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      scheduleConfig.enabled ? "bg-[#8F4CFF]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        scheduleConfig.enabled
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Day of Month */}
                <div>
                  <Label htmlFor="scheduleDayOfMonth" className="text-sm font-medium">
                    Day of Month
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Which day each month the review should run (1-28)
                  </p>
                  <Input
                    id="scheduleDayOfMonth"
                    type="number"
                    min={1}
                    max={28}
                    value={scheduleConfig.dayOfMonth}
                    onChange={(e) =>
                      setScheduleConfig((prev) => ({
                        ...prev,
                        dayOfMonth: Math.max(
                          1,
                          Math.min(28, Number(e.target.value))
                        ),
                      }))
                    }
                    className="mt-1 w-24"
                  />
                </div>

                {/* Priority Countries */}
                <div>
                  <Label className="text-sm font-medium">
                    Priority Countries
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Reviewed every month
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                    {Object.entries(COUNTRY_LABELS).map(([code, name]) => (
                      <label
                        key={code}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={scheduleConfig.priorityCountries.includes(
                            code
                          )}
                          onCheckedChange={() =>
                            toggleScheduleCountry("priorityCountries", code)
                          }
                        />
                        <span className="text-sm">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Secondary Countries */}
                <div>
                  <Label className="text-sm font-medium">
                    Secondary Countries
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Reviewed quarterly
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                    {Object.entries(COUNTRY_LABELS).map(([code, name]) => (
                      <label
                        key={code}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={scheduleConfig.secondaryCountries.includes(
                            code
                          )}
                          onCheckedChange={() =>
                            toggleScheduleCountry("secondaryCountries", code)
                          }
                        />
                        <span className="text-sm">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Monthly Budget Cap */}
                <div>
                  <Label
                    htmlFor="scheduleBudgetCap"
                    className="text-sm font-medium"
                  >
                    Monthly Budget Cap
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Maximum spend per scheduled review run
                  </p>
                  <div className="relative mt-1 w-40">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      $
                    </span>
                    <Input
                      id="scheduleBudgetCap"
                      type="number"
                      min={1}
                      value={scheduleConfig.monthlyBudgetCap}
                      onChange={(e) =>
                        setScheduleConfig((prev) => ({
                          ...prev,
                          monthlyBudgetCap: Math.max(1, Number(e.target.value)),
                        }))
                      }
                      className="pl-7"
                    />
                  </div>
                </div>

                {/* Next / Last Run Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Next Run Date
                    </span>
                    <p className="text-sm font-semibold mt-1" style={{ color: "#1B2A4A" }}>
                      {scheduleConfig.nextRunDate
                        ? new Date(scheduleConfig.nextRunDate).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )
                        : scheduleConfig.enabled
                        ? "Will be calculated on save"
                        : "Disabled"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Last Run Date
                    </span>
                    <p className="text-sm font-semibold mt-1" style={{ color: "#1B2A4A" }}>
                      {scheduleConfig.lastRunDate
                        ? new Date(scheduleConfig.lastRunDate).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )
                        : "Never"}
                    </p>
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end">
                  <Button
                    className="text-white"
                    style={{ backgroundColor: "#8F4CFF" }}
                    onClick={saveSchedule}
                    disabled={scheduleSaving}
                  >
                    {scheduleSaving && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Save Schedule
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Review Cycles */}
      <div>
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: "#1B2A4A" }}
        >
          Review Cycles
        </h2>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : cycles.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            <RefreshCw className="h-8 w-8 mx-auto mb-3 text-gray-300" />
            <p>No review cycles yet. Run your first review to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cycles.map((cycle) => {
              const isSelected = selectedCycleId === cycle.id;
              const statusStyle = CYCLE_STATUS_STYLES[cycle.status] || {
                bg: "bg-gray-100",
                text: "text-gray-700",
                label: cycle.status,
              };

              return (
                <div key={cycle.id}>
                  <div
                    className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                      isSelected
                        ? "border-[#8F4CFF] ring-1 ring-[#8F4CFF]/30"
                        : "border-gray-200"
                    }`}
                    onClick={() => handleSelectCycle(cycle.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">
                          {formatMonth(cycle.month)}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {cycle.status === "IN_PROGRESS" && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          {statusStyle.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Country pills */}
                    {cycle.countriesReviewed.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {cycle.countriesReviewed.map((code) => (
                          <span
                            key={code}
                            className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600"
                          >
                            {COUNTRY_LABELS[code] || code}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                      <span>
                        <strong className="text-gray-700">
                          {cycle.totalDataPointsReviewed}
                        </strong>{" "}
                        data points
                      </span>
                      <span>
                        <strong className="text-gray-700">
                          {cycle.totalUpdatesFound}
                        </strong>{" "}
                        updates
                      </span>
                      <span>
                        <strong className="text-gray-700">
                          {cycle.totalFlagsRaised}
                        </strong>{" "}
                        flags
                      </span>
                      <span>
                        <strong className="text-gray-700">
                          {cycle.newSourcesDiscovered}
                        </strong>{" "}
                        new sources
                      </span>
                      {cycle.aiCostEstimate != null && (
                        <span>
                          <strong className="text-gray-700">
                            {formatCurrency(cycle.aiCostEstimate)}
                          </strong>{" "}
                          cost
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded findings panel */}
                  {isSelected && (
                    <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      {loadingDetail ? (
                        <div className="flex items-center justify-center h-24">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                      ) : cycleDetail ? (
                        <div className="space-y-4">
                          {/* Summary */}
                          {cycleDetail.summary && (
                            <p className="text-sm text-gray-600 bg-white rounded p-3 border border-gray-200">
                              {cycleDetail.summary}
                            </p>
                          )}

                          {/* Filter tabs */}
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { key: "ALL", label: "All" },
                              {
                                key: "PENDING_REVIEW",
                                label: "Pending",
                              },
                              { key: "ACCEPTED", label: "Accepted" },
                              { key: "REJECTED", label: "Rejected" },
                              { key: "DEFERRED", label: "Deferred" },
                            ].map((tab) => {
                              const count =
                                tab.key === "ALL"
                                  ? cycleDetail.findings.length
                                  : cycleDetail.findings.filter(
                                      (f) => f.status === tab.key
                                    ).length;
                              return (
                                <button
                                  key={tab.key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFindingsFilter(tab.key);
                                  }}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    findingsFilter === tab.key
                                      ? "bg-[#1B2A4A] text-white"
                                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                                  }`}
                                >
                                  {tab.label} ({count})
                                </button>
                              );
                            })}
                          </div>

                          {/* Findings list */}
                          {filteredFindings.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-6">
                              No findings match this filter.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {filteredFindings.map((finding) => (
                                <FindingCard
                                  key={finding.id}
                                  finding={finding}
                                  cycleId={cycleDetail.id}
                                  isReasoningExpanded={expandedReasonings.has(
                                    finding.id
                                  )}
                                  onToggleReasoning={() =>
                                    toggleReasoning(finding.id)
                                  }
                                  onAction={(type) =>
                                    setActionDialog({
                                      type,
                                      findingId: finding.id,
                                      cycleId: cycleDetail.id,
                                    })
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Run Review Dialog                                                    */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Run Monthly Review</DialogTitle>
            <DialogDescription>
              Select countries to review and set a budget cap for AI costs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Country selection */}
            <div>
              <Label className="text-sm font-medium">Countries</Label>
              {availableCountries.length === 0 ? (
                <p className="text-xs text-gray-400 mt-1">
                  Loading available countries...
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {availableCountries.map((code) => (
                    <label
                      key={code}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedCountries.includes(code)}
                        onCheckedChange={() => toggleCountry(code)}
                      />
                      <span className="text-sm">
                        {COUNTRY_LABELS[code] || code}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Budget cap */}
            <div>
              <Label htmlFor="budgetCap" className="text-sm font-medium">
                Budget Cap ($)
              </Label>
              <Input
                id="budgetCap"
                type="number"
                min={1}
                value={budgetCap}
                onChange={(e) => setBudgetCap(Number(e.target.value))}
                className="mt-1"
              />
            </div>

            {/* Cost estimate result */}
            {costEstimate && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm space-y-1">
                <p>
                  <strong>Countries:</strong> {costEstimate.countries}
                </p>
                <p>
                  <strong>Data points:</strong> {costEstimate.dataPoints}
                </p>
                <p>
                  <strong>Estimated cost:</strong>{" "}
                  {formatCurrency(costEstimate.estimatedCost)}
                </p>
                <p>
                  <strong>Estimated time:</strong>{" "}
                  {costEstimate.estimatedMinutes} min
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEstimateCost}
                disabled={selectedCountries.length === 0 || estimatingCost}
              >
                {estimatingCost ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-1" />
                )}
                Estimate Cost
              </Button>
              <Button
                size="sm"
                className="text-white"
                style={{ backgroundColor: "#8F4CFF" }}
                onClick={handleStartReview}
                disabled={selectedCountries.length === 0 || startingReview}
              >
                {startingReview ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Start Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Accept / Reject / Defer Dialog                                       */}
      {/* ------------------------------------------------------------------- */}
      <Dialog
        open={actionDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
            setActionNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {actionDialog?.type === "accept"
                ? "Accept Finding"
                : actionDialog?.type === "reject"
                ? "Reject Finding"
                : "Defer Finding"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === "reject"
                ? "Please provide a reason for rejecting this finding."
                : actionDialog?.type === "accept"
                ? "Optionally add notes about this acceptance."
                : "Optionally add notes about why this is being deferred."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="actionNotes" className="text-sm font-medium">
                Notes{actionDialog?.type === "reject" ? " (required)" : ""}
              </Label>
              <Textarea
                id="actionNotes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={
                  actionDialog?.type === "reject"
                    ? "Explain why this finding is being rejected..."
                    : "Add any relevant notes..."
                }
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActionDialog(null);
                  setActionNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-white"
                style={{
                  backgroundColor:
                    actionDialog?.type === "accept"
                      ? "#16a34a"
                      : actionDialog?.type === "reject"
                      ? "#dc2626"
                      : "#6b7280",
                }}
                onClick={handleFindingAction}
                disabled={
                  actionLoading ||
                  (actionDialog?.type === "reject" && !actionNotes.trim())
                }
              >
                {actionLoading && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                )}
                {actionDialog?.type === "accept"
                  ? "Accept"
                  : actionDialog?.type === "reject"
                  ? "Reject"
                  : "Defer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

function MetricCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold" style={{ color: "#1B2A4A" }}>
        {value}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Finding Card
// ---------------------------------------------------------------------------

function FindingCard({
  finding,
  cycleId,
  isReasoningExpanded,
  onToggleReasoning,
  onAction,
}: {
  finding: Finding;
  cycleId: string;
  isReasoningExpanded: boolean;
  onToggleReasoning: () => void;
  onAction: (type: "accept" | "reject" | "defer") => void;
}) {
  const severityStyle = SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.INFO;
  const statusStyle = STATUS_STYLES[finding.status] || STATUS_STYLES.PENDING_REVIEW;
  const isPending = finding.status === "PENDING_REVIEW";

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top row: badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`border ${severityStyle}`}>{finding.severity}</Badge>
        <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
          {FINDING_TYPE_LABELS[finding.findingType] || finding.findingType}
        </Badge>
        <span className="text-xs text-gray-500">
          {COUNTRY_LABELS[finding.country] || finding.country}
          {finding.benefitCategory && ` / ${finding.benefitCategory}`}
        </span>
        {!isPending && (
          <Badge className={statusStyle}>{finding.status.replace("_", " ")}</Badge>
        )}
      </div>

      {/* Value diff */}
      {(finding.currentValue || finding.suggestedValue) && (
        <div className="flex items-center gap-2 text-sm font-mono">
          {finding.currentValue && (
            <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200 line-through">
              {finding.currentValue}
            </span>
          )}
          {finding.currentValue && finding.suggestedValue && (
            <span className="text-gray-400">&rarr;</span>
          )}
          {finding.suggestedValue && (
            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
              {finding.suggestedValue}
            </span>
          )}
        </div>
      )}

      {/* Source reference */}
      {finding.sourceReference && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <span className="font-medium">Source:</span>
          <span>{finding.sourceReference.title}</span>
          {finding.sourceReference.url && (
            <a
              href={finding.sourceReference.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00B4D8] hover:underline inline-flex items-center gap-0.5"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
      {finding.newSourceUrl && !finding.sourceReference && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <span className="font-medium">New source:</span>
          <a
            href={finding.newSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00B4D8] hover:underline inline-flex items-center gap-0.5 truncate max-w-xs"
          >
            {finding.newSourceUrl}
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        </div>
      )}

      {/* Confidence bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-20">Confidence</span>
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.round(finding.confidence * 100)}%`,
              backgroundColor:
                finding.confidence >= 0.7
                  ? "#16a34a"
                  : finding.confidence >= 0.4
                  ? "#d97706"
                  : "#dc2626",
            }}
          />
        </div>
        <span className="text-xs font-medium text-gray-700 w-10 text-right">
          {Math.round(finding.confidence * 100)}%
        </span>
      </div>

      {/* AI Reasoning (collapsible) */}
      <div>
        <button
          onClick={onToggleReasoning}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <Info className="h-3 w-3" />
          AI Reasoning
          {isReasoningExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
        {isReasoningExpanded && (
          <p className="mt-1.5 text-xs text-gray-600 bg-gray-50 rounded p-2 border border-gray-100 whitespace-pre-wrap">
            {finding.aiReasoning}
          </p>
        )}
      </div>

      {/* Reviewed info or action buttons */}
      {isPending ? (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="text-white"
            style={{ backgroundColor: "#16a34a" }}
            onClick={() => onAction("accept")}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            className="text-white"
            style={{ backgroundColor: "#dc2626" }}
            onClick={() => onAction("reject")}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction("defer")}
          >
            <Clock className="h-3.5 w-3.5 mr-1" />
            Defer
          </Button>
        </div>
      ) : (
        <div className="text-xs text-gray-500 border-t border-gray-100 pt-2">
          <span className="font-medium capitalize">
            {finding.status.replace("_", " ").toLowerCase()}
          </span>
          {finding.reviewedBy?.name && (
            <span> by {finding.reviewedBy.name}</span>
          )}
          {finding.reviewedAt && (
            <span>
              {" "}
              on {new Date(finding.reviewedAt).toLocaleDateString()}
            </span>
          )}
          {finding.reviewNotes && (
            <p className="mt-1 text-gray-400 italic">
              &ldquo;{finding.reviewNotes}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
