"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BRAND } from "./chart-colors";

interface AnimatedStatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  comparison?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
  accentColor?: string;
}

function useCountUp(end: number, duration = 1200, decimals = 0) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current) {
      setValue(end);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !animated.current) {
          animated.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Number((eased * end).toFixed(decimals)));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, decimals]);

  return { value, ref };
}

export function AnimatedStatCard({
  label,
  value: targetValue,
  suffix = "",
  prefix = "",
  decimals = 0,
  comparison,
  trend,
  className,
  accentColor,
}: AnimatedStatCardProps) {
  const { value, ref } = useCountUp(targetValue, 1200, decimals);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div
        className="h-1"
        style={{ backgroundColor: accentColor || BRAND.accent }}
      />
      <CardContent className="pt-5 pb-4" ref={ref}>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p
          className="mt-1 text-3xl font-bold tracking-tight"
          style={{ color: BRAND.primary }}
        >
          {prefix}
          {decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString()}
          {suffix}
        </p>
        {comparison && (
          <p
            className={cn(
              "mt-1.5 text-xs font-medium",
              trend === "up" && "text-emerald-600",
              trend === "down" && "text-red-500",
              (!trend || trend === "neutral") && "text-slate-500"
            )}
          >
            {comparison}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
