"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { BenefitFormData, HealthLimitFormData } from "@/lib/survey-types";
import { HealthLimitsEditor } from "./health-limits-editor";

interface BenefitEntryFormProps {
  benefit: BenefitFormData;
  index: number;
  showFlexFields?: boolean;
  category?: string;
  onUpdate: (updated: BenefitFormData) => void;
  onRemove: () => void;
}

const currencies = ["EUR", "GBP", "USD", "AED", "SGD", "AUD"];

export function BenefitEntryForm({
  benefit,
  index,
  showFlexFields = false,
  category,
  onUpdate,
  onRemove,
}: BenefitEntryFormProps) {
  function update(field: keyof BenefitFormData, value: unknown) {
    onUpdate({ ...benefit, [field]: value });
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          Benefit #{index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Benefit Name</Label>
          <Input
            value={benefit.benefitName}
            onChange={(e) => update("benefitName", e.target.value)}
            placeholder="e.g. Group Health Insurance"
          />
        </div>
        <div className="space-y-2">
          <Label>Cover Level</Label>
          <Input
            value={benefit.coverLevel}
            onChange={(e) => update("coverLevel", e.target.value)}
            placeholder='e.g. "2x salary", "€50,000"'
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Provider</Label>
          <Input
            value={benefit.provider}
            onChange={(e) => update("provider", e.target.value)}
            placeholder="e.g. Irish Life, Zurich"
          />
        </div>
        <div className="space-y-2">
          <Label>Annual Cost Per Employee</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              step={0.01}
              value={benefit.annualCostPerEmployee ?? ""}
              onChange={(e) =>
                update(
                  "annualCostPerEmployee",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
            />
            <Select
              value={benefit.costCurrency}
              onValueChange={(v) => update("costCurrency", v)}
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
            checked={benefit.employerFunded}
            onCheckedChange={(v) => update("employerFunded", v)}
          />
          <Label>Employer Funded</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={benefit.coversSpouse}
            onCheckedChange={(v) => update("coversSpouse", v)}
          />
          <Label>Covers Spouse</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={benefit.coversDependents}
            onCheckedChange={(v) => update("coversDependents", v)}
          />
          <Label>Covers Dependents</Label>
        </div>
      </div>

      {!benefit.employerFunded && (
        <div className="space-y-2">
          <Label>Employee Contribution (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={benefit.employeeContributionPercent ?? ""}
            onChange={(e) =>
              update(
                "employeeContributionPercent",
                e.target.value ? parseFloat(e.target.value) : null
              )
            }
          />
        </div>
      )}

      {benefit.coversDependents && (
        <div className="space-y-2">
          <Label>Max Dependents</Label>
          <Input
            type="number"
            min={0}
            value={benefit.maxDependents ?? ""}
            onChange={(e) =>
              update(
                "maxDependents",
                e.target.value ? parseInt(e.target.value) : null
              )
            }
          />
        </div>
      )}

      {showFlexFields && (
        <div className="space-y-4 rounded-md border border-dashed border-slate-300 p-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={benefit.isFlexible}
              onCheckedChange={(v) => update("isFlexible", v)}
            />
            <Label>Flexible Benefit (vs Voluntary)</Label>
          </div>
          {benefit.isFlexible && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Flex Fund Amount</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={benefit.flexFundAmount ?? ""}
                    onChange={(e) =>
                      update(
                        "flexFundAmount",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                  />
                  <Select
                    value={benefit.flexFundCurrency}
                    onValueChange={(v) => update("flexFundCurrency", v)}
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
          )}
        </div>
      )}

      {category === "HEALTH" && (
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
                  value={benefit.healthExcess ?? ""}
                  onChange={(e) =>
                    update("healthExcess", e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="e.g. 250"
                />
                <Select
                  value={benefit.healthExcessCurrency}
                  onValueChange={(v) => update("healthExcessCurrency", v)}
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
                value={benefit.healthCopayPercent ?? ""}
                onChange={(e) =>
                  update("healthCopayPercent", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g. 20"
              />
            </div>
          </div>
          <HealthLimitsEditor
            limits={benefit.healthLimits}
            currency={benefit.healthLimitCurrency}
            onUpdate={(limits: HealthLimitFormData[]) =>
              onUpdate({ ...benefit, healthLimits: limits })
            }
          />
        </div>
      )}

      {category === "LIFE" && (
        <div className="space-y-4 rounded-md border border-dashed border-green-200 bg-green-50/50 p-3">
          <p className="text-sm font-medium text-green-800">Life Insurance Details</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Cover Multiple (x salary)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={benefit.lifeCoverMultiple ?? ""}
                onChange={(e) =>
                  update("lifeCoverMultiple", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g. 4"
              />
            </div>
            <div className="space-y-2">
              <Label>Fixed Cover Amount</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={benefit.lifeFixedCoverAmount ?? ""}
                  onChange={(e) =>
                    update("lifeFixedCoverAmount", e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="e.g. 200000"
                />
                <Select
                  value={benefit.lifeCoverAmountCurrency}
                  onValueChange={(v) => update("lifeCoverAmountCurrency", v)}
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
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Free Cover Limit</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={benefit.lifeFreeCoverLimit ?? ""}
                  onChange={(e) =>
                    update("lifeFreeCoverLimit", e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="e.g. 500000"
                />
                <Select
                  value={benefit.lifeCoverAmountCurrency}
                  onValueChange={(v) => update("lifeCoverAmountCurrency", v)}
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
          </div>
        </div>
      )}

      {category === "INCOME_PROTECTION" && (
        <div className="space-y-4 rounded-md border border-dashed border-purple-200 bg-purple-50/50 p-3">
          <p className="text-sm font-medium text-purple-800">Income Protection Details</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Benefit (% of salary)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={benefit.ipBenefitPercent ?? ""}
                onChange={(e) =>
                  update("ipBenefitPercent", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g. 75"
              />
            </div>
            <div className="space-y-2">
              <Label>Waiting Period (weeks)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.ipWaitingPeriodWeeks ?? ""}
                onChange={(e) =>
                  update("ipWaitingPeriodWeeks", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 26"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Benefit Age</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.ipMaxBenefitAge ?? ""}
                onChange={(e) =>
                  update("ipMaxBenefitAge", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 65"
              />
            </div>
          </div>
        </div>
      )}

      {category === "CRITICAL_ILLNESS" && (
        <div className="space-y-4 rounded-md border border-dashed border-orange-200 bg-orange-50/50 p-3">
          <p className="text-sm font-medium text-orange-800">Critical Illness Details</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Cover Multiple (x salary)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={benefit.ciCoverMultiple ?? ""}
                onChange={(e) =>
                  update("ciCoverMultiple", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g. 2"
              />
            </div>
            <div className="space-y-2">
              <Label>Fixed Cover Amount</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={benefit.ciFixedCoverAmount ?? ""}
                  onChange={(e) =>
                    update("ciFixedCoverAmount", e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="e.g. 100000"
                />
                <Select
                  value={benefit.ciCoverAmountCurrency}
                  onValueChange={(v) => update("ciCoverAmountCurrency", v)}
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
          </div>
        </div>
      )}

      {category === "DENTAL" && (
        <div className="space-y-4 rounded-md border border-dashed border-teal-200 bg-teal-50/50 p-3">
          <p className="text-sm font-medium text-teal-800">Dental Details</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Annual Limit</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={benefit.dentalAnnualLimit ?? ""}
                  onChange={(e) =>
                    update("dentalAnnualLimit", e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="e.g. 1000"
                />
                <Select
                  value={benefit.dentalAnnualLimitCurrency}
                  onValueChange={(v) => update("dentalAnnualLimitCurrency", v)}
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
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={benefit.dentalOrthoIncluded ?? false}
                onCheckedChange={(v) => update("dentalOrthoIncluded", v)}
              />
              <Label>Orthodontic Cover Included</Label>
            </div>
          </div>
        </div>
      )}

      {category === "PENSION" && (
        <div className="space-y-4 rounded-md border border-dashed border-indigo-200 bg-indigo-50/50 p-3">
          <p className="text-sm font-medium text-indigo-800">Pension Details</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Employer Contribution (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={benefit.pensionEmployerPct ?? ""}
                onChange={(e) =>
                  update("pensionEmployerPct", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g. 5"
              />
            </div>
            <div className="space-y-2">
              <Label>Employee Contribution (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={benefit.pensionEmployeePct ?? ""}
                onChange={(e) =>
                  update("pensionEmployeePct", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g. 5"
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Renewal Date</Label>
          <Input
            type="date"
            value={benefit.renewalDate}
            onChange={(e) => update("renewalDate", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Benefit Satisfaction (1-10)</Label>
          <Input
            type="number"
            min={1}
            max={10}
            step={1}
            value={benefit.benefitSatisfactionScore ?? ""}
            onChange={(e) =>
              update("benefitSatisfactionScore", e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder="e.g. 7"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Current Broker</Label>
          <Input
            value={benefit.brokerName}
            onChange={(e) => update("brokerName", e.target.value)}
            placeholder="e.g. Mercer, Aon, Willis Towers Watson"
          />
        </div>
        <div className="space-y-2">
          <Label>Broker Satisfaction (1-10)</Label>
          <Input
            type="number"
            min={1}
            max={10}
            step={1}
            value={benefit.brokerSatisfactionScore ?? ""}
            onChange={(e) =>
              update("brokerSatisfactionScore", e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder="e.g. 8"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={benefit.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Additional details"
          rows={2}
        />
      </div>
    </div>
  );
}
