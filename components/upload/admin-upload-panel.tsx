"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2 } from "lucide-react";
import { CsvUploadZone } from "./csv-upload-zone";
import { UploadPreviewTable } from "./upload-preview-table";
import { UploadResultDialog } from "./upload-result-dialog";
import { parseCSV, validateRows, type RowValidationResult } from "@/lib/upload-utils";
import {
  adminBrokerRowSchema,
  adminClientRowSchema,
  adminBenefitRowSchema,
  type AdminBrokerUploadRow,
  type AdminClientUploadRow,
  type AdminBenefitUploadRow,
} from "@/lib/upload-schemas";

const BROKER_COLUMNS = [
  { key: "email", label: "Email" },
  { key: "name", label: "Name" },
  { key: "companyName", label: "Company Name" },
  { key: "licenseNumber", label: "License #" },
  { key: "countriesActive", label: "Countries" },
];

const BENEFIT_COLUMNS = [
  { key: "companyName", label: "Company Name" },
  { key: "country", label: "Country" },
  { key: "benefitCategory", label: "Category" },
  { key: "benefitName", label: "Benefit Name" },
  { key: "annualCostPerEmployee", label: "Annual Cost/Employee" },
];

const CLIENT_COLUMNS = [
  { key: "email", label: "Email" },
  { key: "name", label: "Name" },
  { key: "companyName", label: "Company Name" },
  { key: "country", label: "Country" },
  { key: "industry", label: "Industry" },
  { key: "employeeCount", label: "Employees" },
  { key: "brokerEmail", label: "Broker Email" },
];

export function AdminUploadPanel() {
  return (
    <Tabs defaultValue="brokers" className="space-y-6">
      <TabsList>
        <TabsTrigger value="brokers">Upload Brokers</TabsTrigger>
        <TabsTrigger value="clients">Upload Clients</TabsTrigger>
        <TabsTrigger value="benefits">Upload Benefits</TabsTrigger>
      </TabsList>
      <TabsContent value="brokers">
        <BrokerUploadTab />
      </TabsContent>
      <TabsContent value="clients">
        <ClientUploadTab />
      </TabsContent>
      <TabsContent value="benefits">
        <BenefitUploadTab />
      </TabsContent>
    </Tabs>
  );
}

