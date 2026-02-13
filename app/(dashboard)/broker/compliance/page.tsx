"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, CheckCircle2, Copy } from "lucide-react";
import { ComplianceRequirementForm } from "@/components/broker/compliance-requirement-form";
import { ComplianceLimitForm } from "@/components/broker/compliance-limit-form";
import { COUNTRY_LABELS, BENEFIT_CATEGORY_LABELS } from "@/lib/utils";

const REQUIREMENT_TYPE_LABELS: Record<string, string> = {
  MANDATORY: "Mandatory",
  QUASI_MANDATORY: "Quasi-Mandatory",
  RECOMMENDED: "Recommended",
  COMMON_PRACTICE: "Common Practice",
};

const LIMIT_TYPE_LABELS: Record<string, string> = {
  TAX_RELIEF_CAP: "Tax Relief Cap",
  CONTRIBUTION_LIMIT: "Contribution Limit",
  INSURABLE_EARNINGS_CEILING: "Insurable Earnings Ceiling",
  SOCIAL_SECURITY_CAP: "Social Security Cap",
  BENEFIT_IN_KIND_THRESHOLD: "Benefit-in-Kind Threshold",
  OTHER: "Other",
};

interface Requirement {
  id: string;
  country: string;
  benefitCategory: string;
  requirementType: string;
  description: string;
  minimumLevel: string | null;
  legalReference: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  penaltyForNonCompliance: string | null;
  notes: string | null;
  contributedById: string;
  contributedBy: { name: string | null; email: string };
  verifiedByAdmin: boolean;
}

interface Limit {
  id: string;
  country: string;
  limitType: string;
  benefitCategory: string | null;
  description: string;
  limitValue: string;
  currency: string | null;
  taxYear: string;
  legalReference: string | null;
  contributedById: string;
  contributedBy: { name: string | null; email: string };
  verifiedByAdmin: boolean;
}

