"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { BENEFIT_CATEGORY_LABELS, formatCurrency } from "@/lib/utils";
import { HealthLimitsEditor } from "@/components/survey/health-limits-editor";
import type { HealthLimitFormData } from "@/lib/survey-types";

interface BenefitEntry {
  id: string;
  benefitCategory: string;
  country: string;
  benefitName: string;
  coverLevel: string;
  employerFunded: boolean;
  employeeContributionPercent: number | null;
  coversSpouse: boolean;
  coversDependents: boolean;
  maxDependents: number | null;
  isCore: boolean;
  isVoluntary: boolean;
  provider: string | null;
  annualCostPerEmployee: number | null;
  costCurrency: string;
  notes: string | null;
  healthExcess: number | null;
  healthExcessCurrency: string;
  healthCopayPercent: number | null;
  healthInpatientLimit: number | null;
  healthOutpatientLimit: number | null;
  healthLimitCurrency: string;
  healthLimits?: { id: string; limitType: string; hasLimit: boolean; limitAmount: number | null; limitCurrency: string }[];
  lifeCoverMultiple: number | null;
  lifeFixedCoverAmount: number | null;
  lifeCoverAmountCurrency: string;
  lifeFreeCoverLimit: number | null;
  ipBenefitPercent: number | null;
  ipWaitingPeriodWeeks: number | null;
  ipMaxBenefitAge: number | null;
  ciCoverMultiple: number | null;
  ciFixedCoverAmount: number | null;
  ciCoverAmountCurrency: string;
  dentalAnnualLimit: number | null;
  dentalAnnualLimitCurrency: string;
  dentalOrthoIncluded: boolean | null;
  pensionEmployerPct: number | null;
  pensionEmployeePct: number | null;
  brokerName: string | null;
  brokerSatisfactionScore: number | null;
  renewalDate: string | null;
  benefitSatisfactionScore: number | null;
}

const emptyForm = {
  benefitCategory: "",
  country: "",
  benefitName: "",
  coverLevel: "",
  employerFunded: true,
  employeeContributionPercent: "",
  coversSpouse: false,
  coversDependents: false,
  maxDependents: "",
  isCore: true,
  isVoluntary: false,
  provider: "",
  annualCostPerEmployee: "",
  costCurrency: "EUR",
  notes: "",
  healthExcess: "",
  healthExcessCurrency: "EUR",
  healthCopayPercent: "",
  healthInpatientLimit: "",
  healthOutpatientLimit: "",
  healthLimitCurrency: "EUR",
  healthLimits: [] as HealthLimitFormData[],
  lifeCoverMultiple: "",
  lifeFixedCoverAmount: "",
  lifeCoverAmountCurrency: "EUR",
  lifeFreeCoverLimit: "",
  ipBenefitPercent: "",
  ipWaitingPeriodWeeks: "",
  ipMaxBenefitAge: "",
  ciCoverMultiple: "",
  ciFixedCoverAmount: "",
  ciCoverAmountCurrency: "EUR",
  dentalAnnualLimit: "",
  dentalAnnualLimitCurrency: "EUR",
  dentalOrthoIncluded: false,
  pensionEmployerPct: "",
  pensionEmployeePct: "",
  brokerName: "",
  brokerSatisfactionScore: "",
  renewalDate: "",
  benefitSatisfactionScore: "",
};

