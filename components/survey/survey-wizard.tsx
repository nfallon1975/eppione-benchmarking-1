"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SurveyProgress } from "./survey-progress";
import { SurveyNavigation } from "./survey-navigation";
import { StepCompanyProfile } from "./steps/step-company-profile";
import { StepCoreBenefits } from "./steps/step-core-benefits";
import { StepFlexibleBenefits } from "./steps/step-flexible-benefits";
import { StepPlatformTechnology } from "./steps/step-platform-technology";
import { StepReviewSubmit } from "./steps/step-review-submit";
import {
  SurveyData,
  CountryConfigData,
  createEmptySurveyData,
  createEmptyCategory,
} from "@/lib/survey-types";
import { BENEFIT_CATEGORY_LABELS, COUNTRY_LABELS } from "@/lib/utils";

const TOTAL_STEPS = 5;
const AUTO_SAVE_INTERVAL = 60000;

// Type guard for old single-country draft format
interface OldSurveyStep1 {
  country: string;
  industrySector: string;
  industryCode: string;
  employeeCountRange: string;
  averageSalary: number | null;
  averageSalaryCurrency: string;
  averageBonusPercent: number | null;
  financialYearEndMonth: number | null;
}

interface OldSurveyStep2 {
  categories: Record<string, unknown>;
}

interface OldSurveyStep3 {
  categories: Record<string, unknown>;
}

interface OldSurveyData {
  step1: OldSurveyStep1;
  step2: OldSurveyStep2;
  step3: OldSurveyStep3;
  step4: SurveyData["step4"];
}

function isOldFormat(data: unknown): data is OldSurveyData {
  return (
    typeof data === "object" &&
    data !== null &&
    "step1" in data &&
    typeof (data as OldSurveyData).step1 === "object" &&
    "country" in (data as OldSurveyData).step1 &&
    !("countries" in (data as OldSurveyData).step1)
  );
}

function migrateOldData(old: OldSurveyData): SurveyData {
  const country = old.step1.country;
  return {
    step1: {
      industrySector: old.step1.industrySector,
      industryCode: old.step1.industryCode,
      countries: country
        ? [
            {
              country,
              employeeCountRange: old.step1.employeeCountRange,
              averageSalary: old.step1.averageSalary,
              averageSalaryCurrency: old.step1.averageSalaryCurrency,
              averageBonusPercent: old.step1.averageBonusPercent,
              financialYearEndMonth: old.step1.financialYearEndMonth,
            },
          ]
        : [],
      benefitBudget: null,
      benefitBudgetCurrency: "EUR",
      averageWorkforceAge: null,
      desiredNewBenefits: "",
    },
    step2: {
      countriesData: country
        ? { [country]: old.step2.categories as SurveyData["step2"]["countriesData"][string] }
        : {},
    },
    step3: {
      countriesData: country
        ? { [country]: old.step3.categories as SurveyData["step3"]["countriesData"][string] }
        : {},
    },
    step4: old.step4,
  };
}

