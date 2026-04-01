"use client";

import { useState, useRef, Fragment, DragEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Upload,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  detectColumnMapping,
  parseAllRows,
  type ParsedBenefitRow,
  type ColumnMapping,
} from "@/lib/import/platform-format-parser";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { number: 1, label: "Upload" },
  { number: 2, label: "Mapping" },
  { number: 3, label: "Review" },
  { number: 4, label: "Import" },
];

const REQUIRED_CANONICAL_FIELDS = [
  "country",
  "category",
  "lineOfCover",
  "description",
];

const CANONICAL_FIELD_LABELS: Record<string, string> = {
  region: "Region",
  country: "Country",
  category: "Category",
  lineOfCover: "Line of Cover",
  rider: "Rider",
  description: "Description",
  mandatoryClassification: "Mandatory Classification",
  renewalDate: "Renewal Date",
  nextRenewalDate: "Next Renewal Date",
  localCurrency: "Currency",
  employerPremium: "Employer Premium",
  employeePremium: "Employee Premium",
  taxTreatment: "Tax Treatment",
  headcount: "Headcount",
  insuredLives: "Insured Lives",
  costShare: "Cost Share",
  carrier: "Carrier",
  carrierTerminationNotice: "Carrier Termination Notice",
  broker: "Broker",
  commissionPercent: "Commission %",
  brokerFee: "Broker Fee",
  multinationalPool: "Multinational Pool",
  notes: "Notes",
};

const ALL_CANONICAL_FIELDS = Object.keys(CANONICAL_FIELD_LABELS);

const CATEGORY_COLORS: Record<string, string> = {
  HEALTH: "bg-blue-100 text-blue-800",
  DENTAL: "bg-indigo-100 text-indigo-800",
  VISION: "bg-purple-100 text-purple-800",
  LIFE: "bg-red-100 text-red-800",
  INCOME_PROTECTION: "bg-orange-100 text-orange-800",
  CRITICAL_ILLNESS: "bg-pink-100 text-pink-800",
  PENSION: "bg-green-100 text-green-800",
  TRAVEL: "bg-teal-100 text-teal-800",
  ANNUAL_LEAVE: "bg-cyan-100 text-cyan-800",
  EAP: "bg-yellow-100 text-yellow-800",
  WELLNESS: "bg-lime-100 text-lime-800",
  OTHER: "bg-slate-100 text-slate-800",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-red-100 text-red-800",
};

// ---------------------------------------------------------------------------
// File parser
// ---------------------------------------------------------------------------

