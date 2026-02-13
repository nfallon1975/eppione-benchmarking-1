"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { cn, BENEFIT_CATEGORY_LABELS } from "@/lib/utils";
import { CategoryData, BenefitFormData, createEmptyBenefit } from "@/lib/survey-types";
import { BenefitEntryForm } from "./benefit-entry-form";

interface BenefitCategorySectionProps {
  category: string;
  data: CategoryData;
  currency: string;
  showFlexFields?: boolean;
  onChange: (data: CategoryData) => void;
}

export function BenefitCategorySection({
  category,
  data,
  currency,
  showFlexFields = false,
  onChange,
}: BenefitCategorySectionProps) {
  const [expanded, setExpanded] = useState(!data.notOffered && data.benefits.length > 0);
  const label = BENEFIT_CATEGORY_LABELS[category] || category;

  function toggleNotOffered(notOffered: boolean) {
    onChange({ ...data, notOffered });
    if (notOffered) setExpanded(false);
  }

  function addBenefit() {
    onChange({
      ...data,
      benefits: [...data.benefits, createEmptyBenefit(currency)],
    });
    setExpanded(true);
  }

  function updateBenefit(index: number, updated: BenefitFormData) {
    const benefits = [...data.benefits];
    benefits[index] = updated;
    onChange({ ...data, benefits });
  }

  function removeBenefit(index: number) {
    const benefits = data.benefits.filter((_, i) => i !== index);
    onChange({ ...data, benefits });
  }

  return (
    <Card className={cn(data.notOffered && "opacity-60")}>
      <div
        className="flex cursor-pointer items-center justify-between p-4"
        onClick={() => !data.notOffered && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {data.notOffered ? (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          ) : expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-600" />
          )}
          <span className="font-medium text-slate-900">{label}</span>
          {data.benefits.length > 0 && !data.notOffered && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {data.benefits.length} {data.benefits.length === 1 ? "benefit" : "benefits"}
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Switch
            checked={data.notOffered}
            onCheckedChange={toggleNotOffered}
          />
          <Label className="text-sm text-slate-500">Not offered</Label>
        </div>
      </div>

      {expanded && !data.notOffered && (
        <CardContent className="space-y-4 border-t pt-4">
          {data.benefits.map((benefit, index) => (
            <BenefitEntryForm
              key={benefit.tempId}
              benefit={benefit}
              index={index}
              showFlexFields={showFlexFields}
              category={category}
              onUpdate={(updated) => updateBenefit(index, updated)}
              onRemove={() => removeBenefit(index)}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBenefit}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add {label}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
