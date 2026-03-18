"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface BrokerUser {
  id: string;
  name: string | null;
  email: string;
}

interface ImportRecord {
  id: string;
  filename: string;
  status: string;
  totalRows: number;
  companiesCreated: number;
  entriesCreated: number;
  anonymise: boolean;
  createdAt: string;
  assignedBroker: { name: string; email: string } | null;
  uploadedByBroker: { name: string } | null;
  uploadedByAdmin: { name: string } | null;
}

export default function AdminImportPage() {
  const router = useRouter();
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [brokers, setBrokers] = useState<BrokerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [anonymise, setAnonymise] = useState(true);
  const [selectedBrokerId, setSelectedBrokerId] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [importsRes, brokersRes] = await Promise.all([
        fetch("/api/import"),
        fetch("/api/admin/brokers"),
      ]);
      if (importsRes.ok) setImports(await importsRes.json());
      if (brokersRes.ok) {
        const data = await brokersRes.json();
        setBrokers(Array.isArray(data) ? data : data.brokers || []);
      }
    } catch {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("anonymise", String(anonymise));
    if (selectedBrokerId) {
      formData.append("assignedBrokerId", selectedBrokerId);
    }

    try {
      const res = await fetch("/api/import/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        if (data.status === "REVIEW") {
          router.push(`/broker/import/${data.importId}`);
        } else {
          const mapRes = await fetch(`/api/import/${data.importId}/map`, {
            method: "POST",
          });
          if (mapRes.ok) {
            router.push(`/broker/import/${data.importId}`);
          } else {
            const mapErr = await mapRes.json();
            setError(mapErr.error || "AI mapping failed");
            fetchData();
          }
        }
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Network error during upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Smart Import (Admin)</h1>
        <p className="mt-1 text-slate-500">
          Upload client benefit data on behalf of brokers. Assign a broker so they can see the imported clients.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Spreadsheet
          </CardTitle>
          <CardDescription>
            Accepts .xlsx, .csv, or .tsv files up to 10MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Assign to Broker</Label>
              <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
                <SelectTrigger>
                  <SelectValue placeholder="No broker (admin only)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No broker assigned</SelectItem>
                  {brokers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name || b.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={anonymise} onCheckedChange={setAnonymise} />
              <Label className="text-sm">
                {anonymise ? "Anonymise company names" : "Retain company names"}
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label
              htmlFor="admin-file-upload"
              className="flex cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-sm text-slate-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              {uploading ? (
                <><Loader2 className="h-5 w-5 animate-spin" />Uploading & mapping...</>
              ) : (
                <><FileSpreadsheet className="h-5 w-5" />Click to select a spreadsheet file</>
              )}
            </Label>
            <Input
              id="admin-file-upload"
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
          <CardTitle>All Imports</CardTitle>
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
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Assigned Broker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell className="font-medium text-sm">{imp.filename}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {imp.uploadedByAdmin?.name || imp.uploadedByBroker?.name || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {imp.assignedBroker?.name || imp.assignedBroker?.email || "Unassigned"}
                    </TableCell>
                    <TableCell><ImportStatusBadge status={imp.status} /></TableCell>
                    <TableCell className="text-sm">{imp.totalRows}</TableCell>
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
