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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  ExternalLink,
  Shield,
  CheckCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Link2,
} from "lucide-react";
import { AuditTrail } from "@/components/audit-trail";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SourceLink {
  id: string;
  sourceId: string;
  linkedType: string;
  linkedId: string;
  relevance: string;
  specificCitation: string | null;
  extractedValue: string | null;
  notes: string | null;
  createdAt: string;
}

interface Source {
  id: string;
  type: string;
  title: string;
  publisher: string;
  country: string | null;
  url: string | null;
  publicationDate: string | null;
  accessDate: string;
  isPubliclyAccessible: boolean;
  summary: string;
  reliability: string;
  isActive: boolean;
  addedById: string;
  lastVerifiedAt: string | null;
  lastVerifiedById: string | null;
  verificationNotes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { sourceLinks: number };
  sourceLinks?: SourceLink[];
  addedBy?: { id: string; name: string | null; email: string };
  lastVerifiedBy?: { id: string; name: string | null; email: string } | null;
}

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

const SOURCE_TYPE_LABELS: Record<string, string> = {
  LEGISLATION: "Legislation",
  GOVERNMENT_REPORT: "Government Report",
  INDUSTRY_SURVEY: "Industry Survey",
  INSURER_REPORT: "Insurer Report",
  CONSULTANCY_REPORT: "Consultancy Report",
  TRADE_BODY: "Trade Body",
  REGULATOR_PUBLICATION: "Regulator",
  NEWS_ARTICLE: "News Article",
  ACADEMIC_PAPER: "Academic Paper",
  EMPLOYER_ASSOCIATION: "Employer Association",
  TAX_AUTHORITY: "Tax Authority",
  OTHER: "Other",
};

const SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABELS);

const RELIABILITY_OPTIONS = [
  "OFFICIAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "UNVERIFIED",
] as const;

const RELIABILITY_COLORS: Record<string, string> = {
  OFFICIAL: "bg-green-100 text-green-800",
  HIGH: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-orange-100 text-orange-800",
  UNVERIFIED: "bg-gray-100 text-gray-800",
};

const TYPE_COLORS: Record<string, string> = {
  LEGISLATION: "bg-indigo-100 text-indigo-800",
  GOVERNMENT_REPORT: "bg-blue-100 text-blue-800",
  INDUSTRY_SURVEY: "bg-teal-100 text-teal-800",
  INSURER_REPORT: "bg-cyan-100 text-cyan-800",
  CONSULTANCY_REPORT: "bg-violet-100 text-violet-800",
  TRADE_BODY: "bg-emerald-100 text-emerald-800",
  REGULATOR_PUBLICATION: "bg-rose-100 text-rose-800",
  NEWS_ARTICLE: "bg-slate-100 text-slate-800",
  ACADEMIC_PAPER: "bg-purple-100 text-purple-800",
  EMPLOYER_ASSOCIATION: "bg-lime-100 text-lime-800",
  TAX_AUTHORITY: "bg-red-100 text-red-800",
  OTHER: "bg-gray-100 text-gray-800",
};

const LINKED_TYPE_LABELS: Record<string, string> = {
  BASELINE_BENCHMARK: "Baseline Benchmark",
  COMPLIANCE_REQUIREMENT: "Compliance Requirement",
  STATUTORY_LIMIT: "Statutory Limit",
  BROKER_CONTRIBUTION: "Broker Contribution",
};