export function SurveyWizard() {
  const [surveyData, setSurveyData] = useState<SurveyData>(
    createEmptySurveyData()
  );
  const [countryConfigs, setCountryConfigs] = useState<CountryConfigData[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const lastSavedDataRef = useRef<string>("");

  // Load survey data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/survey");
        if (!res.ok) throw new Error("Failed to load survey");
        const json = await res.json();

        setCountryConfigs(json.countryConfigs || []);

        if (json.draft) {
          let draftData = json.draft.data as SurveyData;

          // Migrate old single-country format
          if (isOldFormat(json.draft.data)) {
            draftData = migrateOldData(json.draft.data as OldSurveyData);
          }

          setSurveyData(draftData);
          setCurrentStep(json.draft.currentStep || 1);
          if (json.draft.status === "SUBMITTED") {
            setSubmitted(true);
          }
          lastSavedDataRef.current = JSON.stringify(draftData);
        } else if (json.initialData) {
          let initialData = json.initialData as SurveyData;

          if (isOldFormat(json.initialData)) {
            initialData = migrateOldData(json.initialData as OldSurveyData);
          }

          setSurveyData(initialData);
          lastSavedDataRef.current = JSON.stringify(initialData);
        }
      } catch (err) {
        console.error("Failed to load survey:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Save draft function
  const saveDraft = useCallback(
    async (step?: number) => {
      const currentData = JSON.stringify(surveyData);
      if (currentData === lastSavedDataRef.current) return;

      setSaving(true);
      try {
        const res = await fetch("/api/survey", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentStep: step ?? currentStep,
            data: surveyData,
          }),
        });
        if (res.ok) {
          lastSavedDataRef.current = currentData;
          setLastSavedAt(
            new Date().toLocaleTimeString("en-IE", {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }
      } catch (err) {
        console.error("Failed to save draft:", err);
      } finally {
        setSaving(false);
      }
    },
    [surveyData, currentStep]
  );

  // Auto-save interval
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft();
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [saveDraft]);

  // Save on step change
  function goToStep(step: number) {
    if (step < 1 || step > TOTAL_STEPS) return;
    setCurrentStep(step);
    saveDraft(step);
  }

  // Initialize benefit categories for a country
  function initCountryCategories(country: string) {
    const config = countryConfigs.find((c) => c.countryCode === country);
    if (!config) return;

    setSurveyData((prev) => {
      const newStep2 = { ...prev.step2.countriesData };
      const newStep3 = { ...prev.step3.countriesData };

      if (!newStep2[country]) {
        newStep2[country] = {};
      }
      if (!newStep3[country]) {
        newStep3[country] = {};
      }

      for (const cat of config.availableBenefitCategories) {
        if (!newStep2[country]![cat]) {
          newStep2[country]![cat] = createEmptyCategory();
        }
        if (!newStep3[country]![cat]) {
          newStep3[country]![cat] = createEmptyCategory();
        }
      }

      return {
        ...prev,
        step2: { countriesData: newStep2 },
        step3: { countriesData: newStep3 },
      };
    });
  }

  function handleCountryAdd(country: string) {
    initCountryCategories(country);
  }

  function handleCountryRemove(country: string) {
    setSurveyData((prev) => {
      const newStep2 = { ...prev.step2.countriesData };
      const newStep3 = { ...prev.step3.countriesData };
      delete newStep2[country];
      delete newStep3[country];
      return {
        ...prev,
        step2: { countriesData: newStep2 },
        step3: { countriesData: newStep3 },
      };
    });
  }

  function handleCountrySwitch(oldCountry: string, newCountry: string) {
    setSurveyData((prev) => {
      const newStep2 = { ...prev.step2.countriesData };
      const newStep3 = { ...prev.step3.countriesData };

      // Migrate data from old country key to new
      if (newStep2[oldCountry]) {
        newStep2[newCountry] = newStep2[oldCountry];
        delete newStep2[oldCountry];
      }
      if (newStep3[oldCountry]) {
        newStep3[newCountry] = newStep3[oldCountry];
        delete newStep3[oldCountry];
      }

      return {
        ...prev,
        step2: { countriesData: newStep2 },
        step3: { countriesData: newStep3 },
      };
    });

    // Initialize any missing categories for the new country's config
    initCountryCategories(newCountry);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/survey/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(surveyData),
      });

      if (res.ok) {
        setSubmitted(true);
        lastSavedDataRef.current = JSON.stringify(surveyData);
      } else {
        const err = await res.json();
        console.error("Submit error:", err);

        if (err.details && Array.isArray(err.details)) {
          const messages = err.details.map((issue: { path: (string | number)[]; message: string }) => {
            const fieldPath = formatValidationPath(issue.path);
            return `${fieldPath}: ${issue.message}`;
          });
          alert(
            `Please fix the following fields:\n\n${messages.join("\n")}`
          );
        } else {
          alert(
            err.error || "Submission failed. Please try again."
          );
        }
      }
    } catch (err) {
      console.error("Failed to submit survey:", err);
      alert("An error occurred while submitting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function formatValidationPath(path: (string | number)[]): string {
    const stepLabels: Record<string, string> = {
      step1: "Company Profile",
      step2: "Core Benefits",
      step3: "Flexible Benefits",
      step4: "Platform & Technology",
    };

    const fieldLabels: Record<string, string> = {
      industrySector: "Industry Sector",
      industryCode: "Industry Code",
      countries: "Countries",
      country: "Country",
      employeeCountRange: "Employee Count Range",
      averageSalary: "Average Salary",
      averageSalaryCurrency: "Salary Currency",
      averageBonusPercent: "Average Bonus %",
      financialYearEndMonth: "Financial Year End Month",
      countriesData: "Benefits Data",
      benefitName: "Benefit Name",
      coverLevel: "Cover Level",
      employerFunded: "Employer Funded",
      annualCostPerEmployee: "Annual Cost Per Employee",
      costCurrency: "Cost Currency",
      provider: "Provider",
      coversSpouse: "Covers Spouse",
      coversDependents: "Covers Dependents",
      maxDependents: "Max Dependents",
      isFlexible: "Flexible Benefit",
      usesPlatform: "Uses Platform",
      platformName: "Platform Name",
      platformType: "Platform Type",
      annualPlatformFee: "Annual Platform Fee",
      feeCurrency: "Fee Currency",
      feeModel: "Fee Model",
      platformSatisfactionScore: "Satisfaction Score",
      benefits: "Benefits",
      notOffered: "Not Offered",
      healthExcess: "Health Excess",
      healthCopayPercent: "Health Co-Pay %",
      healthInpatientLimit: "Health Inpatient Limit",
      healthOutpatientLimit: "Health Outpatient Limit",
    };

    const parts: string[] = [];
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      if (typeof segment === "string") {
        if (stepLabels[segment]) {
          parts.push(stepLabels[segment]);
        } else if (fieldLabels[segment]) {
          parts.push(fieldLabels[segment]);
        } else if (BENEFIT_CATEGORY_LABELS[segment]) {
          parts.push(BENEFIT_CATEGORY_LABELS[segment]);
        } else if (COUNTRY_LABELS[segment]) {
          parts.push(COUNTRY_LABELS[segment]);
        } else {
          parts.push(segment);
        }
      } else if (typeof segment === "number") {
        // Array index — label as item number (1-based)
        const prevSegment = i > 0 ? path[i - 1] : null;
        if (prevSegment === "benefits") {
          parts.push(`Benefit #${segment + 1}`);
        } else if (prevSegment === "countries") {
          parts.push(`Country #${segment + 1}`);
        } else {
          parts.push(`#${segment + 1}`);
        }
      }
    }

    return parts.join(" > ");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Loading survey...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-full bg-emerald-100 p-4">
          <svg
            className="h-8 w-8 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">
          Survey Submitted
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Thank you! Your benefits data has been submitted successfully.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setCurrentStep(1);
          }}
          className="mt-6 text-sm font-medium text-eppione-cyan hover:underline"
        >
          Edit and resubmit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-6 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Benefits Survey</h1>
          <p className="mt-1 text-slate-500">
            Complete this survey to benchmark your employee benefits.{" "}
            Or{" "}
            <a href="/survey/upload" className="text-eppione-cyan underline hover:text-eppione-cyan/80">
              upload from a spreadsheet
            </a>
          </p>
        </div>

        <SurveyProgress currentStep={currentStep} onStepClick={goToStep} />

        {currentStep === 1 && (
          <StepCompanyProfile
            data={surveyData.step1}
            countryConfigs={countryConfigs}
            onChange={(step1) => setSurveyData((prev) => ({ ...prev, step1 }))}
            onCountryAdd={handleCountryAdd}
            onCountryRemove={handleCountryRemove}
            onCountrySwitch={handleCountrySwitch}
          />
        )}

        {currentStep === 2 && (
          <StepCoreBenefits
            data={surveyData.step2}
            countries={surveyData.step1.countries}
            countryConfigs={countryConfigs}
            onChange={(step2) => setSurveyData((prev) => ({ ...prev, step2 }))}
          />
        )}

        {currentStep === 3 && (
          <StepFlexibleBenefits
            data={surveyData.step3}
            countries={surveyData.step1.countries}
            countryConfigs={countryConfigs}
            onChange={(step3) => setSurveyData((prev) => ({ ...prev, step3 }))}
          />
        )}

        {currentStep === 4 && (
          <StepPlatformTechnology
            data={surveyData.step4}
            onChange={(step4) => setSurveyData((prev) => ({ ...prev, step4 }))}
          />
        )}

        {currentStep === 5 && (
          <StepReviewSubmit
            data={surveyData}
            countryConfigs={countryConfigs}
            onEditStep={goToStep}
          />
        )}
      </div>

      <SurveyNavigation
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        saving={saving}
        submitting={submitting}
        lastSavedAt={lastSavedAt}
        onBack={() => goToStep(currentStep - 1)}
        onNext={() => goToStep(currentStep + 1)}
        onSaveDraft={() => saveDraft()}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
