"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CountryPicker } from "@/components/ui/country-picker";
import { BENEFIT_CATEGORY_LABELS, formatCurrency } from "@/lib/utils";
import { Loader2, CheckCircle2, Clock, Sparkles, Globe } from "lucide-react";

interface ReferenceBenchmarkRow {
  id: string;
  country: string;
  benefitCategory: string;
  prevalencePercent: number;
  costAvg: number | null;
  costMedian: number | null;
  costP25: number | null;
  costP75: number | null;
  costCurrency: string;
  typicalEmployerContribPct: number | null;
  typicalEmployeeContribPct: number | null;
  pctEmployerFunded: number | null;
  pctCoversSpouse: number | null;
  pctCoversDependents: number | null;
  healthExcess: number | null;
  healthCopayPercent: number | null;
  healthInpatientLimit: number | null;
  healthOutpatientLimit: number | null;
  lifeCoverMultiple: number | null;
  ipBenefitPercent: number | null;
  ipWaitingPeriodWeeks: number | null;
  pensionEmployerPct: number | null;
  pensionEmployeePct: number | null;
  coverageNotes: string | null;
  sourceDescription: string | null;
  sourceUrls: string[];
  generatedAt: string;
  verifiedByAdmin: boolean;
  publishedAt: string | null;
  lastReviewedAt: string | null;
}

export default function ReferenceDataPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ReferenceBenchmarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ReferenceBenchmarkRow>>({});
  const [publishing, setPublishing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = country ? `?country=${country}` : "";
      const res = await fetch(`/api/admin/reference-data${params}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [country]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!session) {
    return <div className="py-12 text-center text-sm text-slate-500">Loading...</div>;
  }

  if (session.user?.role !== "ADMIN") {
    return <p className="p-8 text-slate-500">Admin access required.</p>;
  }

  const totalEntries = data.length;
  const verifiedCount = data.filter((d) => d.verifiedByAdmin).length;
  const publishedCount = data.filter((d) => d.publishedAt).length;

  async function handleGenerate() {
    if (!country) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/reference-data/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      });
      if (res.ok) {
        await fetchData();
      } else {
        const err = await res.json();
        alert(`Generation failed: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish(id: string) {
    setPublishing(id);
    try {
      const res = await fetch("/api/admin/reference-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", id }),
      });
      if (res.ok) await fetchData();
    } finally {
      setPublishing(null);
    }
  }

  async function handlePublishAll() {
    if (!country) return;
    setPublishing("all");
    try {
      const res = await fetch("/api/admin/reference-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_all", country }),
      });
      if (res.ok) await fetchData();
    } finally {
      setPublishing(null);
    }
  }

  function startEdit(row: ReferenceBenchmarkRow) {
    setEditingId(row.id);
    setEditForm({
      prevalencePercent: row.prevalencePercent,
      costMedian: row.costMedian,
      costP25: row.costP25,
      costP75: row.costP75,
      costAvg: row.costAvg,
      pctEmployerFunded: row.pctEmployerFunded,
      pctCoversSpouse: row.pctCoversSpouse,
      pctCoversDependents: row.pctCoversDependents,
      coverageNotes: row.coverageNotes,
      healthExcess: row.healthExcess,
      healthCopayPercent: row.healthCopayPercent,
      lifeCoverMultiple: row.lifeCoverMultiple,
      ipBenefitPercent: row.ipBenefitPercent,
      ipWaitingPeriodWeeks: row.ipWaitingPeriodWeeks,
      pensionEmployerPct: row.pensionEmployerPct,
      pensionEmployeePct: row.pensionEmployeePct,
    });
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    try {
      const res = await fetch("/api/admin/reference-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function getStatus(row: ReferenceBenchmarkRow) {
    if (row.publishedAt) return "Published";
    if (row.verifiedByAdmin) return "Verified";
    return "Draft";
  }

  function getStatusColor(row: ReferenceBenchmarkRow) {
    if (row.publishedAt) return "text-green-600 bg-green-50";
    if (row.verifiedByAdmin) return "text-blue-600 bg-blue-50";
    return "text-amber-600 bg-amber-50";
  }

  function isStale(row: ReferenceBenchmarkRow) {
    const gen = new Date(row.generatedAt);
    const now = new Date();
    const diffMs = now.getTime() - gen.getTime();
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30);
    return diffMonths > 12;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reference Data</h1>
        <p className="mt-1 text-slate-500">
          AI-generated market benchmarks for countries without enough peer data
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Total Entries</p>
          <p className="text-2xl font-bold text-slate-900">{totalEntries}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Verified</p>
          <p className="text-2xl font-bold text-blue-600">{verifiedCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Published</p>
          <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Filter by Country
          </label>
          <CountryPicker value={country} onChange={setCountry} />
        </div>
        {country && (
          <>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? "Generating..." : "Generate for Country"}
            </Button>
            {data.length > 0 && (
              <Button
                variant="outline"
                onClick={handlePublishAll}
                disabled={publishing === "all"}
                className="gap-2"
              >
                {publishing === "all" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                Publish All for Country
              </Button>
            )}
          </>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Loading reference data...
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-lg font-medium text-slate-700">
            No reference data found
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Select a country and click &ldquo;Generate for Country&rdquo; to
            create AI-generated reference benchmarks.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">
                  Country
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Category
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Prevalence
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Median Cost
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{row.country}</td>
                  <td className="px-4 py-3">
                    {BENEFIT_CATEGORY_LABELS[row.benefitCategory] ??
                      row.benefitCategory}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === row.id ? (
                      <input
                        type="number"
                        value={editForm.prevalencePercent ?? ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            prevalencePercent: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-20 rounded border px-2 py-1 text-sm"
                      />
                    ) : (
                      `${row.prevalencePercent}%`
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === row.id ? (
                      <input
                        type="number"
                        value={editForm.costMedian ?? ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            costMedian:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value),
                          })
                        }
                        className="w-24 rounded border px-2 py-1 text-sm"
                      />
                    ) : row.costMedian !== null ? (
                      formatCurrency(row.costMedian, row.costCurrency)
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(row)}`}
                    >
                      {getStatus(row) === "Published" && (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {getStatus(row)}
                    </span>
                    {isStale(row) && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        <Clock className="h-3 w-3" />
                        Stale
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {editingId === row.id ? (
                        <>
                          <Button size="sm" onClick={handleSaveEdit}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(row)}
                          >
                            Edit
                          </Button>
                          {!row.publishedAt && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={publishing === row.id}
                              onClick={() => handlePublish(row.id)}
                            >
                              {publishing === row.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Publish"
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
