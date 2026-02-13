"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil } from "lucide-react";
import {
  COUNTRY_LABELS,
  NACE_INDUSTRIES,
  MONTH_LABELS,
  BENEFIT_CATEGORY_LABELS,
  PLATFORM_TYPE_LABELS,
  FEE_MODEL_LABELS,
  formatCurrency,
} from "@/lib/utils";
import { SurveyData, CountryConfigData } from "@/lib/survey-types";

interface StepReviewSubmitProps {
  data: SurveyData;
  countryConfigs?: CountryConfigData[];
  onEditStep: (step: number) => void;
}

export function StepReviewSubmit({
  data,
  onEditStep,
}: StepReviewSubmitProps) {
  const { step1, step2, step3, step4 } = data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Review & Submit</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review your survey data before submitting. Click Edit to make changes.
        </p>
      </div>

      {/* Industry (company-wide) */}
      <Card>
        <div className="flex items-center justify-between p-4 pb-0">
          <h3 className="text-lg font-semibold text-slate-900">
            Industry
          </h3>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(1)}>
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
        </div>
        <CardContent className="pt-4">
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-slate-500">Industry</dt>
              <dd className="font-medium">
                {NACE_INDUSTRIES[step1.industryCode] || step1.industryCode || "\u2014"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Per-country sections */}
      {step1.countries.map((profile) => {
        const countryCode = profile.country;
        const countryName = COUNTRY_LABELS[countryCode] || countryCode;
        const coreCategories = step2.countriesData[countryCode] || {};
        const flexCategories = step3.countriesData[countryCode] || {};

        return (
          <Card key={countryCode}>
            <div className="flex items-center justify-between p-4 pb-0">
              <h3 className="text-lg font-semibold text-slate-900">
                {countryName}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => onEditStep(1)}>
                <Pencil className="mr-1 h-3 w-3" />
                Edit
              </Button>
            </div>
            <CardContent className="space-y-6 pt-4">
              {/* Country profile */}
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Employee Count Range</dt>
                  <dd className="font-medium">
                    {profile.employeeCountRange || "\u2014"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Average Salary</dt>
                  <dd className="font-medium">
                    {profile.averageSalary
                      ? formatCurrency(
                          profile.averageSalary,
                          profile.averageSalaryCurrency
                        )
                      : "\u2014"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Average Bonus</dt>
                  <dd className="font-medium">
                    {profile.averageBonusPercent != null
                      ? `${profile.averageBonusPercent}%`
                      : "\u2014"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Financial Year End</dt>
                  <dd className="font-medium">
                    {profile.financialYearEndMonth
                      ? MONTH_LABELS[profile.financialYearEndMonth - 1]
                      : "\u2014"}
                  </dd>
                </div>
              </dl>

              {/* Core benefits */}
              {Object.keys(coreCategories).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-700">
                        Core Benefits
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditStep(2)}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    </div>
                    <BenefitsReviewList
                      categories={coreCategories}
                      currency={profile.averageSalaryCurrency}
                    />
                  </div>
                </>
              )}

              {/* Flex/voluntary benefits */}
              {Object.keys(flexCategories).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-700">
                        Flexible & Voluntary Benefits
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditStep(3)}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                    </div>
                    <BenefitsReviewList
                      categories={flexCategories}
                      currency={profile.averageSalaryCurrency}
                      showFlexBadge
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Step 4 Review - Platform & Tech */}
      <Card>
        <div className="flex items-center justify-between p-4 pb-0">
          <h3 className="text-lg font-semibold text-slate-900">
            Platform & Technology
          </h3>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(4)}>
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
        </div>
        <CardContent className="pt-4">
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-slate-500">Uses Benefits Platform</dt>
              <dd className="font-medium">{step4.usesPlatform ? "Yes" : "No"}</dd>
            </div>
            {step4.usesPlatform && (
              <>
                <div>
                  <dt className="text-slate-500">Platform Name</dt>
                  <dd className="font-medium">{step4.platformName || "\u2014"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Platform Type</dt>
                  <dd className="font-medium">
                    {PLATFORM_TYPE_LABELS[step4.platformType] || "\u2014"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Annual Fee</dt>
                  <dd className="font-medium">
                    {step4.annualPlatformFee
                      ? formatCurrency(
                          step4.annualPlatformFee,
                          step4.feeCurrency
                        )
                      : "\u2014"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Fee Model</dt>
                  <dd className="font-medium">
                    {FEE_MODEL_LABELS[step4.feeModel] || "\u2014"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Satisfaction Score</dt>
                  <dd className="font-medium">
                    {step4.platformSatisfactionScore
                      ? `${step4.platformSatisfactionScore}/10`
                      : "\u2014"}
                  </dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-slate-500">Total Reward Platform</dt>
              <dd className="font-medium">
                {step4.usesTotalRewardPlatform
                  ? step4.totalRewardPlatformName || "Yes"
                  : "No"}
              </dd>
            </div>
            {step4.otherHRTechPlatforms && (
              <div className="md:col-span-2">
                <dt className="text-slate-500">Other HR Tech</dt>
                <dd className="font-medium">{step4.otherHRTechPlatforms}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function BenefitsReviewList({
  categories,
  currency,
  showFlexBadge = false,
}: {
  categories: Record<string, { notOffered: boolean; benefits: Array<{
    benefitName: string;
    coverLevel: string;
    employerFunded: boolean;
    annualCostPerEmployee: number | null;
    costCurrency: string;
    isFlexible: boolean;
    provider: string;
  }> }>;
  currency: string;
  showFlexBadge?: boolean;
}) {
  const entries = Object.entries(categories);

  if (entries.length === 0) {
    return <p className="text-sm text-slate-400">No data entered</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map(([category, catData]) => (
        <div key={category}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              {BENEFIT_CATEGORY_LABELS[category] || category}
            </span>
            {catData.notOffered && (
              <Badge variant="secondary">Not offered</Badge>
            )}
          </div>
          {!catData.notOffered && catData.benefits.length > 0 && (
            <div className="mt-2 space-y-2 pl-4">
              {catData.benefits.map((b, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                >
                  <span className="font-medium">{b.benefitName || "Unnamed"}</span>
                  <span className="text-slate-500">{b.coverLevel}</span>
                  {b.provider && (
                    <span className="text-slate-400">{b.provider}</span>
                  )}
                  {b.annualCostPerEmployee != null && (
                    <span className="text-slate-500">
                      {formatCurrency(b.annualCostPerEmployee, b.costCurrency || currency)}
                    </span>
                  )}
                  {b.employerFunded ? (
                    <Badge variant="outline" className="text-xs">Employer</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Employee</Badge>
                  )}
                  {showFlexBadge && b.isFlexible && (
                    <Badge className="text-xs">Flex</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
          {!catData.notOffered && catData.benefits.length === 0 && (
            <p className="mt-1 pl-4 text-xs text-slate-400">No benefits added</p>
          )}
          <Separator className="mt-3" />
        </div>
      ))}
    </div>
  );
}
