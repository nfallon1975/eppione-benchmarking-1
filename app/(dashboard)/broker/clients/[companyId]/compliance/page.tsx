"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  RefreshCw,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Scale,
  Info,
} from "lucide-react";
import { BENEFIT_CATEGORY_LABELS, COUNTRY_LABELS } from "@/lib/utils";
import { CountryPicker } from "@/components/ui/country-picker";
import Link from "next/link";

type ComplianceStatus = "COMPLIANT" | "NON_COMPLIANT" | "PARTIALLY_COMPLIANT" | "NOT_APPLICABLE" | "UNKNOWN";

interface ComplianceResultItem {
  id: string;
  status: ComplianceStatus;
  gap: string | null;
  recommendation: string | null;
  checkedAt: string;
  benefitEntryId: string | null;
  requirement: {
    benefitCategory: string;
    requirementType: string;
    description: string;
    minimumLevel: string | null;
    legalReference: string | null;
    penaltyForNonCompliance: string | null;
    verifiedByAdmin: boolean;
  };
}

interface StatutoryLimit {
  id: string;
  country: string;
  limitType: string;
  benefitCategory: string | null;
  description: string;
  limitValue: string;
  currency: string | null;
  taxYear: string;
  legalReference: string | null;
  verifiedByAdmin: boolean;
}

interface ClientInfo {
  id: string;
  name: string | null;
  email: string;
  company: {
    id: string;
    name: string;
    country: string;
  } | null;
  allowedCountries: string[];
}

type FilterType = "all" | "mandatory" | "issues";

const STATUS_CONFIG: Record<ComplianceStatus, { icon: typeof CheckCircle2; color: string; label: string; bgColor: string }> = {
  COMPLIANT: { icon: CheckCircle2, color: "text-green-600", label: "Compliant", bgColor: "bg-green-50" },
  NON_COMPLIANT: { icon: XCircle, color: "text-red-600", label: "Non-Compliant", bgColor: "bg-red-50" },
  PARTIALLY_COMPLIANT: { icon: AlertTriangle, color: "text-amber-600", label: "Partially Compliant", bgColor: "bg-amber-50" },
  NOT_APPLICABLE: { icon: MinusCircle, color: "text-slate-400", label: "Not Applicable", bgColor: "bg-slate-50" },
  UNKNOWN: { icon: Info, color: "text-slate-400", label: "Unknown", bgColor: "bg-slate-50" },
};

const LIMIT_TYPE_LABELS: Record<string, string> = {
  TAX_RELIEF_CAP: "Tax Relief Cap",
  CONTRIBUTION_LIMIT: "Contribution Limit",
  INSURABLE_EARNINGS_CEILING: "Insurable Earnings Ceiling",
  SOCIAL_SECURITY_CAP: "Social Security Cap",
  BENEFIT_IN_KIND_THRESHOLD: "Benefit in Kind Threshold",
  OTHER: "Other",
};

