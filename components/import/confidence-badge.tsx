"use client";

import { Badge } from "@/components/ui/badge";

interface ConfidenceBadgeProps {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);

  if (confidence >= 0.85) {
    return <Badge variant="success">{pct}%</Badge>;
  }
  if (confidence >= 0.6) {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
        {pct}%
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">{pct}%</Badge>
  );
}