export default function BenefitsPage() {
  const [benefits, setBenefits] = useState<BenefitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>([]);

  async function fetchBenefits() {
    try {
      const res = await fetch("/api/benefits");
      if (res.ok) {
        const data = await res.json();
        setBenefits(data);
      }
    } catch (err) {
      console.error("Failed to fetch benefits:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBenefits();
    fetch("/api/company/countries")
      .then((r) => r.json())
      .then((d) => setCountries(d.countries || []))
      .catch(() => {});
  }, []);

  function openNew() {
    setFormData(emptyForm);
    setEditingId(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(benefit: BenefitEntry) {
    setFormData({
      benefitCategory: benefit.benefitCategory,
      country: benefit.country || "",
      benefitName: benefit.benefitName,
      coverLevel: benefit.coverLevel,
      employerFunded: benefit.employerFunded,
      employeeContributionPercent:
        benefit.employeeContributionPercent?.toString() ?? "",
      coversSpouse: benefit.coversSpouse,
      coversDependents: benefit.coversDependents,
      maxDependents: benefit.maxDependents?.toString() ?? "",
      isCore: benefit.isCore,
      isVoluntary: benefit.isVoluntary,
      provider: benefit.provider ?? "",
      annualCostPerEmployee:
        benefit.annualCostPerEmployee?.toString() ?? "",
      costCurrency: benefit.costCurrency,
      notes: benefit.notes ?? "",
      healthExcess: benefit.healthExcess?.toString() ?? "",
      healthExcessCurrency: benefit.healthExcessCurrency || "EUR",
      healthCopayPercent: benefit.healthCopayPercent?.toString() ?? "",
      healthInpatientLimit: benefit.healthInpatientLimit?.toString() ?? "",
      healthOutpatientLimit: benefit.healthOutpatientLimit?.toString() ?? "",
      healthLimitCurrency: benefit.healthLimitCurrency || "EUR",
      healthLimits: (benefit.healthLimits ?? []).map((hl) => ({
        tempId: hl.id,
        limitType: hl.limitType,
        customLimitName: "",
        hasLimit: hl.hasLimit,
        limitAmount: hl.limitAmount,
        limitCurrency: hl.limitCurrency,
      })),
      lifeCoverMultiple: benefit.lifeCoverMultiple?.toString() ?? "",
      lifeFixedCoverAmount: benefit.lifeFixedCoverAmount?.toString() ?? "",
      lifeCoverAmountCurrency: benefit.lifeCoverAmountCurrency || "EUR",
      lifeFreeCoverLimit: benefit.lifeFreeCoverLimit?.toString() ?? "",
      ipBenefitPercent: benefit.ipBenefitPercent?.toString() ?? "",
      ipWaitingPeriodWeeks: benefit.ipWaitingPeriodWeeks?.toString() ?? "",
      ipMaxBenefitAge: benefit.ipMaxBenefitAge?.toString() ?? "",
      ciCoverMultiple: benefit.ciCoverMultiple?.toString() ?? "",
      ciFixedCoverAmount: benefit.ciFixedCoverAmount?.toString() ?? "",
      ciCoverAmountCurrency: benefit.ciCoverAmountCurrency || "EUR",
      dentalAnnualLimit: benefit.dentalAnnualLimit?.toString() ?? "",
      dentalAnnualLimitCurrency: benefit.dentalAnnualLimitCurrency || "EUR",
      dentalOrthoIncluded: benefit.dentalOrthoIncluded ?? false,
      pensionEmployerPct: benefit.pensionEmployerPct?.toString() ?? "",
      pensionEmployeePct: benefit.pensionEmployeePct?.toString() ?? "",
      brokerName: benefit.brokerName ?? "",
      brokerSatisfactionScore: benefit.brokerSatisfactionScore?.toString() ?? "",
      renewalDate: benefit.renewalDate ? benefit.renewalDate.split("T")[0] : "",
      benefitSatisfactionScore: benefit.benefitSatisfactionScore?.toString() ?? "",
    });
    setEditingId(benefit.id);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      benefitCategory: formData.benefitCategory,
      country: formData.country || undefined,
      benefitName: formData.benefitName,
      coverLevel: formData.coverLevel,
      employerFunded: formData.employerFunded,
      employeeContributionPercent: formData.employeeContributionPercent
        ? parseFloat(formData.employeeContributionPercent)
        : null,
      coversSpouse: formData.coversSpouse,
      coversDependents: formData.coversDependents,
      maxDependents: formData.maxDependents
        ? parseInt(formData.maxDependents)
        : null,
      isCore: formData.isCore,
      isVoluntary: formData.isVoluntary,
      provider: formData.provider || null,
      annualCostPerEmployee: formData.annualCostPerEmployee
        ? parseFloat(formData.annualCostPerEmployee)
        : null,
      costCurrency: formData.costCurrency,
      notes: formData.notes || null,
      healthExcess: formData.healthExcess
        ? parseFloat(formData.healthExcess)
        : null,
      healthExcessCurrency: formData.healthExcessCurrency,
      healthCopayPercent: formData.healthCopayPercent
        ? parseFloat(formData.healthCopayPercent)
        : null,
      healthInpatientLimit: formData.healthInpatientLimit
        ? parseFloat(formData.healthInpatientLimit)
        : null,
      healthOutpatientLimit: formData.healthOutpatientLimit
        ? parseFloat(formData.healthOutpatientLimit)
        : null,
      healthLimitCurrency: formData.healthLimitCurrency,
      healthLimits: formData.healthLimits.filter((hl: HealthLimitFormData) => hl.limitType).map((hl: HealthLimitFormData) => ({
        limitType: hl.limitType === "CUSTOM" ? hl.customLimitName : hl.limitType,
        hasLimit: hl.hasLimit,
        limitAmount: hl.hasLimit ? hl.limitAmount : null,
        limitCurrency: hl.limitCurrency,
      })),
      lifeCoverMultiple: formData.lifeCoverMultiple
        ? parseFloat(formData.lifeCoverMultiple as string)
        : null,
      lifeFixedCoverAmount: formData.lifeFixedCoverAmount
        ? parseFloat(formData.lifeFixedCoverAmount as string)
        : null,
      lifeCoverAmountCurrency: formData.lifeCoverAmountCurrency,
      lifeFreeCoverLimit: formData.lifeFreeCoverLimit
        ? parseFloat(formData.lifeFreeCoverLimit as string)
        : null,
      ipBenefitPercent: formData.ipBenefitPercent
        ? parseFloat(formData.ipBenefitPercent as string)
        : null,
      ipWaitingPeriodWeeks: formData.ipWaitingPeriodWeeks
        ? parseInt(formData.ipWaitingPeriodWeeks as string)
        : null,
      ipMaxBenefitAge: formData.ipMaxBenefitAge
        ? parseInt(formData.ipMaxBenefitAge as string)
        : null,
      ciCoverMultiple: formData.ciCoverMultiple
        ? parseFloat(formData.ciCoverMultiple as string)
        : null,
      ciFixedCoverAmount: formData.ciFixedCoverAmount
        ? parseFloat(formData.ciFixedCoverAmount as string)
        : null,
      ciCoverAmountCurrency: formData.ciCoverAmountCurrency,
      dentalAnnualLimit: formData.dentalAnnualLimit
        ? parseFloat(formData.dentalAnnualLimit as string)
        : null,
      dentalAnnualLimitCurrency: formData.dentalAnnualLimitCurrency,
      dentalOrthoIncluded: formData.dentalOrthoIncluded || null,
      pensionEmployerPct: formData.pensionEmployerPct
        ? parseFloat(formData.pensionEmployerPct as string)
        : null,
      pensionEmployeePct: formData.pensionEmployeePct
        ? parseFloat(formData.pensionEmployeePct as string)
        : null,
      brokerName: formData.brokerName || null,
      brokerSatisfactionScore: formData.brokerSatisfactionScore
        ? parseInt(formData.brokerSatisfactionScore as string)
        : null,
      renewalDate: formData.renewalDate || null,
      benefitSatisfactionScore: formData.benefitSatisfactionScore
        ? parseInt(formData.benefitSatisfactionScore as string)
        : null,
    };

    try {
      const url = editingId ? `/api/benefits/${editingId}` : "/api/benefits";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDialogOpen(false);
        setError(null);
        fetchBenefits();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || data.details?.[0]?.message || `Save failed (${res.status})`;
        setError(msg);
      }
    } catch (err) {
      console.error("Failed to save benefit:", err);
      setError("Network error — could not reach server");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this benefit entry?")) return;

    try {
      const res = await fetch(`/api/benefits/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchBenefits();
      }
    } catch (err) {
      console.error("Failed to delete benefit:", err);
    }
  }

  function updateField(field: string, value: string | boolean | number) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  const currencies = ["EUR", "GBP", "USD", "AED", "SGD", "AUD"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Loading benefits...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Benefits</h1>
          <p className="mt-1 text-slate-500">
            Manage your company&apos;s benefit entries
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Benefit
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {benefits.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">
                No benefit entries yet. Add your first benefit to start
                benchmarking.
              </p>
              <Button className="mt-4" onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Benefit
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Benefit Name</TableHead>
                  <TableHead>Cover Level</TableHead>
                  <TableHead>Broker</TableHead>
                  <TableHead>Funding</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cost/Employee</TableHead>
                  <TableHead>Renewal Date</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benefits.map((benefit) => (
                  <TableRow key={benefit.id}>
                    <TableCell>
                      <span className="text-xs font-medium text-slate-600">
                        {BENEFIT_CATEGORY_LABELS[benefit.benefitCategory]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">
                        {benefit.country || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {benefit.benefitName}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {benefit.coverLevel}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {benefit.brokerName || "—"}
                    </TableCell>
                    <TableCell>
                      {benefit.employerFunded ? (
                        <Badge variant="success">Employer</Badge>
                      ) : (
                        <Badge variant="secondary">Employee</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {benefit.isCore ? (
                        <Badge>Core</Badge>
                      ) : (
                        <Badge variant="outline">Voluntary</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {benefit.annualCostPerEmployee
                        ? formatCurrency(
                            benefit.annualCostPerEmployee,
                            benefit.costCurrency
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {benefit.renewalDate
                        ? new Date(benefit.renewalDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(benefit)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(benefit.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Benefit" : "Add New Benefit"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the benefit entry details"
                : "Enter the details of the employee benefit"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {countries.length > 1 && (
              <div className="space-y-2">
                <Label>Country</Label>
                <Select
                  value={formData.country}
                  onValueChange={(v) => updateField("country", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Benefit Category</Label>
                <Select
                  value={formData.benefitCategory}
                  onValueChange={(v) => updateField("benefitCategory", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BENEFIT_CATEGORY_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefitName">Benefit Name</Label>
                <Input
                  id="benefitName"
                  value={formData.benefitName}
                  onChange={(e) => updateField("benefitName", e.target.value)}
                  placeholder="e.g. Group Health Insurance"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverLevel">Cover Level</Label>
              <Input
                id="coverLevel"
                value={formData.coverLevel}
                onChange={(e) => updateField("coverLevel", e.target.value)}
                placeholder='e.g. "2x salary", "€50,000", "75% of salary"'
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Input
                  id="provider"
                  value={formData.provider}
                  onChange={(e) => updateField("provider", e.target.value)}
                  placeholder="e.g. Irish Life, Zurich"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPerEmployee">
                  Annual Cost Per Employee
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="costPerEmployee"
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.annualCostPerEmployee}
                    onChange={(e) =>
                      updateField("annualCostPerEmployee", e.target.value)
                    }
                  />
                  <Select
                    value={formData.costCurrency}
                    onValueChange={(v) => updateField("costCurrency", v)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.employerFunded}
                  onCheckedChange={(v) => updateField("employerFunded", v)}
                />
                <Label>Employer Funded</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isCore}
                  onCheckedChange={(v) => {
                    updateField("isCore", v);
                    if (v) updateField("isVoluntary", false);
                  }}
                />
                <Label>Core Benefit</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isVoluntary}
                  onCheckedChange={(v) => {
                    updateField("isVoluntary", v);
                    if (v) updateField("isCore", false);
                  }}
                />
                <Label>Voluntary</Label>
              </div>
            </div>

            {!formData.employerFunded && (
              <div className="space-y-2">
                <Label htmlFor="empContrib">
                  Employee Contribution (%)
                </Label>
                <Input
                  id="empContrib"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={formData.employeeContributionPercent}
                  onChange={(e) =>
                    updateField("employeeContributionPercent", e.target.value)
                  }
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.coversSpouse}
                  onCheckedChange={(v) => updateField("coversSpouse", v)}
                />
                <Label>Covers Spouse</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.coversDependents}
                  onCheckedChange={(v) => updateField("coversDependents", v)}
                />
                <Label>Covers Dependents</Label>
              </div>
              {formData.coversDependents && (
                <div className="space-y-2">
                  <Label htmlFor="maxDeps">Max Dependents</Label>
                  <Input
                    id="maxDeps"
                    type="number"
                    min={0}
                    value={formData.maxDependents}
                    onChange={(e) =>
                      updateField("maxDependents", e.target.value)
                    }
                  />
                </div>
              )}
            </div>

            {formData.benefitCategory === "HEALTH" && (
              <div className="space-y-4 rounded-md border border-dashed border-blue-200 bg-blue-50/50 p-3">
                <p className="text-sm font-medium text-blue-800">Health Insurance Details</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Excess (Deductible)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={formData.healthExcess}
                        onChange={(e) => updateField("healthExcess", e.target.value)}
                        placeholder="e.g. 250"
                      />
                      <Select
                        value={formData.healthExcessCurrency}
                        onValueChange={(v) => updateField("healthExcessCurrency", v)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Co-Pay (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={formData.healthCopayPercent}
                      onChange={(e) => updateField("healthCopayPercent", e.target.value)}
                      placeholder="e.g. 20"
                    />
                  </div>
                </div>
                <HealthLimitsEditor
                  limits={formData.healthLimits}
                  currency={formData.healthLimitCurrency}
                  onUpdate={(limits) => setFormData((prev) => ({ ...prev, healthLimits: limits }))}
                />
              </div>
            )}

            {formData.benefitCategory === "LIFE" && (
              <div className="space-y-4 rounded-md border border-dashed border-green-200 bg-green-50/50 p-3">
                <p className="text-sm font-medium text-green-800">Life Insurance Details</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Cover Multiple (x salary)</Label>
                    <Input type="number" min={0} step={0.5} value={formData.lifeCoverMultiple} onChange={(e) => updateField("lifeCoverMultiple", e.target.value)} placeholder="e.g. 4" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fixed Cover Amount</Label>
                    <div className="flex gap-2">
                      <Input type="number" min={0} step={1000} value={formData.lifeFixedCoverAmount} onChange={(e) => updateField("lifeFixedCoverAmount", e.target.value)} placeholder="e.g. 200000" />
                      <Select value={formData.lifeCoverAmountCurrency} onValueChange={(v) => updateField("lifeCoverAmountCurrency", v)}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{currencies.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Free Cover Limit</Label>
                  <div className="flex gap-2">
                    <Input type="number" min={0} step={1000} value={formData.lifeFreeCoverLimit} onChange={(e) => updateField("lifeFreeCoverLimit", e.target.value)} placeholder="e.g. 500000" />
                    <Select value={formData.lifeCoverAmountCurrency} onValueChange={(v) => updateField("lifeCoverAmountCurrency", v)}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>{currencies.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {formData.benefitCategory === "INCOME_PROTECTION" && (
              <div className="space-y-4 rounded-md border border-dashed border-purple-200 bg-purple-50/50 p-3">
                <p className="text-sm font-medium text-purple-800">Income Protection Details</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Benefit (% of salary)</Label>
                    <Input type="number" min={0} max={100} step={1} value={formData.ipBenefitPercent} onChange={(e) => updateField("ipBenefitPercent", e.target.value)} placeholder="e.g. 75" />
                  </div>
                  <div className="space-y-2">
                    <Label>Waiting Period (weeks)</Label>
                    <Input type="number" min={0} step={1} value={formData.ipWaitingPeriodWeeks} onChange={(e) => updateField("ipWaitingPeriodWeeks", e.target.value)} placeholder="e.g. 26" />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Benefit Age</Label>
                    <Input type="number" min={0} step={1} value={formData.ipMaxBenefitAge} onChange={(e) => updateField("ipMaxBenefitAge", e.target.value)} placeholder="e.g. 65" />
                  </div>
                </div>
              </div>
            )}

            {formData.benefitCategory === "CRITICAL_ILLNESS" && (
              <div className="space-y-4 rounded-md border border-dashed border-orange-200 bg-orange-50/50 p-3">
                <p className="text-sm font-medium text-orange-800">Critical Illness Details</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Cover Multiple (x salary)</Label>
                    <Input type="number" min={0} step={0.5} value={formData.ciCoverMultiple} onChange={(e) => updateField("ciCoverMultiple", e.target.value)} placeholder="e.g. 2" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fixed Cover Amount</Label>
                    <div className="flex gap-2">
                      <Input type="number" min={0} step={1000} value={formData.ciFixedCoverAmount} onChange={(e) => updateField("ciFixedCoverAmount", e.target.value)} placeholder="e.g. 100000" />
                      <Select value={formData.ciCoverAmountCurrency} onValueChange={(v) => updateField("ciCoverAmountCurrency", v)}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{currencies.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formData.benefitCategory === "DENTAL" && (
              <div className="space-y-4 rounded-md border border-dashed border-teal-200 bg-teal-50/50 p-3">
                <p className="text-sm font-medium text-teal-800">Dental Details</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Annual Limit</Label>
                    <div className="flex gap-2">
                      <Input type="number" min={0} step={100} value={formData.dentalAnnualLimit} onChange={(e) => updateField("dentalAnnualLimit", e.target.value)} placeholder="e.g. 1000" />
                      <Select value={formData.dentalAnnualLimitCurrency} onValueChange={(v) => updateField("dentalAnnualLimitCurrency", v)}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{currencies.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={formData.dentalOrthoIncluded as boolean} onCheckedChange={(v) => updateField("dentalOrthoIncluded", v)} />
                    <Label>Orthodontic Cover Included</Label>
                  </div>
                </div>
              </div>
            )}

            {formData.benefitCategory === "PENSION" && (
              <div className="space-y-4 rounded-md border border-dashed border-indigo-200 bg-indigo-50/50 p-3">
                <p className="text-sm font-medium text-indigo-800">Pension Details</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Employer Contribution (%)</Label>
                    <Input type="number" min={0} max={100} step={0.5} value={formData.pensionEmployerPct} onChange={(e) => updateField("pensionEmployerPct", e.target.value)} placeholder="e.g. 5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Employee Contribution (%)</Label>
                    <Input type="number" min={0} max={100} step={0.5} value={formData.pensionEmployeePct} onChange={(e) => updateField("pensionEmployeePct", e.target.value)} placeholder="e.g. 5" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="renewalDate">Renewal Date</Label>
                <Input
                  id="renewalDate"
                  type="date"
                  value={formData.renewalDate}
                  onChange={(e) => updateField("renewalDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefitSatisfaction">Benefit Satisfaction (1-10)</Label>
                <Input
                  id="benefitSatisfaction"
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={formData.benefitSatisfactionScore}
                  onChange={(e) => updateField("benefitSatisfactionScore", e.target.value)}
                  placeholder="e.g. 7"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brokerName">Current Broker</Label>
                <Input
                  id="brokerName"
                  value={formData.brokerName}
                  onChange={(e) => updateField("brokerName", e.target.value)}
                  placeholder="e.g. Mercer, Aon, Willis Towers Watson"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brokerSatisfaction">Broker Satisfaction (1-10)</Label>
                <Input
                  id="brokerSatisfaction"
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={formData.brokerSatisfactionScore}
                  onChange={(e) => updateField("brokerSatisfactionScore", e.target.value)}
                  placeholder="e.g. 8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Additional details about this benefit"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Benefit"
                  : "Add Benefit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
