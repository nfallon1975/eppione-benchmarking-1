"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { ImportStatusBadge } from "@/components/import/import-status-badge";

interface ImportRecord {
  id: string;
  filename: string;
  status: string;
  totalRows: number;
  companiesCreated: number;
  entriesCreated: number;
  anonymise: boolean;
  createdAt: string;
}

export default function BrokerImportPage() {
  const router = useRouter();
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [anonymise, setAnonymise] = useState(true);

  const fetchImports = useCallback(async () => {
    try {
      const res = await fetch("/api/import");
      if (res.ok) {
        const data = await res.json();
        setImports(data);
      }
    } catch {
      console.error("Failed to fetch imports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("anonymise", String(anonymise));

    try {
      const res = await fetch("/api/import/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        if (data.status === "REVIEW") {
          // Template matched — go straight to review
          router.push(`/broker/import/${data.importId}`);
        } else {
          // Need AI mapping — trigger it
          const mapRes = await fetch(`/api/import/${data.importId}/map`, {
            method: "POST",
          });
          if (mapRes.ok) {
            router.push(`/broker/import/${data.importId}`);
          } else {
            const mapErr = await mapRes.json();
            setError(mapErr.error || "AI mapping failed");
            fetchImports();
          }
        }
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Network error during upload");
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Smart Import</h1>
        <p className="mt-1 text-slate-500">
          Upload client benefit data in any spreadsheet format. AI will map your columns automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Spreadsheet
          </CardTitle>
          <CardDescription>
            Accepts .xlsx, .csv, or .tsv files up to 10MB. Your columns will be automatically mapped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={anonymise}
                onCheckedChange={setAnonymise}
              />
              <Label className="text-sm">
                {anonymise ? "Anonymise company names" : "Retain company names"}
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label
              htmlFor="file-upload"
              className="flex cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-sm text-slate-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Uploading & mapping...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-5 w-5" />
                  Click to select a spreadsheet file
                </>
              )}
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv,.tsv"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previous Imports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : imports.length === 0 ? (
            <p className="text-sm text-slate-400">No imports yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Companies</TableHead>
                  <TableHead>Benefits</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell className="font-medium text-sm">{imp.filename}</TableCell>
                    <TableCell><ImportStatusBadge status={imp.status} /></TableCell>
                    <TableCell className="text-sm">{imp.totalRows}</TableCell>
                    <TableCell className="text-sm">{imp.companiesCreated || "—"}</TableCell>
                    <TableCell className="text-sm">{imp.entriesCreated || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(imp.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {["REVIEW", "APPROVED", "PARSED"].includes(imp.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/broker/import/${imp.id}`)}
                        >
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
