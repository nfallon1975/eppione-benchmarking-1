"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const LIMIT_TYPE_LABELS: Record<string, string> = {
  TAX_RELIEF_CAP: "Tax Relief Cap",
  CONTRIBUTION_LIMIT: "Contribution Limit",
  INSURABLE_EARNINGS_CEILING: "Insurable Earnings Ceiling",
  SOCIAL_SECURITY_CAP: "Social Security Cap",
  BENEFIT_IN_KIND_THRESHOLD: "Benefit-in-Kind Threshold",
  OTHER: "Other",
};

interface LimitFormData {
  id?: string;
  limitType: string;
  benefitCategory: string;
  description: string;
  limitValue: string;
  currency: string;
  taxYear: string;
  legalReference: string;
}

interface ComplianceLimitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country: string;
  initialData?: LimitFormData;
  onSaved: () => void;
}

export function ComplianceLimitForm({
  open,
  onOpenChange,
  country,
  initialData,
  onSaved,
}: ComplianceLimitFormProps) {
  const isEdit = !!initialData?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<LimitFormData>(
    initialData || {
      limitType: "",
      benefitCategory: "",
      description: "",
      limitValue: "",
      currency: "EUR",
      taxYear: "",
      legalReference: "",
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
        limitType: form.limitType,
        benefitCategory: form.benefitCategory || null,
        description: form.description,
        limitValue: form.limitValue,
        currency: form.currency || null,
        taxYear: form.taxYear,
        legalReference: form.legalReference || null,
      };

      const res = await fetch("/api/broker/compliance/limits", {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Statutory Limit" : "Add Statutory Limit"}
          </DialogTitle>
          <DialogDescription>
            Contribute a statutory limit for {country}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-2">
            <Label>Limit Type</Label>
            <Select value={form.limitType} onValueChange={(v) => updateField("limitType", v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {Object.entries(LIMIT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Benefit Category (Optional)</Label>
            <Select value={form.benefitCategory} onValueChange={(v) => updateField("benefitCategory", v)}>
              <SelectTrigger><SelectValue placeholder="General / All categories" /></SelectTrigger>
              <SelectContent>
                {Object.entries(BENEFIT_CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit-desc">Description</Label>
            <Input
              id="limit-desc"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe the statutory limit..."
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="limit-value">Limit Value</Label>
              <Input
                id="limit-value"
                value={form.limitValue}
                onChange={(e) => updateField("limitValue", e.target.value)}
                placeholder="e.g. 115,000 or 4%"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => updateField("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["EUR", "GBP", "USD", "AED", "SGD", "AUD"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="limit-year">Tax Year</Label>
              <Input
                id="limit-year"
                value={form.taxYear}
                onChange={(e) => updateField("taxYear", e.target.value)}
                placeholder="e.g. 2025/26"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit-legal">Legal Reference</Label>
              <Input
                id="limit-legal"
                value={form.legalReference}
                onChange={(e) => updateField("legalReference", e.target.value)}
                placeholder="e.g. Finance Act 2025"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update" : "Add Limit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
