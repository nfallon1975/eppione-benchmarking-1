"use client";

import { CheckCircle, AlertTriangle, Info } from "lucide-react";

interface ConfidenceBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const LEVELS = [
  { min: 0.8, label: "Verified", Icon: CheckCircle, bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  { min: 0.5, label: "Indicative", Icon: AlertTriangle, bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { min: 0, label: "Limited data", Icon: Info, bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
] as const;

export function ConfidenceBadge({ score, showLabel = true, size = "sm" }: ConfidenceBadgeProps) {
  const level = LEVELS.find((l) => score >= l.min) || LEVELS[2];
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${level.bg} ${level.text} ${level.border} ${textSize}`}
      title={`Confidence: ${Math.round(score * 100)}% — ${level.label}`}
    >
      <level.Icon className={iconSize} />
      {showLabel && <span>{level.label}</span>}
    </span>
  );
}

interface SourceAttributionProps {
  sourceDescription?: string | null;
  sources?: string[];
  confidenceScore?: number;
}

export function SourceAttribution({ sourceDescription, sources, confidenceScore }: SourceAttributionProps) {
  if (!sourceDescription && (!sources || sources.length === 0)) return null;

  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
      <Info className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">
        {sourceDescription || (sources && sources.length > 0 ? `Sources: ${sources.join(", ")}` : "")}
      </span>
      {confidenceScore !== undefined && (
        <ConfidenceBadge score={confidenceScore} showLabel={false} size="sm" />
      )}
    </div>
  );
}