export default function BrokerCompliancePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [country, setCountry] = useState("");
  const [brokerCountries, setBrokerCountries] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [limits, setLimits] = useState<Limit[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [reqFormOpen, setReqFormOpen] = useState(false);
  const [limitFormOpen, setLimitFormOpen] = useState(false);
  const [editReq, setEditReq] = useState<Requirement | null>(null);
  const [editLimit, setEditLimit] = useState<Limit | null>(null);

  useEffect(() => {
    if (session?.user?.role !== "BROKER") {
      router.push("/dashboard");
      return;
    }

    // Get broker's active countries
    fetch("/api/broker/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then(() => {
        // Use profile countries from a separate call or from stats
      })
      .catch(() => {});

    // Get broker profile for countries
    fetch("/api/broker/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.countriesActive?.length) {
          setBrokerCountries(data.countriesActive);
          setCountry(data.countriesActive[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, router]);

  const fetchData = useCallback(() => {
    if (!country) return;
    Promise.all([
      fetch(`/api/broker/compliance/requirements?country=${country}`).then((r) =>
        r.ok ? r.json() : []
      ),
      fetch(`/api/broker/compliance/limits?country=${country}`).then((r) =>
        r.ok ? r.json() : []
      ),
    ]).then(([reqs, lims]) => {
      setRequirements(reqs);
      setLimits(lims);
    });
  }, [country]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function deleteRequirement(id: string) {
    if (!confirm("Delete this requirement?")) return;
    await fetch(`/api/broker/compliance/requirements?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  async function deleteLimit(id: string) {
    if (!confirm("Delete this limit?")) return;
    await fetch(`/api/broker/compliance/limits?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  async function copyLimitToNextYear(limit: Limit) {
    const parts = limit.taxYear.split("/");
    let nextYear: string;
    if (parts.length === 2) {
      const y1 = parseInt(parts[0]) + 1;
      const y2 = parseInt(parts[1]) + 1;
      nextYear = `${y1}/${y2}`;
    } else {
      nextYear = `${parseInt(limit.taxYear) + 1}`;
    }

    await fetch("/api/broker/compliance/limits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country: limit.country,
        limitType: limit.limitType,
        benefitCategory: limit.benefitCategory || null,
        description: limit.description,
        limitValue: limit.limitValue,
        currency: limit.currency,
        taxYear: nextYear,
        legalReference: limit.legalReference,
      }),
    });
    fetchData();
  }

  const userId = session?.user?.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Loading compliance data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Compliance Data</h1>
          <p className="mt-1 text-slate-500">
            Contribute and manage country-level compliance information
          </p>
        </div>
        <div className="w-48">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {brokerCountries.map((code) => (
                <SelectItem key={code} value={code}>
                  {COUNTRY_LABELS[code] || code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="requirements">
        <TabsList>
          <TabsTrigger value="requirements">Benefit Requirements</TabsTrigger>
          <TabsTrigger value="limits">Statutory Limits</TabsTrigger>
        </TabsList>

        <TabsContent value="requirements" className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="gap-2"
              onClick={() => { setEditReq(null); setReqFormOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Add Requirement
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Benefit Requirements — {COUNTRY_LABELS[country] || country}</CardTitle>
              <CardDescription>
                {requirements.length} requirement{requirements.length !== 1 ? "s" : ""} found
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-slate-500 py-8">
                        No requirements found for this country.
                      </TableCell>
                    </TableRow>
                  )}
                  {requirements.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">
                        {BENEFIT_CATEGORY_LABELS[req.benefitCategory] || req.benefitCategory}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {REQUIREMENT_TYPE_LABELS[req.requirementType] || req.requirementType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{req.description}</TableCell>
                      <TableCell>
                        {req.verifiedByAdmin ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="warning">Pending review</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {req.contributedById === userId && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditReq(req);
                                setReqFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {!req.verifiedByAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500"
                                onClick={() => deleteRequirement(req.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <ComplianceRequirementForm
            open={reqFormOpen}
            onOpenChange={setReqFormOpen}
            country={country}
            initialData={
              editReq
                ? {
                    id: editReq.id,
                    benefitCategory: editReq.benefitCategory,
                    requirementType: editReq.requirementType,
                    description: editReq.description,
                    minimumLevel: editReq.minimumLevel || "",
                    legalReference: editReq.legalReference || "",
                    effectiveFrom: editReq.effectiveFrom
                      ? new Date(editReq.effectiveFrom).toISOString().split("T")[0]
                      : "",
                    effectiveTo: editReq.effectiveTo
                      ? new Date(editReq.effectiveTo).toISOString().split("T")[0]
                      : "",
                    penaltyForNonCompliance: editReq.penaltyForNonCompliance || "",
                    notes: editReq.notes || "",
                  }
                : undefined
            }
            onSaved={fetchData}
          />
        </TabsContent>

        <TabsContent value="limits" className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="gap-2"
              onClick={() => { setEditLimit(null); setLimitFormOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Add Limit
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Statutory Limits — {COUNTRY_LABELS[country] || country}</CardTitle>
              <CardDescription>
                {limits.length} limit{limits.length !== 1 ? "s" : ""} found
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Tax Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {limits.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-slate-500 py-8">
                        No statutory limits found for this country.
                      </TableCell>
                    </TableRow>
                  )}
                  {limits.map((limit) => (
                    <TableRow key={limit.id}>
                      <TableCell className="font-medium">
                        {LIMIT_TYPE_LABELS[limit.limitType] || limit.limitType}
                      </TableCell>
                      <TableCell>
                        {limit.benefitCategory
                          ? BENEFIT_CATEGORY_LABELS[limit.benefitCategory] || limit.benefitCategory
                          : "General"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{limit.description}</TableCell>
                      <TableCell>
                        {limit.limitValue}
                        {limit.currency ? ` ${limit.currency}` : ""}
                      </TableCell>
                      <TableCell>{limit.taxYear}</TableCell>
                      <TableCell>
                        {limit.verifiedByAdmin ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="warning">Pending review</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {limit.contributedById === userId && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditLimit(limit);
                                setLimitFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Copy to next year"
                              onClick={() => copyLimitToNextYear(limit)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            {!limit.verifiedByAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500"
                                onClick={() => deleteLimit(limit.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <ComplianceLimitForm
            open={limitFormOpen}
            onOpenChange={setLimitFormOpen}
            country={country}
            initialData={
              editLimit
                ? {
                    id: editLimit.id,
                    limitType: editLimit.limitType,
                    benefitCategory: editLimit.benefitCategory || "",
                    description: editLimit.description,
                    limitValue: editLimit.limitValue,
                    currency: editLimit.currency || "EUR",
                    taxYear: editLimit.taxYear,
                    legalReference: editLimit.legalReference || "",
                  }
                : undefined
            }
            onSaved={fetchData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
