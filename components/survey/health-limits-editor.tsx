"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import {
  HealthLimitFormData,
  STANDARD_HEALTH_LIMIT_TYPES,
  createEmptyHealthLimit,
} from "@/lib/survey-types";

interface HealthLimitsEditorProps {
  limits: HealthLimitFormData[];
  currency: string;
  onUpdate: (limits: HealthLimitFormData[]) => void;
}

const currencies = ["EUR", "GBP", "USD", "AED", "SGD", "AUD"];

export function HealthLimitsEditor({
  limits,
  currency,
  onUpdate,
}: HealthLimitsEditorProps) {
  function addLimit() {
    onUpdate([...limits, createEmptyHealthLimit(currency)]);
  }

  function removeLimit(index: number) {
    onUpdate(limits.filter((_, i) => i !== index));
  }

  function updateLimit(index: number, updated: HealthLimitFormData) {
    const newLimits = [...limits];
    newLimits[index] = updated;
    onUpdate(newLimits);
  }

  // Which standard types are already used
  const usedTypes = new Set(limits.map((l) => l.limitType));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-blue-800">
          Coverage Limits
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLimit}
          className="h-7 text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Limit
        </Button>
      </div>

      {limits.length === 0 && (
        <p className="text-xs text-slate-500">
          No limits configured. Click &quot;Add Limit&quot; to specify inpatient, outpatient, or other coverage limits.
        </p>
      )}

      {limits.map((limit, index) => (
        <div
          key={limit.tempId}
          className="grid gap-3 rounded border border-slate-200 bg-white p-3 md:grid-cols-4"
        >
          {/* Limit Type */}
          <div className="space-y-1">
            <Label className="text-xs">Limit Type</Label>
            <Select
              value={limit.limitType}
              onValueChange={(v) => {
                const updated = { ...limit, limitType: v };
                if (v !== "CUSTOM") {
                  updated.customLimitName = "";
                }
                updateLimit(index, updated);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {STANDARD_HEALTH_LIMIT_TYPES.map((t) => (
                  <SelectItem
                    key={t.value}
                    value={t.value}
                    disabled={usedTypes.has(t.value) && limit.limitType !== t.value}
                  >
                    {t.label}
                  </SelectItem>
                ))}
                <SelectItem value="CUSTOM">Custom...</SelectItem>
              </SelectContent>
            </Select>
            {limit.limitType === "CUSTOM" && (
              <Input
                value={limit.customLimitName}
                onChange={(e) =>
                  updateLimit(index, {
                    ...limit,
                    customLimitName: e.target.value,
                  })
                }
                placeholder="Custom limit name"
                className="mt-1 h-8 text-sm"
              />
            )}
          </div>

          {/* Has Limit Toggle */}
          <div className="space-y-1">
            <Label className="text-xs">Is there a limit?</Label>
            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={limit.hasLimit}
                onCheckedChange={(v) =>
                  updateLimit(index, {
                    ...limit,
                    hasLimit: v,
                    limitAmount: v ? limit.limitAmount : null,
                  })
                }
              />
              <span className="text-sm text-slate-600">
                {limit.hasLimit ? "Yes (capped)" : "No (full cover)"}
              </span>
            </div>
          </div>

          {/* Amount + Currency (only if hasLimit) */}
          <div className="space-y-1">
            <Label className="text-xs">
              {limit.hasLimit ? "Limit Amount" : ""}
            </Label>
            {limit.hasLimit ? (
              <div className="flex gap-1">
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={limit.limitAmount ?? ""}
                  onChange={(e) =>
                    updateLimit(index, {
                      ...limit,
                      limitAmount: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  placeholder="e.g. 1000000"
                  className="h-9"
                />
                <Select
                  value={limit.limitCurrency}
                  onValueChange={(v) =>
                    updateLimit(index, { ...limit, limitCurrency: v })
                  }
                >
                  <SelectTrigger className="h-9 w-20">
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
            ) : (
              <p className="pt-2 text-xs text-green-600">Unlimited / Full Cover</p>
            )}
          </div>

          {/* Remove */}
          <div className="flex items-end justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLimit(index)}
              className="h-8 w-8 text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