export default function BrokerClientCompliancePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;

  const [client, setClient] = useState<ClientInfo | null>(null);
  const [results, setResults] = useState<ComplianceResultItem[]>([]);
  const [limits, setLimits] = useState<StatutoryLimit[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchClientInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/broker/clients");
      if (res.ok) {
        const clients = await res.json();
        const found = clients.find((c: { companyId: string }) => c.companyId === companyId);
        if (found) {
          const allowed: string[] = found.countries || [];
          setClient({
            id: found.companyId,
            name: found.inviteEmail,
            email: found.inviteEmail,
            company: found.company,
            allowedCountries: allowed,
          });
          if (allowed.length > 0) {
            setSelectedCountry(allowed[0]);
          } else if (found.company?.country) {
            setSelectedCountry(found.company.country);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch client info:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (session?.user?.role !== "BROKER") {
      router.push("/dashboard");
      return;
    }
    fetchClientInfo();
  }, [session, router, fetchClientInfo]);

  const fetchResults = useCallback(async () => {
    if (!selectedCountry || !client?.company?.id) return;
    try {
      const res = await fetch(`/api/compliance/results?country=${selectedCountry}&companyId=${client.company.id}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setLimits(data.limits || []);
      }
    } catch (err) {
      console.error("Failed to fetch results:", err);
    }
  }, [selectedCountry, client]);

  useEffect(() => {
    if (selectedCountry && client?.company?.id) {
      fetchResults();
    }
  }, [selectedCountry, client, fetchResults]);

  async function runCheck() {
    if (!client?.company?.id) return;
    setChecking(true);
    try {
      await fetch("/api/compliance/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: selectedCountry,
          companyId: client.company.id,
        }),
      });
      await fetchResults();
    } catch (err) {
      console.error("Check failed:", err);
    } finally {
      setChecking(false);
    }
  }

  // Filter results
  const filteredResults = results.filter((r) => {
    if (filter === "mandatory") {
      return r.requirement.requirementType === "MANDATORY" || r.requirement.requirementType === "QUASI_MANDATORY";
    }
    if (filter === "issues") {
      return r.status === "NON_COMPLIANT" || r.status === "PARTIALLY_COMPLIANT";
    }
    return true;
  });

  // Summary
  const compliantCount = results.filter((r) => r.status === "COMPLIANT").length;
  const nonCompliantCount = results.filter((r) => r.status === "NON_COMPLIANT").length;
  const partialCount = results.filter((r) => r.status === "PARTIALLY_COMPLIANT").length;
  const mandatoryIssues = results.filter(
    (r) =>
      (r.requirement.requirementType === "MANDATORY" || r.requirement.requirementType === "QUASI_MANDATORY") &&
      (r.status === "NON_COMPLIANT" || r.status === "PARTIALLY_COMPLIANT")
  ).length;
  const trafficLight = mandatoryIssues > 0 ? "red" : nonCompliantCount + partialCount > 0 ? "amber" : "green";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500">Client not found or no active relationship.</p>
        <Link href="/broker/clients">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link href={`/broker/clients/${companyId}`} className="text-sm text-slate-500 hover:text-slate-700">
              <ArrowLeft className="inline h-4 w-4" /> {client.company?.name || client.name}
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Compliance Review</h1>
          <p className="mt-1 text-slate-500">
            {client.company?.name} — {COUNTRY_LABELS[selectedCountry] || selectedCountry}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CountryPicker
            value={selectedCountry}
            onChange={setSelectedCountry}
            limitTo={client?.allowedCountries?.length ? client.allowedCountries : undefined}
            className="w-[220px]"
          />
          <Button onClick={runCheck} disabled={checking || !selectedCountry}>
            {checking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Check
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Traffic Light Summary */}
      {results.length > 0 && (
        <div className="grid gap-6 md:grid-cols-4">
          <Card className={trafficLight === "green" ? "border-green-200 bg-green-50/50" : trafficLight === "amber" ? "border-amber-200 bg-amber-50/50" : "border-red-200 bg-red-50/50"}>
            <CardHeader className="pb-2">
              <CardDescription>Overall Status</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {trafficLight === "green" && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                {trafficLight === "amber" && <AlertTriangle className="h-6 w-6 text-amber-600" />}
                {trafficLight === "red" && <XCircle className="h-6 w-6 text-red-600" />}
                {trafficLight === "green" ? "Compliant" : trafficLight === "amber" ? "Review Needed" : "Issues Found"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                {COUNTRY_LABELS[selectedCountry] || selectedCountry}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Compliant</CardDescription>
              <CardTitle className="text-2xl text-green-600">{compliantCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">of {results.length} requirements</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Issues</CardDescription>
              <CardTitle className="text-2xl text-red-600">{nonCompliantCount + partialCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                {nonCompliantCount} non-compliant, {partialCount} partial
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Mandatory Issues</CardDescription>
              <CardTitle className="text-2xl text-red-600">{mandatoryIssues}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">require immediate attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {results.length === 0 && !checking && selectedCountry && (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="text-lg font-medium text-slate-700">No compliance data yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Click &quot;Run Check&quot; to check this client&apos;s benefits against {COUNTRY_LABELS[selectedCountry] || selectedCountry} requirements.
            </p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Tabs defaultValue="requirements">
          <TabsList>
            <TabsTrigger value="requirements">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Requirements ({results.length})
            </TabsTrigger>
            <TabsTrigger value="limits">
              <Scale className="mr-2 h-4 w-4" />
              Statutory Limits ({limits.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requirements">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Benefit Requirements</CardTitle>
                    <CardDescription>
                      Regulatory and market requirements for {COUNTRY_LABELS[selectedCountry] || selectedCountry}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={filter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("all")}
                    >
                      All
                    </Button>
                    <Button
                      variant={filter === "mandatory" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("mandatory")}
                    >
                      Mandatory
                    </Button>
                    <Button
                      variant={filter === "issues" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("issues")}
                    >
                      Issues Only
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Status</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Requirement</TableHead>
                      <TableHead>Minimum Level</TableHead>
                      <TableHead>Gap / Advice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                          No results match the current filter.
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredResults.map((result) => {
                      const cfg = STATUS_CONFIG[result.status];
                      const Icon = cfg.icon;
                      return (
                        <TableRow key={result.id} className={cfg.bgColor}>
                          <TableCell>
                            <Icon className={`h-5 w-5 ${cfg.color}`} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {BENEFIT_CATEGORY_LABELS[result.requirement.benefitCategory] || result.requirement.benefitCategory}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                result.requirement.requirementType === "MANDATORY"
                                  ? "destructive"
                                  : result.requirement.requirementType === "QUASI_MANDATORY"
                                    ? "warning"
                                    : "secondary"
                              }
                            >
                              {result.requirement.requirementType.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="text-sm">{result.requirement.description}</p>
                            {result.requirement.legalReference && (
                              <p className="mt-1 text-xs text-slate-400">
                                Ref: {result.requirement.legalReference}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {result.requirement.minimumLevel || "—"}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {result.gap && (
                              <p className="text-sm text-slate-700">{result.gap}</p>
                            )}
                            {result.recommendation && (
                              <p className="mt-1 text-xs text-blue-600">{result.recommendation}</p>
                            )}
                            {result.requirement.penaltyForNonCompliance && result.status !== "COMPLIANT" && (
                              <p className="mt-1 text-xs text-red-500">
                                Penalty: {result.requirement.penaltyForNonCompliance}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limits">
            <Card>
              <CardHeader>
                <CardTitle>Statutory Limits</CardTitle>
                <CardDescription>
                  Tax relief caps, contribution limits, and other statutory thresholds
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Limit Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Limit Value</TableHead>
                      <TableHead>Tax Year</TableHead>
                      <TableHead>Legal Reference</TableHead>
                      <TableHead>Verified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {limits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-500">
                          No statutory limits data available.
                        </TableCell>
                      </TableRow>
                    )}
                    {limits.map((limit) => (
                      <TableRow key={limit.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {LIMIT_TYPE_LABELS[limit.limitType] || limit.limitType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {limit.benefitCategory
                            ? BENEFIT_CATEGORY_LABELS[limit.benefitCategory] || limit.benefitCategory
                            : "General"}
                        </TableCell>
                        <TableCell className="max-w-xs text-sm">
                          {limit.description}
                        </TableCell>
                        <TableCell className="font-medium">
                          {limit.currency && `${limit.currency} `}{limit.limitValue}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {limit.taxYear}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          {limit.legalReference || "—"}
                        </TableCell>
                        <TableCell>
                          {limit.verifiedByAdmin ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Badge variant="warning" className="text-xs">Unverified</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
