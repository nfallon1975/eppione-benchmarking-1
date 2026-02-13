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
import { Download, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { CsvUploadZone } from "./csv-upload-zone";
import { UploadPreviewTable } from "./upload-preview-table";
import { UploadResultDialog } from "./upload-result-dialog";
import { parseCSV, validateRows, type RowValidationResult } from "@/lib/upload-utils";
import { clientBenefitRowSchema, type ClientBenefitUploadRow } from "@/lib/upload-schemas";

const PREVIEW_COLUMNS = [
  { key: "country", label: "Country" },
  { key: "benefitCategory", label: "Category" },
  { key: "benefitName", label: "Benefit Name" },
  { key: "coverLevel", label: "Cover Level" },
  { key: "isCore", label: "Core" },
  { key: "employerFunded", label: "Employer Funded" },
  { key: "annualCostPerEmployee", label: "Annual Cost" },
  { key: "provider", label: "Provider" },
];

export function ClientUploadWizard() {
  const [step, setStep] = useState(1);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | undefined>();
  const [fileSize, setFileSize] = useState<number | undefined>();
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<
    RowValidationResult<ClientBenefitUploadRow>[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    entriesCreated: number;
    countriesProcessed: number;
  } | null>(null);

  function handleFileLoaded(text: string, name: string) {
    setCsvText(text);
    setFilename(name);
    setFileSize(new Blob([text]).size);

    const { data, errors } = parseCSV(text);
    setParseErrors(errors);
    const results = validateRows(data, clientBenefitRowSchema);
    setValidationResults(results);
  }

  function handleClear() {
    setCsvText(null);
    setFilename(undefined);
    setFileSize(undefined);
    setParseErrors([]);
    setValidationResults([]);
    setStep(1);
  }

  async function handleSubmit() {
    const validRows = validationResults
      .filter((r) => r.valid && r.data)
      .map((r) => r.data!);

    if (validRows.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/upload/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benefits: validRows }),
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

  return (
    <div className="space-y-6">
      {/* Step indicators */}
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
            <CardTitle>Upload Your Benefits</CardTitle>
            <CardDescription>
              Download the template, fill in your benefit data, then upload the completed CSV.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              onClick={() => {
                window.open("/api/upload/template?type=client_benefits", "_blank");
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
              Review your data below. Only valid rows will be uploaded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploadPreviewTable
              columns={PREVIEW_COLUMNS}
              results={validationResults}
            />

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
              This will replace existing benefits for the uploaded countries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-slate-50 p-4 space-y-2">
              <p className="text-sm">
                <span className="font-medium">{validCount}</span> benefit entries will be created
              </p>
              <p className="text-sm">
                <span className="font-medium">
                  {new Set(
                    validationResults
                      .filter((r) => r.valid && r.data)
                      .map((r) => r.data!.country)
                  ).size}
                </span>{" "}
                countries
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
                  "Upload Benefits"
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
          title="Benefits Uploaded"
          results={[
            { label: "Entries Created", value: resultData.entriesCreated },
            { label: "Countries Processed", value: resultData.countriesProcessed },
          ]}
        />
      )}
    </div>
  );
}
