"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, AlertCircle } from "lucide-react";
import {
  BENEFIT_CATEGORY_LABELS,
  COUNTRY_LABELS,
  NACE_INDUSTRIES,
  PLATFORM_TYPE_LABELS,
  FEE_MODEL_LABELS,
  formatCurrency,
} from "@/lib/utils";

const EXAMPLE_QUERIES: Record<string, string[]> = {
  ADMIN: [
    "Show all companies with broker satisfaction below 5",
    "Average health insurance cost by country",
    "Which companies have non-compliant status?",
    "Show companies with more than 500 employees",
  ],
  BROKER: [
    "Which of my clients have no pension?",
    "Show compliance gaps across my clients",
    "Average benefit cost per employee for my clients",
    "Which clients have low broker satisfaction scores?",
  ],
  CLIENT: [
    "What benefits do I have?",
    "Show my compliance status",
    "What is my pension contribution rate?",
    "Show my platform information",
  ],
};

const ENUM_LABELS: Record<string, Record<string, string>> = {
  benefitCategory: BENEFIT_CATEGORY_LABELS,
  platformType: PLATFORM_TYPE_LABELS,
  feeModel: FEE_MODEL_LABELS,
};

const CURRENCY_FIELDS = new Set([
  "annualCostPerEmployee",
  "healthExcess",
  "healthInpatientLimit",
  "healthOutpatientLimit",
  "lifeFixedCoverAmount",
  "ciFixedCoverAmount",
  "dentalAnnualLimit",
  "flexFundAmount",
  "annualPlatformFee",
  "averageSalary",
  "averageBonus",
  "benefitBudget",
]);

interface ExplorerResult {
  query: Record<string, unknown> | null;
  results: Record<string, unknown>[];
  summary: string;
  totalCount: number;
}

function formatCellValue(key: string, value: unknown, row: Record<string, unknown>): string {
  if (value === null || value === undefined) return "—";

  // Enum labels
  const fieldName = key.split(".").pop() || key;
  if (ENUM_LABELS[fieldName] && typeof value === "string") {
    return ENUM_LABELS[fieldName][value] || value;
  }

  // Country labels
  if ((fieldName === "country" || fieldName.endsWith(".country")) && typeof value === "string" && value.length === 2) {
    return (COUNTRY_LABELS as Record<string, string>)[value] || value;
  }

  // Industry labels
  if ((fieldName === "industry" || fieldName.endsWith(".industry")) && typeof value === "string") {
    return NACE_INDUSTRIES[value] || value;
  }

  // Currency fields
  if (CURRENCY_FIELDS.has(fieldName) && typeof value === "number") {
    const currencyField = fieldName.includes("salary")
      ? "averageSalaryCurrency"
      : fieldName.includes("bonus")
        ? "averageBonusCurrency"
        : fieldName.includes("Platform")
          ? "feeCurrency"
          : "costCurrency";
    const currency = (row[currencyField] as string) || (row["company." + currencyField] as string) || "EUR";
    return formatCurrency(value, currency);
  }

  // Boolean
  if (typeof value === "boolean") return value ? "Yes" : "No";

  // Dates
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString("en-IE");
  }

  // Numbers with decimals
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }

  return String(value);
}

function formatColumnHeader(key: string): string {
  const fieldName = key.split(".").pop() || key;
  // Convert camelCase to Title Case
  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/Pct$/, "%")
    .replace(/^Id$/, "ID")
    .trim();
}

export default function DataExplorerPage() {
  const { data: session } = useSession();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplorerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const role = session?.user?.role || "CLIENT";
  const examples = EXAMPLE_QUERIES[role] || EXAMPLE_QUERIES.CLIENT;

  async function handleSubmit(q?: string) {
    const queryText = q || question;
    if (!queryText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/data-explorer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: queryText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setResult(data);
    } catch {
      setError("Failed to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const columns = result?.results && result.results.length > 0
    ? Object.keys(result.results[0])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Explorer</h1>
        <p className="text-muted-foreground">
          Ask questions about your benefits data in plain English
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ask a Question</CardTitle>
          <CardDescription>
            Type your question below or click an example to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="e.g. Show all companies with broker satisfaction below 5"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={500}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !question.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">{loading ? "Searching..." : "Search"}</span>
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <Badge
                key={example}
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => {
                  setQuestion(example);
                  handleSubmit(example);
                }}
              >
                {example}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </CardContent>
          </Card>

          {result.results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Results
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({result.results.length}
                    {result.totalCount > result.results.length
                      ? ` of ${result.totalCount}`
                      : ""}{" "}
                    rows)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col}>{formatColumnHeader(col)}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.results.map((row, i) => (
                        <TableRow key={i}>
                          {columns.map((col) => (
                            <TableCell key={col} className="max-w-[300px] truncate">
                              {formatCellValue(col, row[col], row)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {result.totalCount > 100 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Showing first 100 of {result.totalCount} results. Refine your question to narrow the results.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
