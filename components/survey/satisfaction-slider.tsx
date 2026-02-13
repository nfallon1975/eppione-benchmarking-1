"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface SatisfactionSliderProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}

export function SatisfactionSlider({
  label,
  value,
  onChange,
}: SatisfactionSliderProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors",
              value === n
                ? "border-eppione-cyan bg-eppione-cyan text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>Not satisfied</span>
        <span>Very satisfied</span>
      </div>
    </div>
  );
}
