"use client";

import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" }> = {
  UPLOADED: { label: "Uploaded", variant: "secondary" },
  PARSED: { label: "Ready to Map", variant: "outline" },
  MAPPING: { label: "AI Mapping...", variant: "default" },
  REVIEW: { label: "Awaiting Review", variant: "default" },
  APPROVED: { label: "Approved", variant: "success" },
  IMPORTING: { label: "Importing...", variant: "default" },
  COMPLETED: { label: "Completed", variant: "success" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export function ImportStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
