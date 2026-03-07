"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  ArrowLeft,
  Check,
  X,
  Pencil,
  CheckCircle,
  XCircle,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { COUNTRY_LABELS, BENEFIT_CATEGORY_LABELS } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractedDataPoint {
  id: string;
  pageNumber: number | null;
  rawText: string | null;
  country: string;
  industry: string | null;
  benefitCategory: string;
  metricType: string | null;
  metricLabel: string | null;
  value: number | null;
  unit: string | null;
  currency: string | null;
  percentile25: number | null;
  percentile75: number | null;
  salaryBand: string | null;
  companySize: string | null;
  aiConfidence: number | null;
  status: string;
  adminEditedValue: number | null;
  notes: string | null;
}

interface PDFIngestion {
  id: string;
  filename: string;
  status: string;
  sourceCountry: string;
  sourceName: string;
  sourcePublisher: string;
  sourceYear: number;
  sourceType: string;
  pageCount: number | null;
  processingCost: number | null;
  errorMessage: string | null;
  extractedPoints: ExtractedDataPoint[];
}

interface ImportResult {
  imported: number;
  skipped: number;
  conflicts: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReviewPage() {
  const params = useParams();
  const id = params.id as string;

  const [ingestion, setIngestion] = useState<PDFIngestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Editing state
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingPointId, setSavingPointId] = useState<string | null>(null);

