"use client";

import { useState } from "react";
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
import { Trash2, ChevronRight, ChevronDown } from "lucide-react";
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
  const [planDesignOpen, setPlanDesignOpen] = useState(false);
  const [maternitySubOpen, setMaternitySubOpen] = useState(false);

  function update(field: keyof BenefitFormData, value: unknown) {
    onUpdate({ ...benefit, [field]: value });
  }

  // Count completed plan design detail fields for the current category
  function countPlanDesignFields(): { filled: number; total: number } {
    // Universal fields
    const universalFields: (keyof BenefitFormData)[] = [
      "mandatoryClassification",
      "sumInsured",
      "coverMultiple",
      "taxTreatment",
      "coverageScope",
      "insuredLives",
      "dependentCoverageType",
      "employeeEligibility",
    ];

    // Health-specific
    const healthFields: (keyof BenefitFormData)[] = [
      "deductibleAmount",
      "coPayPercent",
      "coPayMaxAmount",
      "reimbursementPercent",
      "roomCategory",
      "hospitalLevel",
      "networkType",
      "benefitMaxAnnual",
      "maternityNormalDelivery",
      "maternityCSection",
    ];

    // Dental-specific
    const dentalFields: (keyof BenefitFormData)[] = [
      "dentalAnnualMax",
      "dentalPreventiveCoverage",
      "dentalMajorCoverage",
    ];

    // Vision-specific
    const visionFields: (keyof BenefitFormData)[] = [
      "visionAnnualMax",
      "visionExamCovered",
    ];

    // Income protection
    const ipFields: (keyof BenefitFormData)[] = [
      "eliminationPeriodDays",
      "benefitDurationDays",
    ];

    // Critical illness
    const ciFields: (keyof BenefitFormData)[] = ["waitingPeriodDays"];

    // Risk rider fields (LIFE, INCOME_PROTECTION, CRITICAL_ILLNESS)
    const riderFields: (keyof BenefitFormData)[] = ["isRider"];

    // Bottom fields (all categories)
    const bottomFields: (keyof BenefitFormData)[] = [
      "brokerCommissionPercent",
      "brokerFee",
      "carrierTerminationNoticeDays",
      "inMultinationalPool",
      "policyContractLength",
      "lastRenewalOutcome",
    ];

    let fields = [...universalFields, ...bottomFields];

    if (category === "HEALTH") fields = [...fields, ...healthFields];
    if (category === "DENTAL") fields = [...fields, ...dentalFields];
    if (category === "VISION") fields = [...fields, ...visionFields];
    if (category === "INCOME_PROTECTION") fields = [...fields, ...ipFields];
    if (category === "CRITICAL_ILLNESS") fields = [...fields, ...ciFields];
    if (
      category === "LIFE" ||
      category === "INCOME_PROTECTION" ||
      category === "CRITICAL_ILLNESS"
    )
      fields = [...fields, ...riderFields];

    const total = fields.length;
    const filled = fields.filter((f) => {
      const v = benefit[f];
      return v !== null && v !== undefined && v !== "" && v !== false;
    }).length;

    return { filled, total };
  }

  const { filled: planDesignFilled, total: planDesignTotal } =
    countPlanDesignFields();

  const isRiskCategory =
    category === "LIFE" ||
    category === "INCOME_PROTECTION" ||
    category === "CRITICAL_ILLNESS";

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

      {category === "ANNUAL_LEAVE" && (
        <div className="space-y-4 rounded-md border border-dashed border-emerald-200 bg-emerald-50/50 p-3">
          <p className="text-sm font-medium text-emerald-800">Annual Leave Details</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Standard Entitlement (days/year)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.leaveDaysEntitlement ?? ""}
                onChange={(e) =>
                  update("leaveDaysEntitlement", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 25"
              />
            </div>
            <div className="space-y-2">
              <Label>Carry-Over Days Allowed</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.leaveCarryOverDays ?? ""}
                onChange={(e) =>
                  update("leaveCarryOverDays", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 5"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={benefit.leaveIncludesPublicHolidays ?? false}
                onCheckedChange={(v) => update("leaveIncludesPublicHolidays", v)}
              />
              <Label>Public Holidays Included in Entitlement</Label>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={benefit.leaveIncreasesWithTenure ?? false}
                onCheckedChange={(v) => update("leaveIncreasesWithTenure", v)}
              />
              <Label>Increases with Service</Label>
            </div>
            {benefit.leaveIncreasesWithTenure && (
              <div className="space-y-2">
                <Label>Max Days (after service increases)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={benefit.leaveMaxDays ?? ""}
                  onChange={(e) =>
                    update("leaveMaxDays", e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="e.g. 30"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={benefit.leaveBuySellDays ?? false}
                onCheckedChange={(v) => update("leaveBuySellDays", v)}
              />
              <Label>Buy/Sell Days Available</Label>
            </div>
          </div>
          <p className="text-xs font-medium text-emerald-700 pt-1">Special Leave Features</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={benefit.leaveBirthdayOff ?? false}
                onCheckedChange={(v) => update("leaveBirthdayOff", v)}
              />
              <Label>Birthday Day Off</Label>
            </div>
            <div className="space-y-2">
              <Label>Volunteer/Charity Days (per year)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.leaveVolunteerDays ?? ""}
                onChange={(e) =>
                  update("leaveVolunteerDays", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 2"
              />
            </div>
            <div className="space-y-2">
              <Label>Christmas/Year-End Closure Days</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.leaveChristmasClosureDays ?? ""}
                onChange={(e) =>
                  update("leaveChristmasClosureDays", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 3"
              />
            </div>
          </div>
        </div>
      )}

      {category === "SICK_PAY" && (
        <div className="space-y-4 rounded-md border border-dashed border-amber-200 bg-amber-50/50 p-3">
          <p className="text-sm font-medium text-amber-800">Sick Pay Details</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Pay Duration (weeks)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.sickPayFullPayWeeks ?? ""}
                onChange={(e) =>
                  update("sickPayFullPayWeeks", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 12"
              />
            </div>
            <div className="space-y-2">
              <Label>Partial Pay Duration (weeks)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.sickPayHalfPayWeeks ?? ""}
                onChange={(e) =>
                  update("sickPayHalfPayWeeks", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 12"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Partial Pay Rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={benefit.sickPayPartialPayPercent ?? ""}
                onChange={(e) =>
                  update("sickPayPartialPayPercent", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g. 50"
              />
            </div>
            <div className="space-y-2">
              <Label>Waiting Days Before Sick Pay Starts</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.sickPayWaitingDays ?? ""}
                onChange={(e) =>
                  update("sickPayWaitingDays", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 3"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={benefit.sickPayAboveStatutory ?? false}
                onCheckedChange={(v) => update("sickPayAboveStatutory", v)}
              />
              <Label>Above Statutory Minimum</Label>
            </div>
          </div>
        </div>
      )}

      {category === "MATERNITY_PAY" && (
        <div className="space-y-4 rounded-md border border-dashed border-pink-200 bg-pink-50/50 p-3">
          <p className="text-sm font-medium text-pink-800">Maternity Pay Details</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Full Pay (weeks)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.maternityFullPayWeeks ?? ""}
                onChange={(e) =>
                  update("maternityFullPayWeeks", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 26"
              />
            </div>
            <div className="space-y-2">
              <Label>Partial Pay (weeks)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.maternityPartialPayWeeks ?? ""}
                onChange={(e) =>
                  update("maternityPartialPayWeeks", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 16"
              />
            </div>
            <div className="space-y-2">
              <Label>Partial Pay Rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={benefit.maternityPartialPayPercent ?? ""}
                onChange={(e) =>
                  update("maternityPartialPayPercent", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g. 50"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Total Leave Available (weeks)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.maternityTotalLeaveWeeks ?? ""}
                onChange={(e) =>
                  update("maternityTotalLeaveWeeks", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 52"
              />
            </div>
            <div className="space-y-2">
              <Label>KIT Days (Keeping In Touch)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.maternityKitDays ?? ""}
                onChange={(e) =>
                  update("maternityKitDays", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 10"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={benefit.maternityAboveStatutory ?? false}
                onCheckedChange={(v) => update("maternityAboveStatutory", v)}
              />
              <Label>Above Statutory Minimum</Label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={benefit.maternityGradualReturn ?? false}
              onCheckedChange={(v) => update("maternityGradualReturn", v)}
            />
            <Label>Phased/Gradual Return Option</Label>
          </div>
        </div>
      )}

      {category === "PATERNITY_PAY" && (
        <div className="space-y-4 rounded-md border border-dashed border-cyan-200 bg-cyan-50/50 p-3">
          <p className="text-sm font-medium text-cyan-800">Paternity Pay Details</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Full Pay (weeks)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.paternityFullPayWeeks ?? ""}
                onChange={(e) =>
                  update("paternityFullPayWeeks", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 4"
              />
            </div>
            <div className="space-y-2">
              <Label>Partial Pay (weeks)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.paternityPartialPayWeeks ?? ""}
                onChange={(e) =>
                  update("paternityPartialPayWeeks", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 2"
              />
            </div>
            <div className="space-y-2">
              <Label>Partial Pay Rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={benefit.paternityPartialPayPercent ?? ""}
                onChange={(e) =>
                  update("paternityPartialPayPercent", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g. 50"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Total Leave Available (weeks)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={benefit.paternityTotalLeaveWeeks ?? ""}
                onChange={(e) =>
                  update("paternityTotalLeaveWeeks", e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g. 6"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={benefit.paternityAboveStatutory ?? false}
                onCheckedChange={(v) => update("paternityAboveStatutory", v)}
              />
              <Label>Above Statutory Minimum</Label>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={benefit.paternitySharedParentalLeave ?? false}
                onCheckedChange={(v) => update("paternitySharedParentalLeave", v)}
              />
              <Label>Shared Parental Leave Available</Label>
            </div>
          </div>
        </div>
      )}

      {category === "PENSION" && (
        <div className="space-y-4 rounded-md border border-dashed border-indigo-200 bg-indigo-50/50 p-3">
          <p className="text-sm font-medium text-indigo-800">Pension Details</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Plan Type</Label>
              <Select
                value={benefit.pensionPlanType || ""}
                onValueChange={(v) => update("pensionPlanType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DC">Defined Contribution (DC)</SelectItem>
                  <SelectItem value="DB">Defined Benefit (DB)</SelectItem>
                  <SelectItem value="CASH_BALANCE">Cash Balance</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contribution Formula</Label>
              <Select
                value={benefit.pensionFormulaType || ""}
                onValueChange={(v) => update("pensionFormulaType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select formula type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLAT_RATE">Flat Rate</SelectItem>
                  <SelectItem value="STEP_RATE">Step Rate</SelectItem>
                  <SelectItem value="SALARY_LINKED">Salary Linked</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Employer Contribution (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={benefit.pensionContributionRateEmployer ?? benefit.pensionEmployerPct ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : null;
                  onUpdate({ ...benefit, pensionContributionRateEmployer: val, pensionEmployerPct: val });
                }}
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
                value={benefit.pensionContributionRateEmployee ?? benefit.pensionEmployeePct ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : null;
                  onUpdate({ ...benefit, pensionContributionRateEmployee: val, pensionEmployeePct: val });
                }}
                placeholder="e.g. 5"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Death Benefit Multiple (x salary)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={benefit.pensionDeathBenefitMultiple ?? ""}
                onChange={(e) =>
                  update("pensionDeathBenefitMultiple", e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="e.g. 2"
              />
            </div>
            <div className="space-y-2">
              <Label>Death Benefit Type</Label>
              <Select
                value={benefit.pensionDeathBenefitType || ""}
                onValueChange={(v) => update("pensionDeathBenefitType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED_MULTIPLE">Fixed Multiple of Salary</SelectItem>
                  <SelectItem value="ACCUMULATED_RESERVES">Accumulated Reserves</SelectItem>
                  <SelectItem value="MIXED">Mixed</SelectItem>
                  <SelectItem value="NONE">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Plan Design Details */}
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/50">
        <button
          type="button"
          className="flex w-full items-center justify-between p-3"
          onClick={() => setPlanDesignOpen(!planDesignOpen)}
        >
          <div className="flex items-center gap-2">
            {planDesignOpen ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )}
            <span className="text-sm font-medium text-slate-700">
              Add detailed plan information{" "}
              <span className="font-normal text-slate-500">
                (optional — improves benchmarking accuracy)
              </span>
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {planDesignFilled} of {planDesignTotal} detail fields completed
          </span>
        </button>

        {planDesignOpen && (
          <div className="space-y-6 border-t border-slate-200 p-3">
            {/* === Universal Fields (all categories) === */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                General Plan Design
              </p>

              {/* Mandatory Classification */}
              <div className="space-y-1">
                <Label>Mandatory Classification</Label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: "MANDATORY", label: "Mandatory" },
                      { value: "SUPPLEMENTAL", label: "Supplemental" },
                      { value: "HYBRID", label: "Hybrid" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`rounded border px-3 py-1 text-sm cursor-pointer ${
                        benefit.mandatoryClassification === opt.value
                          ? "bg-cyan-100 border-cyan-500 text-cyan-800"
                          : "border-slate-300 text-slate-600 hover:bg-slate-100"
                      }`}
                      onClick={() =>
                        update(
                          "mandatoryClassification",
                          benefit.mandatoryClassification === opt.value
                            ? null
                            : opt.value
                        )
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sum Insured */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sum Insured</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={benefit.sumInsured ?? ""}
                      onChange={(e) =>
                        update(
                          "sumInsured",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="Amount"
                    />
                    <Select
                      value={benefit.sumInsuredCurrency}
                      onValueChange={(v) => update("sumInsuredCurrency", v)}
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

                {/* Cover Multiple */}
                <div className="space-y-2">
                  <Label>Cover Multiple</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={benefit.coverMultiple ?? ""}
                      onChange={(e) =>
                        update(
                          "coverMultiple",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="e.g. 2"
                      className="w-24"
                    />
                    <Select
                      value={benefit.coverMultipleBase || ""}
                      onValueChange={(v) => update("coverMultipleBase", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Base" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BASIC_SALARY">Basic Salary</SelectItem>
                        <SelectItem value="ANNUAL_CTC">Annual CTC</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-slate-500">
                    e.g. 2x salary, 4x CTC
                  </p>
                </div>
              </div>

              {/* Tax Treatment */}
              <div className="space-y-1">
                <Label>Tax Treatment</Label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: "INCLUDES_TAX", label: "Includes tax" },
                      { value: "EXCLUDES_TAX", label: "Excludes tax" },
                      { value: "TAX_EXEMPT", label: "Tax exempt" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`rounded border px-3 py-1 text-sm cursor-pointer ${
                        benefit.taxTreatment === opt.value
                          ? "bg-cyan-100 border-cyan-500 text-cyan-800"
                          : "border-slate-300 text-slate-600 hover:bg-slate-100"
                      }`}
                      onClick={() =>
                        update(
                          "taxTreatment",
                          benefit.taxTreatment === opt.value ? null : opt.value
                        )
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Coverage Scope */}
                <div className="space-y-2">
                  <Label>Coverage Scope</Label>
                  <Select
                    value={benefit.coverageScope || ""}
                    onValueChange={(v) => update("coverageScope", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOCAL">Local</SelectItem>
                      <SelectItem value="NATIONAL">National</SelectItem>
                      <SelectItem value="REGIONAL">Regional</SelectItem>
                      <SelectItem value="WORLDWIDE">Worldwide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Insured Lives */}
                <div className="space-y-2">
                  <Label>Insured Lives</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={benefit.insuredLives ?? ""}
                    onChange={(e) =>
                      update(
                        "insuredLives",
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    placeholder="Total lives"
                  />
                  <p className="text-xs text-slate-500">
                    Total lives covered including dependents
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Dependent Coverage */}
                <div className="space-y-2">
                  <Label>Dependent Coverage</Label>
                  <Select
                    value={benefit.dependentCoverageType || ""}
                    onValueChange={(v) => update("dependentCoverageType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="SPOUSE_ONLY">Spouse only</SelectItem>
                      <SelectItem value="FAMILY">Family</SelectItem>
                      <SelectItem value="CHILDREN_ONLY">Children only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Employee Eligibility */}
                <div className="space-y-2">
                  <Label>Employee Eligibility</Label>
                  <Select
                    value={benefit.employeeEligibility || ""}
                    onValueChange={(v) => update("employeeEligibility", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select eligibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_EMPLOYEES">All employees</SelectItem>
                      <SelectItem value="MANAGERS_ONLY">Managers only</SelectItem>
                      <SelectItem value="DIRECTORS_ONLY">Directors only</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {benefit.employeeEligibility === "CUSTOM" && (
                <div className="space-y-2">
                  <Label>Eligibility Notes</Label>
                  <Input
                    value={benefit.eligibilityNotes ?? ""}
                    onChange={(e) =>
                      update("eligibilityNotes", e.target.value || null)
                    }
                    placeholder="Describe custom eligibility criteria"
                  />
                </div>
              )}
            </div>

            {/* === Health-specific fields === */}
            {category === "HEALTH" && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Health Plan Design
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Deductible / Excess</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={benefit.deductibleAmount ?? ""}
                        onChange={(e) =>
                          update(
                            "deductibleAmount",
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        placeholder="Amount"
                      />
                      <Select
                        value={benefit.deductibleCurrency}
                        onValueChange={(v) => update("deductibleCurrency", v)}
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
                  <div className="space-y-2">
                    <Label>Co-Pay %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={benefit.coPayPercent ?? ""}
                      onChange={(e) =>
                        update(
                          "coPayPercent",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="e.g. 20"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Co-Pay Maximum Cap</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={benefit.coPayMaxAmount ?? ""}
                      onChange={(e) =>
                        update(
                          "coPayMaxAmount",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="Max co-pay amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reimbursement %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={benefit.reimbursementPercent ?? ""}
                      onChange={(e) =>
                        update(
                          "reimbursementPercent",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="e.g. 80"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Room Category</Label>
                    <Select
                      value={benefit.roomCategory || ""}
                      onValueChange={(v) => update("roomCategory", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRIVATE">Private</SelectItem>
                        <SelectItem value="SEMI_PRIVATE">Semi-Private</SelectItem>
                        <SelectItem value="STANDARD">Standard</SelectItem>
                        <SelectItem value="ANY">Any</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hospital Level</Label>
                    <Select
                      value={benefit.hospitalLevel || ""}
                      onValueChange={(v) => update("hospitalLevel", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXECUTIVE">Executive</SelectItem>
                        <SelectItem value="PRIVATE">Private</SelectItem>
                        <SelectItem value="SEMI_PRIVATE">Semi-Private</SelectItem>
                        <SelectItem value="STANDARD">Standard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Network Type</Label>
                    <Select
                      value={benefit.networkType || ""}
                      onValueChange={(v) => update("networkType", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PANEL">Panel</SelectItem>
                        <SelectItem value="NON_PANEL">Non-panel</SelectItem>
                        <SelectItem value="BOTH">Both</SelectItem>
                        <SelectItem value="OPEN_ACCESS">Open access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Annual Maximum Benefit</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={benefit.benefitMaxAnnual ?? ""}
                      onChange={(e) =>
                        update(
                          "benefitMaxAnnual",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="Amount"
                    />
                    <Select
                      value={benefit.benefitMaxCurrency}
                      onValueChange={(v) => update("benefitMaxCurrency", v)}
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

                {/* Maternity Cover sub-section */}
                <div className="rounded border border-slate-200 bg-white">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 p-2 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => setMaternitySubOpen(!maternitySubOpen)}
                  >
                    {maternitySubOpen ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    Maternity Cover
                  </button>
                  {maternitySubOpen && (
                    <div className="space-y-4 border-t border-slate-200 p-3">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Normal Delivery Cover</Label>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={benefit.maternityNormalDelivery ?? ""}
                            onChange={(e) =>
                              update(
                                "maternityNormalDelivery",
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : null
                              )
                            }
                            placeholder="Amount"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>C-Section Cover</Label>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={benefit.maternityCSection ?? ""}
                            onChange={(e) =>
                              update(
                                "maternityCSection",
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : null
                              )
                            }
                            placeholder="Amount"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Currency</Label>
                          <Select
                            value={benefit.maternityCurrency}
                            onValueChange={(v) =>
                              update("maternityCurrency", v)
                            }
                          >
                            <SelectTrigger>
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
              </div>
            )}

            {/* === Dental-specific fields === */}
            {category === "DENTAL" && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dental Plan Design
                </p>
                <div className="space-y-2">
                  <Label>Annual Maximum</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={benefit.dentalAnnualMax ?? ""}
                    onChange={(e) =>
                      update(
                        "dentalAnnualMax",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    placeholder="Annual max amount"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={benefit.dentalPreventiveCoverage ?? false}
                    onCheckedChange={(v) =>
                      update("dentalPreventiveCoverage", v)
                    }
                  />
                  <Label>Preventive Coverage (cleanings, checkups)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={benefit.dentalMajorCoverage ?? false}
                    onCheckedChange={(v) => update("dentalMajorCoverage", v)}
                  />
                  <Label>Major Treatment (crowns, root canals, ortho)</Label>
                </div>
              </div>
            )}

            {/* === Vision-specific fields === */}
            {category === "VISION" && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Vision Plan Design
                </p>
                <div className="space-y-2">
                  <Label>Annual Maximum</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={benefit.visionAnnualMax ?? ""}
                    onChange={(e) =>
                      update(
                        "visionAnnualMax",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    placeholder="Annual max amount"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={benefit.visionExamCovered ?? false}
                    onCheckedChange={(v) => update("visionExamCovered", v)}
                  />
                  <Label>Eye Exam Covered</Label>
                </div>
              </div>
            )}

            {/* === Income Protection-specific fields === */}
            {category === "INCOME_PROTECTION" && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Income Protection Plan Design
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Elimination / Waiting Period (days)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={benefit.eliminationPeriodDays ?? ""}
                      onChange={(e) =>
                        update(
                          "eliminationPeriodDays",
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="e.g. 90"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Maximum Benefit Duration (days)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={benefit.benefitDurationDays ?? ""}
                      onChange={(e) =>
                        update(
                          "benefitDurationDays",
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="e.g. 730"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* === Critical Illness-specific fields === */}
            {category === "CRITICAL_ILLNESS" && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Critical Illness Plan Design
                </p>
                <div className="space-y-2">
                  <Label>Waiting Period (days)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={benefit.waitingPeriodDays ?? ""}
                    onChange={(e) =>
                      update(
                        "waitingPeriodDays",
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    placeholder="e.g. 30"
                  />
                </div>
              </div>
            )}

            {/* === Risk Rider (LIFE, INCOME_PROTECTION, CRITICAL_ILLNESS) === */}
            {isRiskCategory && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Rider Information
                </p>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={benefit.isRider}
                    onCheckedChange={(v) => update("isRider", v)}
                  />
                  <Label>Is this a rider on another benefit?</Label>
                </div>
                {benefit.isRider && (
                  <div className="space-y-2">
                    <Label>Rider Description</Label>
                    <Input
                      value={benefit.riderDescription ?? ""}
                      onChange={(e) =>
                        update("riderDescription", e.target.value || null)
                      }
                      placeholder="Describe the rider"
                    />
                  </div>
                )}
              </div>
            )}

            {/* === Broker & Carrier Details (all categories) === */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Broker &amp; Carrier Details
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Broker Commission %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={benefit.brokerCommissionPercent ?? ""}
                    onChange={(e) =>
                      update(
                        "brokerCommissionPercent",
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                    placeholder="e.g. 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Broker Fee</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={benefit.brokerFee ?? ""}
                      onChange={(e) =>
                        update(
                          "brokerFee",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="Amount"
                    />
                    <Select
                      value={benefit.brokerFeeCurrency}
                      onValueChange={(v) => update("brokerFeeCurrency", v)}
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
                <div className="space-y-2">
                  <Label>Carrier Termination Notice (days)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={benefit.carrierTerminationNoticeDays ?? ""}
                    onChange={(e) =>
                      update(
                        "carrierTerminationNoticeDays",
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    placeholder="e.g. 90"
                  />
                </div>
              </div>
            </div>

            {/* === Multinational Pooling === */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Multinational Pooling
              </p>
              <div className="flex items-center gap-2">
                <Switch
                  checked={benefit.inMultinationalPool}
                  onCheckedChange={(v) => update("inMultinationalPool", v)}
                />
                <Label>In multinational pool</Label>
              </div>
              {benefit.inMultinationalPool && (
                <div className="space-y-2">
                  <Label>Pool Provider Name</Label>
                  <Input
                    value={benefit.poolProviderName ?? ""}
                    onChange={(e) =>
                      update("poolProviderName", e.target.value || null)
                    }
                    placeholder="e.g. Swiss Re, Zurich"
                  />
                </div>
              )}
            </div>

            {/* === Policy Metadata === */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Policy Metadata
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Contract Length (years)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={benefit.policyContractLength ?? ""}
                    onChange={(e) =>
                      update(
                        "policyContractLength",
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    placeholder="e.g. 3"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Renewal Outcome</Label>
                  <Select
                    value={benefit.lastRenewalOutcome || ""}
                    onValueChange={(v) => update("lastRenewalOutcome", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RENEWED_AS_IS">Renewed as-is</SelectItem>
                      <SelectItem value="RENEWED_WITH_CHANGES">
                        Renewed with changes
                      </SelectItem>
                      <SelectItem value="REMARKET">Remarketed</SelectItem>
                      <SelectItem value="NEW_PLACEMENT">New placement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
