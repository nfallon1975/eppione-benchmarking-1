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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Plus,
  Loader2,
  ShieldCheck,
  Scale,
  Trash2,
  Pencil,
} from "lucide-react";
import { BENEFIT_CATEGORY_LABELS, COUNTRY_LABELS } from "@/lib/utils";
import { CountryPicker } from "@/components/ui/country-picker";
import { ComplianceRequirementForm } from "@/components/broker/compliance-requirement-form";
import { ComplianceLimitForm } from "@/components/broker/compliance-limit-form";

interface RequirementItem {
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
  verifiedByAdmin: boolean;
  contributedById: string;
}

interface LimitItem {
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
  contributedById: string;
}

const REQUIREMENT_TYPE_LABELS: Record<string, string> = {
  MANDATORY: "Mandatory",
  QUASI_MANDATORY: "Quasi-Mandatory",
  RECOMMENDED: "Recommended",
  COMMON_PRACTICE: "Common Practice",
};

const REQUIREMENT_TYPE_COLORS: Record<string, string> = {
  MANDATORY: "destructive",
  QUASI_MANDATORY: "warning",
  RECOMMENDED: "secondary",
  COMMON_PRACTICE: "outline",
};

const LIMIT_TYPE_LABELS: Record<string, string> = {
  TAX_RELIEF_CAP: "Tax Relief Cap",
  CONTRIBUTION_LIMIT: "Contribution Limit",
  INSURABLE_EARNINGS_CEILING: "Insurable Earnings Ceiling",
  SOCIAL_SECURITY_CAP: "Social Security Cap",
  BENEFIT_IN_KIND_THRESHOLD: "Benefit-in-Kind Threshold",
  OTHER: "Other",
};

