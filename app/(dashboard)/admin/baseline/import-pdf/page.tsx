"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Loader2,
  Trash2,
  Play,
  Eye,
  FileText,
  ClipboardCheck,
} from "lucide-react";
import { COUNTRY_LABELS } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PDFIngestion {
  id: string;
  filename: string;
  fileHash: string;
  filePath: string;
  pageCount: number | null;
  uploadedAt: string;
  status: string;
  sourceCountry: string;
  sourceName: string;
  sourcePublisher: string;
  sourceYear: number;
  sourceType: string;
  licenseNotes: string | null;
  errorMessage: string | null;
  processingCost: number | null;
  createdAt: string;
  _count: { extractedPoints: number };
}

const SOURCE_TYPE_OPTIONS = [
  { value: "INDUSTRY_SURVEY", label: "Industry Survey" },
  { value: "INSURER_REPORT", label: "Insurer Report" },
  { value: "GOVERNMENT_DATA", label: "Government Data" },
  { value: "CONSULTANCY_REPORT", label: "Consultancy Report" },
  { value: "TRADE_BODY", label: "Trade Body" },
  { value: "OTHER", label: "Other" },
];

const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; variant: string; className: string }
> = {
  UPLOADED: {
    label: "Uploaded",
    variant: "secondary",
    className: "bg-slate-100 text-slate-700",
  },
  PROCESSING: {
    label: "Processing",
    variant: "secondary",
    className: "bg-blue-100 text-blue-700 animate-pulse",
  },
  REVIEW_READY: {
    label: "Review Ready",
    variant: "secondary",
    className: "bg-amber-100 text-amber-700",
  },
  APPROVED: {
    label: "Approved",
    variant: "secondary",
    className: "bg-green-100 text-green-700",
  },
  REJECTED: {
    label: "Rejected",
    variant: "secondary",
    className: "bg-red-100 text-red-700",
  },
  ERROR: {
    label: "Error",
    variant: "secondary",
    className: "bg-red-100 text-red-700",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportPDFPage() {
  useSession();

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceCountry, setSourceCountry] = useState("");
  const [sourcePublisher, setSourcePublisher] = useState("");
  const [sourceYear, setSourceYear] = useState(new Date().getFullYear());
  const [sourceType, setSourceType] = useState("INDUSTRY_SURVEY");
  const [licenseNotes, setLicenseNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    filename: string;
    pageCount: number | null;
    id: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History state
  const [ingestions, setIngestions] = useState<PDFIngestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch ingestions
  // ---------------------------------------------------------------------------

  const fetchIngestions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pdf-ingestion");
      if (res.ok) {
        const data = await res.json();
        setIngestions(data);
      }
    } catch (err) {
      console.error("Failed to fetch ingestions", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIngestions();
  }, [fetchIngestions]);

  // Auto-refresh when any ingestion is PROCESSING
  useEffect(() => {
    const hasProcessing = ingestions.some((i) => i.status === "PROCESSING");
    if (!hasProcessing) return;

    const interval = setInterval(fetchIngestions, 10_000);
    return () => clearInterval(interval);
  }, [ingestions, fetchIngestions]);

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceName", sourceName);
      formData.append("sourceCountry", sourceCountry);
      formData.append("sourcePublisher", sourcePublisher);
      formData.append("sourceYear", String(sourceYear));
      formData.append("sourceType", sourceType);
      formData.append("licenseNotes", licenseNotes);

      const res = await fetch("/api/admin/pdf-ingestion", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Upload failed");
        return;
      }

      const data = await res.json();
      setUploadResult({
        filename: data.filename,
        pageCount: data.pageCount,
        id: data.id,
      });

      // Reset form
      setFile(null);
      setSourceName("");
      setSourceCountry("");
      setSourcePublisher("");
      setSourceYear(new Date().getFullYear());
      setSourceType("INDUSTRY_SURVEY");
      setLicenseNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh list
      fetchIngestions();
    } catch (err) {
      console.error("Upload error", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Process
  // ---------------------------------------------------------------------------

  const handleProcess = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/pdf-ingestion/${id}/process`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Processing failed to start");
      }
      fetchIngestions();
    } catch (err) {
      console.error("Process error", err);
    } finally {
      setProcessingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/pdf-ingestion/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Delete failed");
      }
      fetchIngestions();
    } catch (err) {
      console.error("Delete error", err);
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">PDF Data Import</h1>
        <p className="text-muted-foreground mt-1">
          Upload PDF reports to extract benchmarking data using AI
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload PDF
          </CardTitle>
          <CardDescription>
            Upload a benefits survey or industry report PDF for AI extraction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="pdf-file">PDF File</Label>
              <Input
                id="pdf-file"
                type="file"
                accept=".pdf"
                ref={fileInputRef}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="source-name">Source Name</Label>
              <Input
                id="source-name"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g. Mercer Benefits Survey 2025"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="source-country">Source Country</Label>
              <Input
                id="source-country"
                value={sourceCountry}
                onChange={(e) => setSourceCountry(e.target.value)}
                placeholder="e.g. IE, GB, DE"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="source-publisher">Source Publisher</Label>
              <Input
                id="source-publisher"
                value={sourcePublisher}
                onChange={(e) => setSourcePublisher(e.target.value)}
                placeholder="e.g. Mercer"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="source-year">Source Year</Label>
              <Input
                id="source-year"
                type="number"
                value={sourceYear}
                onChange={(e) => setSourceYear(Number(e.target.value))}
                min={2000}
                max={2100}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="source-type">Source Type</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="license-notes">License Notes</Label>
              <Textarea
                id="license-notes"
                value={licenseNotes}
                onChange={(e) => setLicenseNotes(e.target.value)}
                placeholder="Any licensing restrictions or usage notes..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <Button
              onClick={handleUpload}
              disabled={!file || !sourceName || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload PDF
                </>
              )}
            </Button>

            {uploadResult && (
              <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
                Uploaded <strong>{uploadResult.filename}</strong>
                {uploadResult.pageCount && (
                  <> ({uploadResult.pageCount} pages)</>
                )}
                . Ready for processing.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ingestion History
          </CardTitle>
          <CardDescription>
            {ingestions.some((i) => i.status === "PROCESSING") && (
              <span className="text-blue-600">
                Auto-refreshing while processing...
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : ingestions.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              No PDF ingestions yet. Upload a PDF to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingestions.map((ing) => {
                    const badge = STATUS_BADGE_CONFIG[ing.status] || {
                      label: ing.status,
                      variant: "secondary",
                      className: "",
                    };
                    const countryLabel =
                      COUNTRY_LABELS[ing.sourceCountry] || ing.sourceCountry;

                    return (
                      <TableRow key={ing.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {ing.filename}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {ing.sourceName}
                        </TableCell>
                        <TableCell>{countryLabel}</TableCell>
                        <TableCell>{ing.sourceYear}</TableCell>
                        <TableCell>
                          <Badge className={badge.className}>
                            {badge.label}
                          </Badge>
                          {ing.status === "ERROR" && ing.errorMessage && (
                            <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate">
                              {ing.errorMessage}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {ing._count.extractedPoints}
                        </TableCell>
                        <TableCell className="text-right">
                          {ing.processingCost != null
                            ? `$${ing.processingCost.toFixed(4)}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(ing.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {(ing.status === "UPLOADED" ||
                              ing.status === "ERROR") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProcess(ing.id)}
                                disabled={processingId === ing.id}
                              >
                                {processingId === ing.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                                <span className="ml-1">Process</span>
                              </Button>
                            )}

                            {ing.status === "REVIEW_READY" && (
                              <Link
                                href={`/admin/baseline/import-pdf/${ing.id}/review`}
                              >
                                <Button size="sm" variant="outline">
                                  <ClipboardCheck className="h-3 w-3 mr-1" />
                                  Review
                                </Button>
                              </Link>
                            )}

                            {ing.status === "APPROVED" && (
                              <Link
                                href={`/admin/baseline/import-pdf/${ing.id}/review`}
                              >
                                <Button size="sm" variant="ghost">
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </Link>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => {
                                setDeleteId(ing.id);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ingestion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this PDF ingestion and all
              extracted data points? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeleteId(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