function parseFile(
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(
          sheet,
          { header: 1, raw: false }
        );
        const headers = (jsonData[0] as unknown as string[]).map((h) =>
          String(h || "").trim()
        );
        const rows = jsonData
          .slice(1)
          .filter((row) => Object.values(row).some((v) => v))
          .map((row) => {
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => {
              obj[h] = String(
                (row as Record<string, string>)[i] || ""
              ).trim();
            });
            return obj;
          });
        resolve({ headers, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  currentStep === step.number
                    ? "border-eppione-cyan bg-eppione-cyan text-white"
                    : currentStep > step.number
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white text-slate-400"
                )}
              >
                {currentStep > step.number ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  currentStep === step.number
                    ? "text-slate-900"
                    : "text-slate-500"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 hidden h-0.5 w-12 md:block lg:w-20",
                  currentStep > step.number ? "bg-emerald-500" : "bg-slate-200"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Step state
  const [step, setStep] = useState(1);

  // File & parsing state
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [parsedRows, setParsedRows] = useState<ParsedBenefitRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    benefitsCreated: number;
    countriesProcessed: number;
    categories: string[];
    errors: string[];
  } | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [companyId, setCompanyId] = useState("");

  // Review state
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Drag state
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRole = (session?.user as { role?: string })?.role;

  // -------------------------------------------------------------------------
  // Auth check
  // -------------------------------------------------------------------------

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (
    !session ||
    !["ADMIN", "BROKER", "CLIENT"].includes(userRole || "")
  ) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-semibold text-slate-900">Access Denied</h2>
        <p className="mt-2 text-sm text-slate-600">
          You do not have permission to access the import wizard.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // File handling
  // -------------------------------------------------------------------------

  async function handleFileSelect(selectedFile: File) {
    setFileError(null);

    const validExtensions = [".xlsx", ".xls", ".csv"];
    const ext = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    if (!validExtensions.includes(ext)) {
      setFileError("Only .xlsx, .xls, and .csv files are accepted");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setFileError("File must be under 10MB");
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    try {
      const { headers: h, rows: r } = await parseFile(selectedFile);
      setHeaders(h);
      setRawRows(r);
      const mapping = detectColumnMapping(h);
      setColumnMapping(mapping);
    } catch {
      setFileError("Failed to parse file. Please check the format.");
      setFile(null);
    } finally {
      setParsing(false);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }

  function handleClearFile() {
    setFile(null);
    setRawRows([]);
    setHeaders([]);
    setColumnMapping({});
    setParsedRows([]);
    setFileError(null);
    setExpandedRows(new Set());
    setImportResult(null);
    setStep(1);
  }

  // -------------------------------------------------------------------------
  // Column mapping update
  // -------------------------------------------------------------------------

  function updateMapping(canonical: string, headerValue: string) {
    setColumnMapping((prev) => {
      const next = { ...prev };
      if (headerValue === "__none__") {
        delete next[canonical];
      } else {
        next[canonical] = headerValue;
      }
      return next;
    });
  }

  // -------------------------------------------------------------------------
  // Proceed to review
  // -------------------------------------------------------------------------

  function handleProceedToReview() {
    const parsed = parseAllRows(rawRows, columnMapping);
    setParsedRows(parsed);
    setStep(3);
  }

  // -------------------------------------------------------------------------
  // Toggle row expansion
  // -------------------------------------------------------------------------

  function toggleRow(rowIndex: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  }

  // -------------------------------------------------------------------------
  // Import
  // -------------------------------------------------------------------------

  async function handleImport() {
    setImporting(true);
    try {
      const body: Record<string, unknown> = {
        benefits: parsedRows,
        replaceExisting,
      };
      if ((userRole === "ADMIN" || userRole === "BROKER") && companyId) {
        body.companyId = companyId;
      }

      const res = await fetch("/api/import/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setImportResult({
          benefitsCreated: 0,
          countriesProcessed: 0,
          categories: [],
          errors: [err.error || "Import failed"],
        });
      } else {
        const data = await res.json();
        setImportResult(data);
      }
    } catch {
      setImportResult({
        benefitsCreated: 0,
        countriesProcessed: 0,
        categories: [],
        errors: ["Import failed. Please try again."],
      });
    } finally {
      setImporting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Computed
  // -------------------------------------------------------------------------

  const highCount = parsedRows.filter((r) => r.confidence === "high").length;
  const mediumCount = parsedRows.filter(
    (r) => r.confidence === "medium"
  ).length;
  const lowCount = parsedRows.filter((r) => r.confidence === "low").length;
  const totalWarnings = parsedRows.reduce(
    (acc, r) => acc + r.warnings.length,
    0
  );
  const uniqueCountries = Array.from(new Set(parsedRows.map((r) => r.country).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(parsedRows.map((r) => r.benefitCategory)));

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Import Benefits Register
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Import benefits data from your multinational benefits management
          platform
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={step} />

      {/* ================================================================= */}
      {/* Step 1 — Upload */}
      {/* ================================================================= */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!file ? (
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer",
                  dragging
                    ? "border-eppione-cyan bg-eppione-cyan/5"
                    : "border-slate-200 hover:border-slate-300"
                )}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragging(false);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="mb-3 h-10 w-10 text-slate-400" />
                <p className="mb-1 text-sm font-medium text-slate-700">
                  Drop a file here, or{" "}
                  <span className="text-eppione-cyan underline">browse</span>
                </p>
                <p className="text-xs text-slate-500">
                  .xlsx, .xls, or .csv files, max 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                    e.target.value = "";
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-eppione-cyan" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                      {rawRows.length > 0 && (
                        <span className="ml-2">
                          — {rawRows.length} rows, {headers.length} columns
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearFile}>
                  Remove
                </Button>
              </div>
            )}

            {parsing && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing file...
              </div>
            )}

            {fileError && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">{fileError}</p>
              </div>
            )}

            {/* Preview table */}
            {rawRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  Preview (first 5 rows)
                </p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        {headers.map((h) => (
                          <th
                            key={h}
                            className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-600"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          {headers.map((h) => (
                            <td
                              key={h}
                              className="whitespace-nowrap px-3 py-1.5 text-slate-700"
                            >
                              {row[h] || ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {rawRows.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* Step 2 — Column Mapping */}
      {/* ================================================================= */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Column Mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-slate-600">
              Map your file columns to the expected fields. Required fields are
              marked with an asterisk.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {ALL_CANONICAL_FIELDS.map((canonical) => {
                const isRequired =
                  REQUIRED_CANONICAL_FIELDS.includes(canonical);
                const isMapped = !!columnMapping[canonical];

                return (
                  <div key={canonical} className="space-y-1.5">
                    <Label
                      className={cn(
                        "text-sm",
                        isRequired && !isMapped
                          ? "text-red-600 font-semibold"
                          : isMapped
                          ? "text-emerald-700 font-medium"
                          : "text-slate-700"
                      )}
                    >
                      {CANONICAL_FIELD_LABELS[canonical]}
                      {isRequired && " *"}
                      {isMapped && (
                        <Check className="ml-1 inline h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </Label>
                    <Select
                      value={columnMapping[canonical] || "__none__"}
                      onValueChange={(val) => updateMapping(canonical, val)}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-full",
                          isRequired && !isMapped && "border-red-300"
                        )}
                      >
                        <SelectValue placeholder="— Not mapped —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Not mapped —</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            {/* First row preview with mapping */}
            {rawRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  First row preview with current mapping
                </p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="px-3 py-2 text-left font-medium text-slate-600">
                          Field
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">
                          Column
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ALL_CANONICAL_FIELDS.filter(
                        (c) => columnMapping[c]
                      ).map((canonical) => (
                        <tr key={canonical} className="border-b last:border-0">
                          <td className="px-3 py-1.5 font-medium text-slate-700">
                            {CANONICAL_FIELD_LABELS[canonical]}
                          </td>
                          <td className="px-3 py-1.5 text-slate-500">
                            {columnMapping[canonical]}
                          </td>
                          <td className="px-3 py-1.5 text-slate-900">
                            {rawRows[0]?.[columnMapping[canonical]] || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleProceedToReview}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* Step 3 — Review & Edit */}
      {/* ================================================================= */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Parsed Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="flex flex-wrap gap-3 rounded-md bg-slate-50 p-4">
              <Badge variant="outline" className="text-sm">
                {parsedRows.length} rows parsed
              </Badge>
              <Badge className={CONFIDENCE_COLORS.high}>
                {highCount} high confidence
              </Badge>
              <Badge className={CONFIDENCE_COLORS.medium}>
                {mediumCount} medium confidence
              </Badge>
              <Badge className={CONFIDENCE_COLORS.low}>
                {lowCount} low confidence
              </Badge>
              {totalWarnings > 0 && (
                <Badge
                  variant="outline"
                  className="border-amber-300 text-amber-700"
                >
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {totalWarnings} warnings
                </Badge>
              )}
            </div>

            {/* Results table */}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="w-8 px-2 py-2"></th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Row
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Country
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Category
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Benefit Name
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Cover Level
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Cost/Employee
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => {
                    const isExpanded = expandedRows.has(row.rowIndex);

                    return (
                      <Fragment key={row.rowIndex}>
                        <tr
                          className="cursor-pointer border-b hover:bg-slate-50"
                          onClick={() => toggleRow(row.rowIndex)}
                        >
                          <td className="px-2 py-2 text-center">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {row.rowIndex}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {row.country || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              className={
                                CATEGORY_COLORS[row.benefitCategory] ||
                                CATEGORY_COLORS.OTHER
                              }
                            >
                              {row.benefitCategory}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{row.benefitName}</td>
                          <td className="px-3 py-2">{row.coverLevel}</td>
                          <td className="px-3 py-2">
                            {row.annualCostPerEmployee !== null
                              ? `${row.costCurrency} ${row.annualCostPerEmployee.toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              className={CONFIDENCE_COLORS[row.confidence]}
                            >
                              {row.confidence}
                            </Badge>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b bg-slate-50/50">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {/* Extracted fields */}
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Extracted Fields
                                  </p>
                                  {Object.entries(row.extractedFields).map(
                                    ([key, val]) => (
                                      <div
                                        key={key}
                                        className="flex justify-between text-xs"
                                      >
                                        <span
                                          className={cn(
                                            "text-slate-600",
                                            val === null &&
                                              "text-slate-400 italic"
                                          )}
                                        >
                                          {key}
                                        </span>
                                        <span
                                          className={cn(
                                            "font-medium",
                                            val === null
                                              ? "text-slate-300"
                                              : "text-slate-900"
                                          )}
                                        >
                                          {val !== null ? String(val) : "—"}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>

                                {/* Mapped fields */}
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Mapped Fields
                                  </p>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">
                                      Employer Funded
                                    </span>
                                    <span className="font-medium">
                                      {row.employerFunded ? "Yes" : "No"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">
                                      Covers Dependents
                                    </span>
                                    <span className="font-medium">
                                      {row.coversDependents ? "Yes" : "No"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">
                                      Covers Spouse
                                    </span>
                                    <span className="font-medium">
                                      {row.coversSpouse ? "Yes" : "No"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">
                                      Mandatory
                                    </span>
                                    <span className="font-medium">
                                      {row.mandatoryClassification || "—"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">
                                      EE Contribution %
                                    </span>
                                    <span className="font-medium">
                                      {row.employeeContributionPercent !== null
                                        ? `${row.employeeContributionPercent}%`
                                        : "—"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">
                                      Carrier
                                    </span>
                                    <span className="font-medium">
                                      {row.carrier || "—"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">
                                      Broker
                                    </span>
                                    <span className="font-medium">
                                      {row.brokerName || "—"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">
                                      In MN Pool
                                    </span>
                                    <span className="font-medium">
                                      {row.inMultinationalPool ? "Yes" : "No"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">
                                      Is Rider
                                    </span>
                                    <span className="font-medium">
                                      {row.isRider ? "Yes" : "No"}
                                    </span>
                                  </div>
                                </div>

                                {/* Warnings */}
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Warnings
                                  </p>
                                  {row.warnings.length === 0 ? (
                                    <p className="text-xs text-emerald-600">
                                      No warnings
                                    </p>
                                  ) : (
                                    row.warnings.map((w, wi) => (
                                      <p
                                        key={wi}
                                        className="text-xs text-amber-700"
                                      >
                                        <AlertTriangle className="mr-1 inline h-3 w-3" />
                                        {w}
                                      </p>
                                    ))
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)}>
                Import
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* Step 4 — Import */}
      {/* ================================================================= */}
      {step === 4 && !importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-md bg-slate-50 p-4 space-y-3">
              <p className="text-sm">
                <span className="font-semibold">{parsedRows.length}</span>{" "}
                benefits across{" "}
                <span className="font-semibold">{uniqueCountries.length}</span>{" "}
                countries
              </p>
              <div className="flex flex-wrap gap-1.5">
                {uniqueCategories.map((cat) => (
                  <Badge
                    key={cat}
                    className={CATEGORY_COLORS[cat] || CATEGORY_COLORS.OTHER}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="replace-existing"
                checked={replaceExisting}
                onCheckedChange={setReplaceExisting}
              />
              <Label htmlFor="replace-existing" className="text-sm">
                Replace existing benefits for these countries
              </Label>
            </div>

            {(userRole === "ADMIN" || userRole === "BROKER") && (
              <div className="space-y-1.5">
                <Label className="text-sm">Company ID</Label>
                <Input
                  placeholder="Enter company ID or name"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Leave blank to import for the default company
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import Now"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import result */}
      {step === 4 && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.errors.length === 0 ? (
                <>
                  <Check className="h-5 w-5 text-emerald-500" />
                  Import Complete
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Import Completed with Errors
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-emerald-50 p-4 space-y-2">
              <p className="text-sm font-medium text-emerald-800">
                {importResult.benefitsCreated} benefits imported across{" "}
                {importResult.countriesProcessed} countries
              </p>
              {importResult.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {importResult.categories.map((cat) => (
                    <Badge
                      key={cat}
                      className={
                        CATEGORY_COLORS[cat] || CATEGORY_COLORS.OTHER
                      }
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="rounded-md bg-red-50 p-4 space-y-1">
                <p className="text-sm font-medium text-red-800">Errors:</p>
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700">
                    {err}
                  </p>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClearFile}
              >
                Import Another File
              </Button>
              <Button onClick={() => router.push("/benchmarking")}>
                View Benchmarks
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

