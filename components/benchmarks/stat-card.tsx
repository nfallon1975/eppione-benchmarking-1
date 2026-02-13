"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  comparison?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ label, value, comparison, trend, className }: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="pt-6">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        {comparison && (
          <p
            className={cn(
              "mt-1 text-xs",
              trend === "up" && "text-green-600",
              trend === "down" && "text-red-600",
              trend === "neutral" && "text-slate-500",
              !trend && "text-slate-500"
            )}
          >
            {comparison}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