  // Expanded raw text
  const [expandedRawText, setExpandedRawText] = useState<Set<string>>(
    new Set()
  );

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchIngestion = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/pdf-ingestion/${id}`);
      if (res.ok) {
        const data = await res.json();
        setIngestion(data);
      }
    } catch (err) {
      console.error("Failed to fetch ingestion", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIngestion();
  }, [fetchIngestion]);

  // ---------------------------------------------------------------------------
  // Single point actions
  // ---------------------------------------------------------------------------

  const updatePoint = async (
    pointId: string,
    status: string,
    adminEditedValue?: number | null,
    notes?: string
  ) => {
    setSavingPointId(pointId);
    try {
      const body: Record<string, unknown> = { pointId, status };
      if (adminEditedValue !== undefined) body.adminEditedValue = adminEditedValue;
      if (notes !== undefined) body.notes = notes;

      const res = await fetch(`/api/admin/pdf-ingestion/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchIngestion();
        setEditingPointId(null);
      } else {
        const err = await res.json();
        alert(err.error || "Update failed");
      }
    } catch (err) {
      console.error("Update error", err);
    } finally {
      setSavingPointId(null);
    }
  };

  const handleConfirm = (pointId: string) => {
    updatePoint(pointId, "CONFIRMED");
  };

  const handleReject = (pointId: string) => {
    updatePoint(pointId, "REJECTED");
  };

  const handleStartEdit = (point: ExtractedDataPoint) => {
    setEditingPointId(point.id);
    setEditValue(
      String(point.adminEditedValue ?? point.value ?? "")
    );
    setEditNotes(point.notes || "");
  };

  const handleSaveEdit = () => {
    if (!editingPointId) return;
    const numValue = editValue ? Number(editValue) : null;
    updatePoint(editingPointId, "EDITED", numValue, editNotes);
  };

  const handleCancelEdit = () => {
    setEditingPointId(null);
    setEditValue("");
    setEditNotes("");
  };

  // ---------------------------------------------------------------------------
  // Bulk actions
  // ---------------------------------------------------------------------------

  const handleBulkAction = async (action: "confirm_all" | "reject_all") => {
    setBulkLoading(true);
    try {
      const res = await fetch(`/api/admin/pdf-ingestion/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        await fetchIngestion();
      } else {
        const err = await res.json();
        alert(err.error || "Bulk action failed");
      }
    } catch (err) {
      console.error("Bulk action error", err);
    } finally {
      setBulkLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------

  const handleImport = async () => {
    setImportLoading(true);
    try {
      const res = await fetch(`/api/admin/pdf-ingestion/${id}/import`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setImportResult(data);
        setImportDialogOpen(true);
        await fetchIngestion();
      } else {
        const err = await res.json();
        alert(err.error || "Import failed");
      }
    } catch (err) {
      console.error("Import error", err);
    } finally {
      setImportLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const toggleRawText = (pointId: string) => {
    setExpandedRawText((prev) => {
      const next = new Set(prev);
      if (next.has(pointId)) {
        next.delete(pointId);
      } else {
        next.add(pointId);
      }
      return next;
    });
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return "text-slate-400";
    if (confidence > 0.8) return "text-green-600";
    if (confidence >= 0.5) return "text-amber-600";
    return "text-red-600";
  };

  const getConfidenceBg = (confidence: number | null) => {
    if (confidence === null) return "bg-slate-100";
    if (confidence > 0.8) return "bg-green-100";
    if (confidence >= 0.5) return "bg-amber-100";
    return "bg-red-100";
  };

  const getRowClassName = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-50";
      case "EDITED":
        return "bg-blue-50";
      case "REJECTED":
        return "bg-red-50/50";
      default:
        return "";
    }
  };

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const points = ingestion?.extractedPoints || [];
  const stats = {
    total: points.length,
    confirmed: points.filter((p) => p.status === "CONFIRMED").length,
    edited: points.filter((p) => p.status === "EDITED").length,
    rejected: points.filter((p) => p.status === "REJECTED").length,
    pending: points.filter((p) => p.status === "EXTRACTED").length,
  };

  const hasConfirmedOrEdited = stats.confirmed + stats.edited > 0;
  const isApproved = ingestion?.status === "APPROVED";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ingestion) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Ingestion not found.</p>
        <Link href="/admin/baseline/import-pdf" className="text-blue-600 underline mt-2 block">
          Back to PDF Import
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/baseline/import-pdf">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{ingestion.filename}</h1>
            <p className="text-sm text-muted-foreground">
              {ingestion.sourceName} &middot; {ingestion.sourcePublisher} &middot;{" "}
              {COUNTRY_LABELS[ingestion.sourceCountry] || ingestion.sourceCountry} &middot;{" "}
              {ingestion.sourceYear}
              {ingestion.processingCost != null && (
                <> &middot; Cost: ${ingestion.processingCost.toFixed(4)}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction("confirm_all")}
            disabled={bulkLoading || stats.pending === 0}
          >
            {bulkLoading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <CheckCircle className="h-3 w-3 mr-1" />
            )}
            Confirm All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction("reject_all")}
            disabled={bulkLoading || stats.pending === 0}
          >
            {bulkLoading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            Reject All
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={!hasConfirmedOrEdited || isApproved || importLoading}
          >
            {importLoading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Download className="h-3 w-3 mr-1" />
            )}
            Import to Baseline
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Points</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.edited}</p>
            <p className="text-xs text-muted-foreground">Edited</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Points Table */}
      <Card>
        <CardHeader>
          <CardTitle>Extracted Data Points</CardTitle>
        </CardHeader>
        <CardContent>
          {points.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              No data points extracted yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Page</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead className="w-[120px]">Value</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="w-[90px]">Confidence</TableHead>
                    <TableHead className="w-[150px]">Raw Context</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[130px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {points.map((point) => {
                    const isEditing = editingPointId === point.id;
                    const isSaving = savingPointId === point.id;
                    const isRejected = point.status === "REJECTED";
                    const isExpanded = expandedRawText.has(point.id);
                    const displayValue =
                      point.adminEditedValue ?? point.value;
                    const categoryLabel =
                      BENEFIT_CATEGORY_LABELS[point.benefitCategory] ||
                      point.benefitCategory;
                    const countryLabel =
                      COUNTRY_LABELS[point.country] || point.country;

                    return (
                      <TableRow
                        key={point.id}
                        className={getRowClassName(point.status)}
                      >
                        <TableCell className="text-center">
                          {point.pageNumber ?? "-"}
                        </TableCell>
                        <TableCell
                          className={
                            isRejected ? "line-through text-muted-foreground" : ""
                          }
                        >
                          {categoryLabel}
                        </TableCell>
                        <TableCell
                          className={
                            isRejected ? "line-through text-muted-foreground" : ""
                          }
                        >
                          <div>
                            {point.metricLabel || point.metricType || "-"}
                          </div>
                          {point.salaryBand && (
                            <span className="text-xs text-muted-foreground">
                              Band: {point.salaryBand}
                            </span>
                          )}
                          {point.companySize && (
                            <span className="text-xs text-muted-foreground block">
                              Size: {point.companySize}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="space-y-2">
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 w-full"
                                step="any"
                              />
                              <Textarea
                                placeholder="Notes (optional)"
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="text-xs"
                                rows={2}
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={handleSaveEdit}
                                  disabled={isSaving}
                                  className="h-7 text-xs"
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  className="h-7 text-xs"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span
                              className={
                                isRejected
                                  ? "line-through text-muted-foreground"
                                  : ""
                              }
                            >
                              {displayValue != null ? displayValue : "-"}
                              {point.adminEditedValue != null &&
                                point.value != null &&
                                point.adminEditedValue !== point.value && (
                                  <span className="text-xs text-muted-foreground block">
                                    (was: {point.value})
                                  </span>
                                )}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {point.unit || "-"}
                          {point.currency && (
                            <span className="text-xs text-muted-foreground block">
                              {point.currency}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{countryLabel}</TableCell>
                        <TableCell>
                          {point.aiConfidence != null ? (
                            <Badge
                              className={`${getConfidenceBg(
                                point.aiConfidence
                              )} ${getConfidenceColor(point.aiConfidence)} border-0`}
                            >
                              {(point.aiConfidence * 100).toFixed(0)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {point.rawText ? (
                            <div>
                              <button
                                onClick={() => toggleRawText(point.id)}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                                {isExpanded ? "Collapse" : "Expand"}
                              </button>
                              {isExpanded ? (
                                <p className="text-xs text-muted-foreground mt-1 max-w-[200px] whitespace-pre-wrap">
                                  {point.rawText}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate">
                                  {point.rawText}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              point.status === "CONFIRMED"
                                ? "bg-green-100 text-green-700"
                                : point.status === "EDITED"
                                ? "bg-blue-100 text-blue-700"
                                : point.status === "REJECTED"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-700"
                            }
                          >
                            {point.status === "EXTRACTED"
                              ? "Pending"
                              : point.status.charAt(0) +
                                point.status.slice(1).toLowerCase()}
                          </Badge>
                          {point.notes && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-[100px] truncate">
                              {point.notes}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {!isEditing && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
                                onClick={() => handleConfirm(point.id)}
                                disabled={
                                  isSaving || point.status === "CONFIRMED"
                                }
                                title="Confirm"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                onClick={() => handleStartEdit(point)}
                                disabled={isSaving}
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                onClick={() => handleReject(point.id)}
                                disabled={
                                  isSaving || point.status === "REJECTED"
                                }
                                title="Reject"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Results Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Complete</DialogTitle>
            <DialogDescription>
              Data points have been imported to the baseline.
            </DialogDescription>
          </DialogHeader>
          {importResult && (
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-600">
                    {importResult.imported}
                  </p>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-slate-600">
                    {importResult.skipped}
                  </p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-amber-600">
                    {importResult.conflicts}
                  </p>
                  <p className="text-xs text-muted-foreground">Conflicts</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button onClick={() => setImportDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
