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

interface BenefitEntry {
  id: string;
  benefitCategory: string;
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
}

const emptyForm = {
  benefitCategory: "",
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
};

export default function BenefitsPage() {
  const [benefits, setBenefits] = useState<BenefitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

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
  }, []);

  function openNew() {
    setFormData(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(benefit: BenefitEntry) {
    setFormData({
      benefitCategory: benefit.benefitCategory,
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
    });
    setEditingId(benefit.id);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      benefitCategory: formData.benefitCategory,
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
        fetchBenefits();
      }
    } catch (err) {
      console.error("Failed to save benefit:", err);
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
                  <TableHead>Benefit Name</TableHead>
                  <TableHead>Cover Level</TableHead>
                  <TableHead>Funding</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cost/Employee</TableHead>
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
                    <TableCell className="font-medium">
                      {benefit.benefitName}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {benefit.coverLevel}
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
