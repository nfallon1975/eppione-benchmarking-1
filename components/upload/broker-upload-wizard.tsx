"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { CsvUploadZone } from "./csv-upload-zone";
import { UploadPreviewTable } from "./upload-preview-table";
import { UploadResultDialog } from "./upload-result-dialog";
import { parseCSV, validateRows, type RowValidationResult } from "@/lib/upload-utils";
import { brokerClientRowSchema, type BrokerClientUploadRow } from "@/lib/upload-schemas";

const PREVIEW_COLUMNS = [
  { key: "companyName", label: "Company" },
  { key: "companyEmail", label: "Email" },
  { key: "country", label: "Country" },
  { key: "benefitCategory", label: "Category" },
  { key: "benefitName", label: "Benefit Name" },
  { key: "coverLevel", label: "Cover Level" },
  { key: "isCore", label: "Core" },
  { key: "annualCostPerEmployee", label: "Annual Cost" },
];

export function BrokerUploadWizard() {
  const [step, setStep] = useState(1);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | undefined>();
  const [fileSize, setFileSize] = useState<number | undefined>();
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<
    RowValidationResult<BrokerClientUploadRow>[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    companiesProcessed: number;
    companiesCreated: number;
    companiesUpdated: number;
    entriesCreated: number;
  } | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  function handleFileLoaded(text: string, name: string) {
    setCsvText(text);
    setFilename(name);
    setFileSize(new Blob([text]).size);

    const { data, errors } = parseCSV(text);
    setParseErrors(errors);
    const results = validateRows(data, brokerClientRowSchema);
    setValidationResults(results);
  }

  function handleClear() {
    setCsvText(null);
    setFilename(undefined);
    setFileSize(undefined);
    setParseErrors([]);
    setValidationResults([]);
    setExpandedCompanies(new Set());
    setStep(1);
  }

  async function handleSubmit() {
    const validRows = validationResults
      .filter((r) => r.valid && r.data)
      .map((r) => r.data!);

    if (validRows.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/upload/broker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Upload failed");
        return;
      }

      const data = await res.json();
      setResultData(data);
      setResultOpen(true);
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleResultClose() {
    setResultOpen(false);
    handleClear();
  }

  const validCount = validationResults.filter((r) => r.valid).length;

  // Group valid results by company for step 2 summary
  const companySummary = new Map<string, { email: string; rows: number; countries: Set<string> }>();
  for (const r of validationResults.filter((r) => r.valid && r.data)) {
    const name = r.data!.companyName;
    if (!companySummary.has(name)) {
      companySummary.set(name, { email: r.data!.companyEmail, rows: 0, countries: new Set() });
    }
    const entry = companySummary.get(name)!;
    entry.rows++;
    entry.countries.add(r.data!.country);
  }

  function toggleCompany(name: string) {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <Badge
            key={s}
            variant={step === s ? "default" : step > s ? "success" : "secondary"}
            className="px-3 py-1"
          >
            Step {s}
          </Badge>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Client Benefits</CardTitle>
            <CardDescription>
              Download the template, fill in benefits for multiple client companies, then upload the completed CSV.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              onClick={() => {
                window.open("/api/upload/template?type=broker_clients", "_blank");
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>

            <CsvUploadZone
              onFileLoaded={handleFileLoaded}
              onClear={handleClear}
              filename={filename}
              fileSize={fileSize}
            />

            {parseErrors.length > 0 && (
              <div className="rounded-md bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">Parse warnings:</p>
                {parseErrors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-700">{e}</p>
                ))}
              </div>
            )}

            {csvText && (
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={validationResults.length === 0}>
                  Preview Data
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview & Validate</CardTitle>
            <CardDescription>
              Review the data grouped by company. Only valid rows will be uploaded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company summary */}
            <div className="space-y-2">
              {Array.from(companySummary.entries()).map(([name, info]) => (
                <div key={name} className="rounded-md border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between p-3 text-left hover:bg-slate-50"
                    onClick={() => toggleCompany(name)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedCompanies.has(name) ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                      <span className="font-medium">{name}</span>
                      <Badge variant="secondary" className="text-xs">{info.email}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{info.rows} benefits</Badge>
                      <Badge variant="outline">{info.countries.size} countries</Badge>
                    </div>
                  </button>
                  {expandedCompanies.has(name) && (
                    <div className="border-t p-3">
                      <UploadPreviewTable
                        columns={PREVIEW_COLUMNS}
                        results={validationResults.filter(
                          (r) => r.valid && r.data?.companyName === name
                        )}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Full table for errors */}
            {validationResults.some((r) => !r.valid) && (
              <div>
                <p className="mb-2 text-sm font-medium text-red-600">Rows with errors:</p>
                <UploadPreviewTable
                  columns={PREVIEW_COLUMNS}
                  results={validationResults.filter((r) => !r.valid)}
                />
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={validCount === 0}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Upload</CardTitle>
            <CardDescription>
              This will create or update client companies and their benefit data.
              Clients will appear in My Clients where you can invite them individually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-slate-50 p-4 space-y-2">
              <p className="text-sm">
                <span className="font-medium">{companySummary.size}</span> companies
              </p>
              <p className="text-sm">
                <span className="font-medium">{validCount}</span> benefit entries
              </p>
              {validationResults.length - validCount > 0 && (
                <p className="text-sm text-amber-600">
                  {validationResults.length - validCount} invalid rows will be skipped
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload Client Data"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {resultData && (
        <UploadResultDialog
          open={resultOpen}
          onClose={handleResultClose}
          title="Client Data Uploaded"
          results={[
            { label: "Companies Processed", value: resultData.companiesProcessed },
            { label: "Companies Created", value: resultData.companiesCreated },
            { label: "Companies Updated", value: resultData.companiesUpdated },
            { label: "Entries Created", value: resultData.entriesCreated },
          ]}
          warnings={["Go to My Clients to invite each client individually."]}
        />
      )}
    </div>
  );
}