const RELEVANCE_OPTIONS = ["PRIMARY", "SUPPORTING", "CROSS_REFERENCE"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVerificationHealth(lastVerifiedAt: string | null): {
  color: string;
  label: string;
} {
  if (!lastVerifiedAt) return { color: "bg-red-500", label: "Never verified" };
  const months =
    (Date.now() - new Date(lastVerifiedAt).getTime()) /
    (1000 * 60 * 60 * 24 * 30);
  if (months < 6) return { color: "bg-green-500", label: "Recently verified" };
  if (months < 12) return { color: "bg-amber-500", label: "Needs review" };
  return { color: "bg-red-500", label: "Overdue" };
}

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SourceLibraryPage() {
  const { data: session } = useSession();

  // List state
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCountry, setFilterCountry] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterReliability, setFilterReliability] = useState("");
  const [filterActive, setFilterActive] = useState(true);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    title: "",
    publisher: "",
    type: "LEGISLATION",
    country: "",
    url: "",
    publicationDate: "",
    isPubliclyAccessible: true,
    summary: "",
    reliability: "UNVERIFIED",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [urlCheck, setUrlCheck] = useState<{
    checking: boolean;
    result: null | { accessible: boolean; status?: number; error?: string };
  }>({ checking: false, result: null });

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSource, setDetailSource] = useState<Source | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Link data point
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({
    linkedType: "BASELINE_BENCHMARK",
    linkedId: "",
    relevance: "PRIMARY",
    specificCitation: "",
    extractedValue: "",
    notes: "",
  });
  const [linkLoading, setLinkLoading] = useState(false);

  // Verify
  const [verifyLoading, setVerifyLoading] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch list
  // -------------------------------------------------------------------------

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCountry) params.set("country", filterCountry);
      if (filterType) params.set("type", filterType);
      if (filterReliability) params.set("reliability", filterReliability);
      params.set("isActive", String(filterActive));
      const qs = params.toString();
      const res = await fetch(`/api/admin/sources${qs ? `?${qs}` : ""}`);
      if (res.ok) setSources(await res.json());
    } catch (err) {
      console.error("Failed to fetch sources:", err);
    } finally {
      setLoading(false);
    }
  }, [filterCountry, filterType, filterReliability, filterActive]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // -------------------------------------------------------------------------
  // Add source
  // -------------------------------------------------------------------------

  async function handleAdd() {
    if (!addForm.title || !addForm.publisher || !addForm.summary) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          country: addForm.country || null,
          url: addForm.url || null,
          publicationDate: addForm.publicationDate || null,
        }),
      });
      if (res.ok) {
        setAddOpen(false);
        setAddForm({
          title: "",
          publisher: "",
          type: "LEGISLATION",
          country: "",
          url: "",
          publicationDate: "",
          isPubliclyAccessible: true,
          summary: "",
          reliability: "UNVERIFIED",
        });
        setUrlCheck({ checking: false, result: null });
        fetchSources();
      }
    } catch (err) {
      console.error("Failed to add source:", err);
    } finally {
      setAddLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Check URL
  // -------------------------------------------------------------------------

  async function handleCheckUrl() {
    if (!addForm.url) return;
    setUrlCheck({ checking: true, result: null });
    try {
      const res = await fetch("/api/admin/sources/check-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: addForm.url }),
      });
      const data = await res.json();
      setUrlCheck({ checking: false, result: data });
    } catch {
      setUrlCheck({
        checking: false,
        result: { accessible: false, error: "Request failed" },
      });
    }
  }

  // -------------------------------------------------------------------------
  // View detail
  // -------------------------------------------------------------------------

  async function openDetail(id: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/sources/${id}`);
      if (res.ok) setDetailSource(await res.json());
    } catch (err) {
      console.error("Failed to load source detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Verify source
  // -------------------------------------------------------------------------

  async function handleVerify(id: string, notes?: string) {
    setVerifyLoading(id);
    try {
      const res = await fetch(`/api/admin/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verify: true,
          verificationNotes: notes || undefined,
        }),
      });
      if (res.ok) {
        fetchSources();
        if (detailSource?.id === id) {
          openDetail(id);
        }
      }
    } catch (err) {
      console.error("Failed to verify source:", err);
    } finally {
      setVerifyLoading(null);
    }
  }

  // -------------------------------------------------------------------------
  // Delete source
  // -------------------------------------------------------------------------

  async function handleDelete(id: string) {
    if (!confirm("Delete this source and all its links?")) return;
    try {
      const res = await fetch(`/api/admin/sources/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchSources();
        if (detailSource?.id === id) {
          setDetailOpen(false);
          setDetailSource(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete source:", err);
    }
  }

  // -------------------------------------------------------------------------
  // Link data point
  // -------------------------------------------------------------------------

  async function handleLink() {
    if (!detailSource || !linkForm.linkedId) return;
    setLinkLoading(true);
    try {
      const res = await fetch("/api/admin/sources/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: detailSource.id,
          linkedType: linkForm.linkedType,
          linkedId: linkForm.linkedId,
          relevance: linkForm.relevance,
          specificCitation: linkForm.specificCitation || null,
          extractedValue: linkForm.extractedValue || null,
          notes: linkForm.notes || null,
        }),
      });
      if (res.ok) {
        setLinkOpen(false);
        setLinkForm({
          linkedType: "BASELINE_BENCHMARK",
          linkedId: "",
          relevance: "PRIMARY",
          specificCitation: "",
          extractedValue: "",
          notes: "",
        });
        openDetail(detailSource.id);
        fetchSources();
      }
    } catch (err) {
      console.error("Failed to link data point:", err);
    } finally {
      setLinkLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Delete link
  // -------------------------------------------------------------------------

  async function handleDeleteLink(linkId: string) {
    if (!detailSource) return;
    try {
      const res = await fetch(`/api/admin/sources/link?id=${linkId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        openDetail(detailSource.id);
        fetchSources();
      }
    } catch (err) {
      console.error("Failed to delete link:", err);
    }
  }

  // -------------------------------------------------------------------------
  // Render guards
  // -------------------------------------------------------------------------

  if (!session) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading...
      </div>
    );
  }

  if (session.user?.role !== "ADMIN") {
    return <p className="p-8 text-slate-500">Admin access required.</p>;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: "#1B2A4A" }}>
            Source Library
          </h1>
          <Badge variant="secondary" className="text-sm">
            {sources.length}
          </Badge>
        </div>
        <Button onClick={() => setAddOpen(true)} style={{ backgroundColor: "#00B4D8" }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Source
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-white p-4">
        {/* Country filter */}
        <div className="w-48">
          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger>
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Countries</SelectItem>
              {Object.entries(COUNTRY_LABELS).map(([code, label]) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ))}
              <SelectItem value="__null__">Multi-country</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Type filter */}
        <div className="w-52">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              {SOURCE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {SOURCE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reliability filter */}
        <div className="w-44">
          <Select value={filterReliability} onValueChange={setFilterReliability}>
            <SelectTrigger>
              <SelectValue placeholder="All Reliability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Reliability</SelectItem>
              {RELIABILITY_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <Switch
            checked={filterActive}
            onCheckedChange={setFilterActive}
          />
          <Label className="text-sm text-slate-600">
            {filterActive ? "Active" : "Inactive"}
          </Label>
        </div>
      </div>

      {/* Source list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Loading sources...
        </div>
      ) : sources.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">
          No sources found. Add one to get started.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reliability</th>
                <th className="px-4 py-3 text-center">Links</th>
                <th className="px-4 py-3">Last Verified</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sources.map((s) => {
                const health = getVerificationHealth(s.lastVerifiedAt);
                return (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* Title + Publisher */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {s.title}
                          </div>
                          <div className="text-xs text-slate-500">
                            {s.publisher}
                          </div>
                        </div>
                        {s.url && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-[#00B4D8]"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Country */}
                    <td className="px-4 py-3 text-slate-600">
                      {s.country
                        ? COUNTRY_LABELS[s.country] || s.country
                        : "Multi-country"}
                    </td>

                    {/* Type badge */}
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={TYPE_COLORS[s.type] || TYPE_COLORS.OTHER}
                      >
                        {SOURCE_TYPE_LABELS[s.type] || s.type}
                      </Badge>
                    </td>

                    {/* Reliability badge */}
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={
                          RELIABILITY_COLORS[s.reliability] ||
                          RELIABILITY_COLORS.UNVERIFIED
                        }
                      >
                        {s.reliability.charAt(0) +
                          s.reliability.slice(1).toLowerCase()}
                      </Badge>
                    </td>

                    {/* Linked data points count */}
                    <td className="px-4 py-3 text-center text-slate-600">
                      <div className="flex items-center justify-center gap-1">
                        <Link2 className="h-3.5 w-3.5" />
                        {s._count?.sourceLinks ?? 0}
                      </div>
                    </td>

                    {/* Last verified + health */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${health.color}`}
                          title={health.label}
                        />
                        <span className="text-slate-600">
                          {formatDate(s.lastVerifiedAt)}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetail(s.id)}
                          title="View detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerify(s.id)}
                          disabled={verifyLoading === s.id}
                          title="Verify now"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(s.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================================= */}
      {/* Add Source Dialog                                                   */}
      {/* ================================================================= */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Source</DialogTitle>
            <DialogDescription>
              Register a new data source reference.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Title */}
            <div>
              <Label htmlFor="add-title">Title *</Label>
              <Input
                id="add-title"
                value={addForm.title}
                onChange={(e) =>
                  setAddForm({ ...addForm, title: e.target.value })
                }
                placeholder="e.g. Social Welfare Act 2024"
              />
            </div>

            {/* Publisher */}
            <div>
              <Label htmlFor="add-publisher">Publisher *</Label>
              <Input
                id="add-publisher"
                value={addForm.publisher}
                onChange={(e) =>
                  setAddForm({ ...addForm, publisher: e.target.value })
                }
                placeholder="e.g. Department of Social Protection"
              />
            </div>

            {/* Type */}
            <div>
              <Label>Type</Label>
              <Select
                value={addForm.type}
                onValueChange={(v) => setAddForm({ ...addForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SOURCE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country */}
            <div>
              <Label htmlFor="add-country">Country (optional)</Label>
              <Input
                id="add-country"
                value={addForm.country}
                onChange={(e) =>
                  setAddForm({ ...addForm, country: e.target.value })
                }
                placeholder="e.g. IE, GB, or leave blank for multi-country"
              />
            </div>

            {/* URL + Check */}
            <div>
              <Label htmlFor="add-url">URL (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="add-url"
                  value={addForm.url}
                  onChange={(e) => {
                    setAddForm({ ...addForm, url: e.target.value });
                    setUrlCheck({ checking: false, result: null });
                  }}
                  placeholder="https://..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckUrl}
                  disabled={!addForm.url || urlCheck.checking}
                  className="whitespace-nowrap"
                >
                  {urlCheck.checking ? (
                    <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Check URL
                </Button>
              </div>
              {urlCheck.result && (
                <div className="mt-1 flex items-center gap-1 text-xs">
                  {urlCheck.result.accessible ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-green-700">
                        Accessible (HTTP {urlCheck.result.status})
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-red-600">
                        Not accessible
                        {urlCheck.result.error
                          ? `: ${urlCheck.result.error}`
                          : ""}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Publication date */}
            <div>
              <Label htmlFor="add-pubdate">Publication Date (optional)</Label>
              <Input
                id="add-pubdate"
                type="date"
                value={addForm.publicationDate}
                onChange={(e) =>
                  setAddForm({ ...addForm, publicationDate: e.target.value })
                }
              />
            </div>

            {/* isPubliclyAccessible */}
            <div className="flex items-center gap-3">
              <Switch
                checked={addForm.isPubliclyAccessible}
                onCheckedChange={(v) =>
                  setAddForm({ ...addForm, isPubliclyAccessible: v })
                }
              />
              <Label>Publicly accessible</Label>
            </div>

            {/* Summary */}
            <div>
              <Label htmlFor="add-summary">Summary *</Label>
              <Textarea
                id="add-summary"
                value={addForm.summary}
                onChange={(e) =>
                  setAddForm({ ...addForm, summary: e.target.value })
                }
                placeholder="Brief description of what this source covers..."
                rows={3}
              />
            </div>

            {/* Reliability */}
            <div>
              <Label>Reliability</Label>
              <Select
                value={addForm.reliability}
                onValueChange={(v) =>
                  setAddForm({ ...addForm, reliability: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELIABILITY_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.charAt(0) + r.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <Button
              onClick={handleAdd}
              disabled={
                addLoading ||
                !addForm.title ||
                !addForm.publisher ||
                !addForm.summary
              }
              className="w-full"
              style={{ backgroundColor: "#00B4D8" }}
            >
              {addLoading ? "Adding..." : "Add Source"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* Source Detail Dialog                                                */}
      {/* ================================================================= */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Source Detail</DialogTitle>
            <DialogDescription>
              View and manage this data source reference.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Loading...
            </div>
          ) : detailSource ? (
            <div className="space-y-6 pt-2">
              {/* Top info */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {detailSource.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {detailSource.publisher}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className={
                      TYPE_COLORS[detailSource.type] || TYPE_COLORS.OTHER
                    }
                  >
                    {SOURCE_TYPE_LABELS[detailSource.type] || detailSource.type}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={
                      RELIABILITY_COLORS[detailSource.reliability] ||
                      RELIABILITY_COLORS.UNVERIFIED
                    }
                  >
                    {detailSource.reliability.charAt(0) +
                      detailSource.reliability.slice(1).toLowerCase()}
                  </Badge>
                  <Badge variant={detailSource.isActive ? "default" : "secondary"}>
                    {detailSource.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <span className="font-medium text-slate-500">Country</span>
                  <p className="text-slate-900">
                    {detailSource.country
                      ? COUNTRY_LABELS[detailSource.country] ||
                        detailSource.country
                      : "Multi-country"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-slate-500">
                    Publication Date
                  </span>
                  <p className="text-slate-900">
                    {formatDate(detailSource.publicationDate)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-slate-500">
                    Publicly Accessible
                  </span>
                  <p className="text-slate-900">
                    {detailSource.isPubliclyAccessible ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-slate-500">Added</span>
                  <p className="text-slate-900">
                    {formatDate(detailSource.createdAt)}
                    {detailSource.addedBy &&
                      ` by ${detailSource.addedBy.name || detailSource.addedBy.email}`}
                  </p>
                </div>
              </div>

              {/* URL */}
              {detailSource.url && (
                <div className="text-sm">
                  <span className="font-medium text-slate-500">URL</span>
                  <p>
                    <a
                      href={detailSource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#00B4D8] hover:underline break-all"
                    >
                      {detailSource.url}
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                    </a>
                  </p>
                </div>
              )}

              {/* Summary */}
              <div className="text-sm">
                <span className="font-medium text-slate-500">Summary</span>
                <p className="mt-1 whitespace-pre-wrap text-slate-900">
                  {detailSource.summary}
                </p>
              </div>

              {/* Verification info */}
              <div className="rounded-lg border bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">
                      Verification Status
                    </h4>
                    <div className="mt-1 flex items-center gap-2 text-slate-600">
                      {(() => {
                        const h = getVerificationHealth(
                          detailSource.lastVerifiedAt
                        );
                        return (
                          <>
                            <span
                              className={`inline-block h-2.5 w-2.5 rounded-full ${h.color}`}
                            />
                            <span>{h.label}</span>
                          </>
                        );
                      })()}
                    </div>
                    {detailSource.lastVerifiedAt && (
                      <p className="mt-1 text-slate-500">
                        Last verified: {formatDate(detailSource.lastVerifiedAt)}
                        {detailSource.lastVerifiedBy &&
                          ` by ${
                            detailSource.lastVerifiedBy.name ||
                            detailSource.lastVerifiedBy.email
                          }`}
                      </p>
                    )}
                    {detailSource.verificationNotes && (
                      <p className="mt-1 text-slate-500">
                        Notes: {detailSource.verificationNotes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVerify(detailSource.id)}
                    disabled={verifyLoading === detailSource.id}
                  >
                    <Shield className="mr-1 h-4 w-4" />
                    {verifyLoading === detailSource.id
                      ? "Verifying..."
                      : "Verify Now"}
                  </Button>
                </div>
              </div>

              {/* Linked data points */}
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-900">
                    Linked Data Points ({detailSource.sourceLinks?.length || 0})
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLinkOpen(true)}
                  >
                    <Link2 className="mr-1 h-4 w-4" />
                    Link Data Point
                  </Button>
                </div>

                {detailSource.sourceLinks &&
                detailSource.sourceLinks.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {detailSource.sourceLinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {LINKED_TYPE_LABELS[link.linkedType] ||
                                link.linkedType}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {link.relevance}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            ID: {link.linkedId}
                            {link.extractedValue &&
                              ` | Value: ${link.extractedValue}`}
                          </p>
                          {link.specificCitation && (
                            <p className="text-xs text-slate-400 italic">
                              &quot;{link.specificCitation}&quot;
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLink(link.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    No data points linked yet.
                  </p>
                )}
              </div>

              {/* Audit Trail for linked data points */}
              {detailSource.sourceLinks && detailSource.sourceLinks.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Change History</h4>
                  <div className="rounded-lg border bg-slate-50 p-4 max-h-60 overflow-y-auto">
                    <AuditTrail
                      linkedType={detailSource.sourceLinks[0].linkedType}
                      linkedId={detailSource.sourceLinks[0].linkedId}
                      maxEntries={10}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* Link Data Point Dialog                                             */}
      {/* ================================================================= */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Data Point</DialogTitle>
            <DialogDescription>
              Connect a data point to this source.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label>Linked Type</Label>
              <Select
                value={linkForm.linkedType}
                onValueChange={(v) =>
                  setLinkForm({ ...linkForm, linkedType: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LINKED_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="link-id">Linked ID *</Label>
              <Input
                id="link-id"
                value={linkForm.linkedId}
                onChange={(e) =>
                  setLinkForm({ ...linkForm, linkedId: e.target.value })
                }
                placeholder="ID of the data point"
              />
            </div>

            <div>
              <Label>Relevance</Label>
              <Select
                value={linkForm.relevance}
                onValueChange={(v) =>
                  setLinkForm({ ...linkForm, relevance: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELEVANCE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="link-citation">Specific Citation</Label>
              <Input
                id="link-citation"
                value={linkForm.specificCitation}
                onChange={(e) =>
                  setLinkForm({
                    ...linkForm,
                    specificCitation: e.target.value,
                  })
                }
                placeholder='e.g. "Section 3.2, Table 4"'
              />
            </div>

            <div>
              <Label htmlFor="link-value">Extracted Value</Label>
              <Input
                id="link-value"
                value={linkForm.extractedValue}
                onChange={(e) =>
                  setLinkForm({
                    ...linkForm,
                    extractedValue: e.target.value,
                  })
                }
                placeholder="e.g. 45.2%"
              />
            </div>

            <div>
              <Label htmlFor="link-notes">Notes</Label>
              <Textarea
                id="link-notes"
                value={linkForm.notes}
                onChange={(e) =>
                  setLinkForm({ ...linkForm, notes: e.target.value })
                }
                rows={2}
              />
            </div>

            <Button
              onClick={handleLink}
              disabled={linkLoading || !linkForm.linkedId}
              className="w-full"
              style={{ backgroundColor: "#00B4D8" }}
            >
              {linkLoading ? "Linking..." : "Link Data Point"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
