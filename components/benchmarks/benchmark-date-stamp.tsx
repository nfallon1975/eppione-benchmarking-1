"use client";

import { Badge } from "@/components/ui/badge";

interface BenchmarkDateStampProps {
  dataAsOf: string;
  totalCompanies: number;
}

export function BenchmarkDateStamp({ dataAsOf, totalCompanies }: BenchmarkDateStampProps) {
  const date = new Date(dataAsOf);
  const formatted = date.toLocaleDateString("en-IE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span>Data as of {formatted}</span>
      <Badge variant="secondary">{totalCompanies} companies</Badge>
    </div>
  );
}
