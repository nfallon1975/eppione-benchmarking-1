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