function BrokerUploadTab() {
  const [filename, setFilename] = useState<string | undefined>();
  const [fileSize, setFileSize] = useState<number | undefined>();
  const [results, setResults] = useState<RowValidationResult<AdminBrokerUploadRow>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    brokersCreated: number;
    skipped: string[];
  } | null>(null);

  function handleFileLoaded(text: string, name: string) {
    setFilename(name);
    setFileSize(new Blob([text]).size);
    const { data } = parseCSV(text);
    setResults(validateRows(data, adminBrokerRowSchema));
  }

  function handleClear() {
    setFilename(undefined);
    setFileSize(undefined);
    setResults([]);
  }

  async function handleSubmit() {
    const validRows = results.filter((r) => r.valid && r.data).map((r) => r.data!);
    if (validRows.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/upload/admin/brokers", {
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

  const validCount = results.filter((r) => r.valid).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Brokers</CardTitle>
        <CardDescription>
          Create broker accounts from a CSV. Brokers will be created with APPROVED status
          and no password (they&apos;ll set one via password reset).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          onClick={() => window.open("/api/upload/template?type=admin_brokers", "_blank")}
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

        {results.length > 0 && (
          <>
            <UploadPreviewTable columns={BROKER_COLUMNS} results={results} />
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{validCount} valid of {results.length}</Badge>
              <Button onClick={handleSubmit} disabled={submitting || validCount === 0}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create ${validCount} Broker${validCount !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </>
        )}

        {resultData && (
          <UploadResultDialog
            open={resultOpen}
            onClose={() => { setResultOpen(false); handleClear(); }}
            title="Brokers Created"
            results={[
              { label: "Brokers Created", value: resultData.brokersCreated },
              { label: "Skipped", value: resultData.skipped.length },
            ]}
            warnings={resultData.skipped}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ClientUploadTab() {
  const [filename, setFilename] = useState<string | undefined>();
  const [fileSize, setFileSize] = useState<number | undefined>();
  const [results, setResults] = useState<RowValidationResult<AdminClientUploadRow>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    clientsCreated: number;
    brokerLinked: number;
    skipped: string[];
  } | null>(null);

  function handleFileLoaded(text: string, name: string) {
    setFilename(name);
    setFileSize(new Blob([text]).size);
    const { data } = parseCSV(text);
    setResults(validateRows(data, adminClientRowSchema));
  }

  function handleClear() {
    setFilename(undefined);
    setFileSize(undefined);
    setResults([]);
  }

  async function handleSubmit() {
    const validRows = results.filter((r) => r.valid && r.data).map((r) => r.data!);
    if (validRows.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/upload/admin/clients", {
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

  const validCount = results.filter((r) => r.valid).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Clients</CardTitle>
        <CardDescription>
          Create client accounts and companies from a CSV. Optionally link to existing brokers.
          Clients will be created with APPROVED status and no password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          onClick={() => window.open("/api/upload/template?type=admin_clients", "_blank")}
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

        {results.length > 0 && (
          <>
            <UploadPreviewTable columns={CLIENT_COLUMNS} results={results} />
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{validCount} valid of {results.length}</Badge>
              <Button onClick={handleSubmit} disabled={submitting || validCount === 0}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create ${validCount} Client${validCount !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </>
        )}

        {resultData && (
          <UploadResultDialog
            open={resultOpen}
            onClose={() => { setResultOpen(false); handleClear(); }}
            title="Clients Created"
            results={[
              { label: "Clients Created", value: resultData.clientsCreated },
              { label: "Broker-Linked", value: resultData.brokerLinked },
              { label: "Skipped", value: resultData.skipped.length },
            ]}
            warnings={resultData.skipped}
          />
        )}
      </CardContent>
    </Card>
  );
}

function BenefitUploadTab() {
  const [filename, setFilename] = useState<string | undefined>();
  const [fileSize, setFileSize] = useState<number | undefined>();
  const [results, setResults] = useState<RowValidationResult<AdminBenefitUploadRow>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    companiesProcessed: number;
    entriesCreated: number;
    companies: { name: string; benefitCount: number }[];
    notFound: string[];
  } | null>(null);

  function handleFileLoaded(text: string, name: string) {
    setFilename(name);
    setFileSize(new Blob([text]).size);
    const { data } = parseCSV(text);
    setResults(validateRows(data, adminBenefitRowSchema));
  }

  function handleClear() {
    setFilename(undefined);
    setFileSize(undefined);
    setResults([]);
  }

  async function handleSubmit() {
    const validRows = results.filter((r) => r.valid && r.data).map((r) => r.data!);
    if (validRows.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/upload/admin/benefits", {
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

  const validCount = results.filter((r) => r.valid).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Benefits</CardTitle>
        <CardDescription>
          Upload benefits for multiple existing companies from a single CSV.
          Companies are matched by name. Benefits for matching countries will be replaced.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          onClick={() => window.open("/api/upload/template?type=admin_benefits", "_blank")}
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

        {results.length > 0 && (
          <>
            <UploadPreviewTable columns={BENEFIT_COLUMNS} results={results} />
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{validCount} valid of {results.length}</Badge>
              <Button onClick={handleSubmit} disabled={submitting || validCount === 0}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  `Upload ${validCount} Benefit${validCount !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </>
        )}

        {resultData && (
          <UploadResultDialog
            open={resultOpen}
            onClose={() => { setResultOpen(false); handleClear(); }}
            title="Benefits Uploaded"
            results={[
              { label: "Companies Processed", value: resultData.companiesProcessed },
              { label: "Benefits Created", value: resultData.entriesCreated },
              ...(resultData.notFound.length > 0
                ? [{ label: "Companies Not Found", value: resultData.notFound.length }]
                : []),
            ]}
            warnings={resultData.notFound.map((n) => `Company not found: ${n}`)}
          />
        )}
      </CardContent>
    </Card>
  );
}