export default function BrokerCompliancePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState("");
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [limits, setLimits] = useState<LimitItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [reqFormOpen, setReqFormOpen] = useState(false);
  const [limitFormOpen, setLimitFormOpen] = useState(false);
  const [editReq, setEditReq] = useState<RequirementItem | null>(null);
  const [editLimit, setEditLimit] = useState<LimitItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Get broker's active countries
  const [brokerCountries, setBrokerCountries] = useState<string[]>([]);

  useEffect(() => {
    if (session?.user?.role !== "BROKER") {
      router.push("/dashboard");
      return;
    }
    // Fetch broker profile to get countriesActive
    fetch("/api/broker/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.countriesActive?.length > 0) {
          setBrokerCountries(data.countriesActive);
          if (!selectedCountry) setSelectedCountry(data.countriesActive[0]);
        }
      })
      .catch(console.error);
  }, [session, router, selectedCountry]);

  const fetchData = useCallback(async () => {
    if (!selectedCountry) return;
    setLoading(true);
    try {
      const [reqRes, limRes] = await Promise.all([
        fetch(`/api/broker/compliance/requirements?country=${selectedCountry}`),
        fetch(`/api/broker/compliance/limits?country=${selectedCountry}`),
      ]);
      if (reqRes.ok) setRequirements(await reqRes.json());
      if (limRes.ok) setLimits(await limRes.json());
    } catch (err) {
      console.error("Failed to fetch compliance data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCountry]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDeleteReq(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/broker/compliance/requirements?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch {
      alert("Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  async function handleDeleteLimit(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/broker/compliance/limits?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
      else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch {
      alert("Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Compliance Data</h1>
        <p className="mt-1 text-slate-500">
          Manage benefit requirements and statutory limits by country
        </p>
      </div>

      {/* Country selector */}
      <div className="flex items-center gap-4">
        <CountryPicker
          value={selectedCountry}
          onChange={setSelectedCountry}
          limitTo={brokerCountries.length > 0 ? brokerCountries : undefined}
          className="w-[280px]"
        />
        {selectedCountry && (
          <span className="text-sm text-slate-500">
            {requirements.length} requirements, {limits.length} limits
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {!loading && !selectedCountry && (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="text-lg font-medium text-slate-700">Select a country</p>
            <p className="mt-1 text-sm text-slate-500">
              Choose a country to view and manage compliance data.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && selectedCountry && (
        <Tabs defaultValue="requirements">
          <TabsList>
            <TabsTrigger value="requirements">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Requirements ({requirements.length})
            </TabsTrigger>
            <TabsTrigger value="limits">
              <Scale className="mr-2 h-4 w-4" />
              Statutory Limits ({limits.length})
            </TabsTrigger>
          </TabsList>

          {/* Requirements Tab */}
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
                  <Button onClick={() => { setEditReq(null); setReqFormOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Requirement
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Minimum Level</TableHead>
                      <TableHead>Effective</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requirements.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-500">
                          No requirements added for {COUNTRY_LABELS[selectedCountry] || selectedCountry} yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {requirements.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {BENEFIT_CATEGORY_LABELS[req.benefitCategory] || req.benefitCategory}
                        </TableCell>
                        <TableCell>
                          <Badge variant={(REQUIREMENT_TYPE_COLORS[req.requirementType] || "secondary") as "destructive" | "warning" | "secondary" | "outline"}>
                            {REQUIREMENT_TYPE_LABELS[req.requirementType] || req.requirementType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs text-sm">
                          <p>{req.description}</p>
                          {req.legalReference && (
                            <p className="mt-1 text-xs text-slate-400">Ref: {req.legalReference}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {req.minimumLevel || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(req.effectiveFrom).toLocaleDateString()}
                          {req.effectiveTo && ` – ${new Date(req.effectiveTo).toLocaleDateString()}`}
                        </TableCell>
                        <TableCell>
                          {req.verifiedByAdmin ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Badge variant="warning" className="text-xs">Unverified</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!req.verifiedByAdmin && req.contributedById === session?.user?.id && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditReq(req);
                                  setReqFormOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteReq(req.id)}
                                disabled={deleting === req.id}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Limits Tab */}
          <TabsContent value="limits">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Statutory Limits</CardTitle>
                    <CardDescription>
                      Tax relief caps, contribution limits, and statutory thresholds for {COUNTRY_LABELS[selectedCountry] || selectedCountry}
                    </CardDescription>
                  </div>
                  <Button onClick={() => { setEditLimit(null); setLimitFormOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Limit
                  </Button>
                </div>
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
                      <TableHead>Verified</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {limits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-500">
                          No statutory limits added for {COUNTRY_LABELS[selectedCountry] || selectedCountry} yet.
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
                        <TableCell className="max-w-xs text-sm">{limit.description}</TableCell>
                        <TableCell className="font-medium">
                          {limit.currency && `${limit.currency} `}{limit.limitValue}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{limit.taxYear}</TableCell>
                        <TableCell>
                          {limit.verifiedByAdmin ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Badge variant="warning" className="text-xs">Unverified</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!limit.verifiedByAdmin && limit.contributedById === session?.user?.id && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditLimit(limit);
                                  setLimitFormOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLimit(limit.id)}
                                disabled={deleting === limit.id}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
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

      {/* Requirement Form Dialog */}
      <ComplianceRequirementForm
        open={reqFormOpen}
        onOpenChange={setReqFormOpen}
        country={selectedCountry}
        initialData={editReq ? {
          id: editReq.id,
          benefitCategory: editReq.benefitCategory,
          requirementType: editReq.requirementType,
          description: editReq.description,
          minimumLevel: editReq.minimumLevel || "",
          legalReference: editReq.legalReference || "",
          effectiveFrom: editReq.effectiveFrom.split("T")[0],
          effectiveTo: editReq.effectiveTo?.split("T")[0] || "",
          penaltyForNonCompliance: editReq.penaltyForNonCompliance || "",
          notes: editReq.notes || "",
        } : undefined}
        onSaved={fetchData}
      />

      {/* Limit Form Dialog */}
      <ComplianceLimitForm
        open={limitFormOpen}
        onOpenChange={setLimitFormOpen}
        country={selectedCountry}
        initialData={editLimit ? {
          id: editLimit.id,
          limitType: editLimit.limitType,
          benefitCategory: editLimit.benefitCategory || "",
          description: editLimit.description,
          limitValue: editLimit.limitValue,
          currency: editLimit.currency || "EUR",
          taxYear: editLimit.taxYear,
          legalReference: editLimit.legalReference || "",
        } : undefined}
        onSaved={fetchData}
      />
    </div>
  );
}
