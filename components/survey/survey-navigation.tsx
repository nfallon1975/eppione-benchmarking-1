"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save, Send } from "lucide-react";

interface SurveyNavigationProps {
  currentStep: number;
  totalSteps: number;
  saving: boolean;
  submitting: boolean;
  lastSavedAt: string | null;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}

export function SurveyNavigation({
  currentStep,
  totalSteps,
  saving,
  submitting,
  lastSavedAt,
  onBack,
  onNext,
  onSaveDraft,
  onSubmit,
}: SurveyNavigationProps) {
  const isFirst = currentStep === 1;
  const isLast = currentStep === totalSteps;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isFirst}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        {lastSavedAt && (
          <span className="text-xs text-slate-400">
            Draft saved at {lastSavedAt}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onSaveDraft}
          disabled={saving}
        >
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Saving..." : "Save Draft"}
        </Button>
        {isLast ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
          >
            <Send className="mr-1 h-4 w-4" />
            {submitting ? "Submitting..." : "Submit Survey"}
          </Button>
        ) : (
          <Button type="button" onClick={onNext}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
