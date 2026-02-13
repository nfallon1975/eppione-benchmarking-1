"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORM_TYPE_LABELS, FEE_MODEL_LABELS } from "@/lib/utils";
import { SatisfactionSlider } from "../satisfaction-slider";
import { SurveyStep4 } from "@/lib/survey-types";

const currencies = ["EUR", "GBP", "USD", "AED", "SGD", "AUD"];

interface StepPlatformTechnologyProps {
  data: SurveyStep4;
  onChange: (data: SurveyStep4) => void;
}

export function StepPlatformTechnology({
  data,
  onChange,
}: StepPlatformTechnologyProps) {
  function update(field: keyof SurveyStep4, value: unknown) {
    onChange({ ...data, [field]: value });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Platform & Technology
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Tell us about the benefits technology platforms you use
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-3">
            <Switch
              checked={data.usesPlatform}
              onCheckedChange={(v) => update("usesPlatform", v)}
            />
            <Label className="text-base font-medium">
              We use a benefits platform
            </Label>
          </div>

          {data.usesPlatform && (
            <div className="space-y-6 pl-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input
                    value={data.platformName}
                    onChange={(e) => update("platformName", e.target.value)}
                    placeholder="e.g. Benefex, Darwin, Benify"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Platform Type</Label>
                  <Select
                    value={data.platformType}
                    onValueChange={(v) => update("platformType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLATFORM_TYPE_LABELS).map(
                        ([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Annual Platform Fee</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={data.annualPlatformFee ?? ""}
                      onChange={(e) =>
                        update(
                          "annualPlatformFee",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                    />
                    <Select
                      value={data.feeCurrency}
                      onValueChange={(v) => update("feeCurrency", v)}
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
                  <Label>Fee Model</Label>
                  <Select
                    value={data.feeModel}
                    onValueChange={(v) => update("feeModel", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fee model" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FEE_MODEL_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SatisfactionSlider
                label="Platform Satisfaction (1-10)"
                value={data.platformSatisfactionScore}
                onChange={(v) => update("platformSatisfactionScore", v)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-3">
            <Switch
              checked={data.usesTotalRewardPlatform}
              onCheckedChange={(v) => update("usesTotalRewardPlatform", v)}
            />
            <Label className="text-base font-medium">
              We use a Total Reward Statement platform
            </Label>
          </div>

          {data.usesTotalRewardPlatform && (
            <div className="space-y-2 pl-2">
              <Label>Platform Name</Label>
              <Input
                value={data.totalRewardPlatformName}
                onChange={(e) =>
                  update("totalRewardPlatformName", e.target.value)
                }
                placeholder="e.g. Benify, Reward Gateway"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <Label className="text-base font-medium">
            Other HR Technology Platforms
          </Label>
          <Textarea
            value={data.otherHRTechPlatforms}
            onChange={(e) => update("otherHRTechPlatforms", e.target.value)}
            placeholder="List any other HR tech platforms you use (HRIS, payroll, engagement, etc.)"
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
