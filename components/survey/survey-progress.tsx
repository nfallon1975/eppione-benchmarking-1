"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { number: 1, label: "Company Profile" },
  { number: 2, label: "Core Benefits" },
  { number: 3, label: "Flex / Voluntary" },
  { number: 4, label: "Platform & Tech" },
  { number: 5, label: "Review & Submit" },
];

interface SurveyProgressProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function SurveyProgress({
  currentStep,
  onStepClick,
}: SurveyProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => (
          <div key={step.number} className="flex items-center">
            <button
              type="button"
              onClick={() => onStepClick(step.number)}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  currentStep === step.number
                    ? "border-eppione-cyan bg-eppione-cyan text-white"
                    : currentStep > step.number
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white text-slate-400"
                )}
              >
                {currentStep > step.number ? "✓" : step.number}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  currentStep === step.number
                    ? "text-slate-900"
                    : "text-slate-500"
                )}
              >
                {step.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 hidden h-0.5 w-12 md:block lg:w-20",
                  currentStep > step.number
                    ? "bg-emerald-500"
                    : "bg-slate-200"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
