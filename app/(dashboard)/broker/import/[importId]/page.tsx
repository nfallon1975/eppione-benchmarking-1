"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Play, ArrowLeft, CheckCircle2 } from "lucide-react";
import { ImportStatusBadge } from "@/components/import/import-status-badge";
import { SpreadsheetPreview } from "@/components/import/spreadsheet-preview";
import { MappingTable } from "@/components/import/mapping-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ColumnMappingData {
  id: string;
  sourceColumn: string;
  sourceColumnIndex: number;
  targetField: string | null;
  targetFieldLabel: string | null;
  targetBenefitCategory: string | null;
  confidence: number;
  status: string;
  sampleValues: string[];
  detectedType: string;
  transformRule: string | null;
  aiReasoning: string | null;
}

interface ImportData {
  id: string;
  filename: string;
  status: string;
  totalRows: number;
  rawHeaders: string[];
  sampleData: Record<string, string>[];
  anonymise: boolean;
  companiesCreated: number;
  entriesCreated: number;
  columnMappings: ColumnMappingData[];
  template: { id: string; name: string } | null;
  assignedBroker: { id: string; name: string; email: string } | null;
}

export default function ImportReviewPage() {
  const params = useParams();
  const router = useRouter();
  const importId = params.importId as string;

  const [data, setData] = useState<ImportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [localMappings, setLocalMappings] = useState<ColumnMappingData[]>([]);
  const [dirty, setDirty] = useState(false);

  const fetchImport = useCallback(async () => {
    try {
      const res = await fetch(`/api/import/${importId}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setLocalMappings(d.columnMappings);
      } else {
        setError("Import not found");
      }
    } catch {
      setError("Failed to load import");
    } finally {
      setLoading(false);
    }
  }, [importId]);

  useEffect(() => {
    fetchImport();
  }, [fetchImport]);

  function handleMappingChange(mappingId: string, field: string, value: string | null) {
    setLocalMappings((prev) =>
      prev.map((m) => {
        if (m.id !== mappingId) return m;
        return { ...m, [field]: value, status: "USER_OVERRIDDEN" };
      })
    );
    setDirty(true);
  }

  async function saveMappings() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/import/${importId}/mappings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappings: localMappings.map((m) => ({
            id: m.id,
            targetField: m.targetField,
            targetFieldLabel: m.targetFieldLabel,
            targetBenefitCategory: m.targetBenefitCategory,
            transformRule: m.transformRule,
            userOverridden: m.status === "USER_OVERRIDDEN",
          })),
        }),
      });
      if (res.ok) {
        setDirty(false);
        fetchImport();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to save mappings");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAnonymiseToggle(value: boolean) {
    try {
      await fetch(`/api/import/${importId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymise: value }),
      });
      setData((prev) => prev ? { ...prev, anonymise: value } : null);
    } catch {
      setError("Failed to update anonymisation setting");
    }
  }

  async function approveAndExecute() {
    setExecuting(true);
    setError("");
    try {
      // Save any pending mapping changes first
      if (dirty) await saveMappings();

      // Approve
      await fetch(`/api/import/${importId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      // Execute
      const res = await fetch(`/api/import/${importId}/execute`, {
        method: "POST",
      });

      if (res.ok) {
        fetchImport();
      } else {
        const d = await res.json();
        setError(d.error || "Import execution failed");
        fetchImport();
      }
    } catch {
      setError("Network error during import");
    } finally {
      setExecuting(false);
    }
  }

  async function saveAsTemplate() {
    try {
      const res = await fetch(`/api/import/${importId}/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName }),
      });
      if (res.ok) {
        setShowSaveTemplate(false);
        setTemplateName("");
        fetchImport();
      }
    } catch {
      setError("Failed to save template");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return <div className="py-10 text-center text-red-500">{error || "Import not found"}</div>;
  }

  const mappedCount = localMappings.filter((m) => m.targetField).length;
  const totalColumns = localMappings.length;
  const hasCompanyField = localMappings.some((m) => m.targetField === "companyName");
  const isReviewable = data.status === "REVIEW";
  const isCompleted = data.status === "COMPLETED";

  // Build mapped columns lookup for preview highlighting
  const mappedColumns: Record<string, string> = {};
  for (const m of localMappings) {
    if (m.targetField) {
      mappedColumns[m.sourceColumn] = m.targetFieldLabel || m.targetField;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/broker/import")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{data.filename}</h1>
            <div className="flex items-center gap-3 mt-1">
              <ImportStatusBadge status={data.status} />
              <span className="text-sm text-slate-500">{data.totalRows} rows</span>
              <span className="text-sm text-slate-500">{mappedCount}/{totalColumns} columns mapped</span>
            </div>
          </div>
        </div>
        {isReviewable && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSaveTemplate(true)}>
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </Button>
            {dirty && (
              <Button variant="outline" size="sm" onClick={saveMappings} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            )}
            <Button
              size="sm"
              onClick={approveAndExecute}
              disabled={executing || !hasCompanyField}
            >
              {executing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>
              ) : (
                <><Play className="mr-2 h-4 w-4" />Approve & Import</>
              )}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {isCompleted && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Import Complete</p>
              <p className="text-sm text-green-600">
                {data.companiesCreated} companies created, {data.entriesCreated} benefit entries imported.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasCompanyField && isReviewable && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          No column is mapped to &quot;Company Name&quot;. At least one column must identify the company to proceed.
        </div>
      )}

      {isReviewable && (
        <Card>
          <CardContent className="flex items-center gap-6 py-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={data.anonymise}
                onCheckedChange={handleAnonymiseToggle}
              />
              <Label className="text-sm">
                {data.anonymise
                  ? "Anonymise company names (generate codes)"
                  : "Retain original company names"}
              </Label>
            </div>
            {data.template && (
              <span className="text-xs text-slate-500">
                Template: {data.template.name}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spreadsheet Preview</CardTitle>
            <CardDescription>First {Math.min(5, data.sampleData?.length || 0)} rows</CardDescription>
          </CardHeader>
          <CardContent>
            <SpreadsheetPreview
              headers={data.rawHeaders}
              sampleData={data.sampleData || []}
              mappedColumns={mappedColumns}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Column Mappings</CardTitle>
            <CardDescription>
              Review and adjust how each column maps to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MappingTable
              mappings={localMappings}
              onMappingChange={handleMappingChange}
            />
          </CardContent>
        </Card>
      </div>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save this column mapping so future uploads with the same format are mapped automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Mercer Standard Export"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplate(false)}>Cancel</Button>
            <Button onClick={saveAsTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
