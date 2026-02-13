"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BENEFIT_CATEGORY_LABELS } from "@/lib/utils";

const REQUIREMENT_TYPE_LABELS: Record<string, string> = {
  MANDATORY: "Mandatory",
  QUASI_MANDATORY: "Quasi-Mandatory",
  RECOMMENDED: "Recommended",
  COMMON_PRACTICE: "Common Practice",
};

interface RequirementFormData {
  id?: string;
  benefitCategory: string;
  requirementType: string;
  description: string;
  minimumLevel: string;
  legalReference: string;
  effectiveFrom: string;
  effectiveTo: string;
  penaltyForNonCompliance: string;
  notes: string;
}

interface ComplianceRequirementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country: string;
  initialData?: RequirementFormData;
  onSaved: () => void;
}

export function ComplianceRequirementForm({
  open,
  onOpenChange,
  country,
  initialData,
  onSaved,
}: ComplianceRequirementFormProps) {
  const isEdit = !!initialData?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<RequirementFormData>(
    initialData || {
      benefitCategory: "",
      requirementType: "",
      description: "",
      minimumLevel: "",
      legalReference: "",
      effectiveFrom: "",
      effectiveTo: "",
      penaltyForNonCompliance: "",
      notes: "",
    }
  );

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        country,
        benefitCategory: form.benefitCategory,
        requirementType: form.requirementType,
        description: form.description,
        minimumLevel: form.minimumLevel || null,
        legalReference: form.legalReference || null,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || null,
        penaltyForNonCompliance: form.penaltyForNonCompliance || null,
        notes: form.notes || null,
      };

      const res = await fetch("/api/broker/compliance/requirements", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: initialData!.id, ...payload } : payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      onSaved();
      onOpenChange(false);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Benefit Requirement" : "Add Benefit Requirement"}
          </DialogTitle>
          <DialogDescription>
            Contribute a country benefit requirement for {country}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-2">
            <Label>Benefit Category</Label>
            <Select value={form.benefitCategory} onValueChange={(v) => updateField("benefitCategory", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {Object.entries(BENEFIT_CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Requirement Type</Label>
            <Select value={form.requirementType} onValueChange={(v) => updateField("requirementType", v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {Object.entries(REQUIREMENT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="req-desc">Description</Label>
            <Textarea
              id="req-desc"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe the requirement..."
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="req-min">Minimum Level</Label>
              <Input
                id="req-min"
                value={form.minimumLevel}
                onChange={(e) => updateField("minimumLevel", e.target.value)}
                placeholder="e.g. 2x salary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-legal">Legal Reference</Label>
              <Input
                id="req-legal"
                value={form.legalReference}
                onChange={(e) => updateField("legalReference", e.target.value)}
                placeholder="e.g. Employment Act 2003"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="req-from">Effective From</Label>
              <Input
                id="req-from"
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => updateField("effectiveFrom", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-to">Effective To (Optional)</Label>
              <Input
                id="req-to"
                type="date"
                value={form.effectiveTo}
                onChange={(e) => updateField("effectiveTo", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="req-penalty">Penalty for Non-Compliance</Label>
            <Input
              id="req-penalty"
              value={form.penaltyForNonCompliance}
              onChange={(e) => updateField("penaltyForNonCompliance", e.target.value)}
              placeholder="e.g. Fine up to €50,000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="req-notes">Notes</Label>
            <Textarea
              id="req-notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Additional notes..."
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update" : "Add Requirement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
