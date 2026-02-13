"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CurrencyToggleProps {
  value: string;
  onChange: (currency: string) => void;
  localCurrency: string;
}

const GLOBAL_CURRENCIES = ["EUR", "GBP", "USD"];

export function CurrencyToggle({ value, onChange, localCurrency }: CurrencyToggleProps) {
  const currencies = [
    localCurrency,
    ...GLOBAL_CURRENCIES.filter((c) => c !== localCurrency),
  ];

  return (
    <div className="inline-flex rounded-md border">
      {currencies.map((currency) => (
        <Button
          key={currency}
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-none first:rounded-l-md last:rounded-r-md px-3",
            value === currency && "bg-slate-100 font-semibold"
          )}
          onClick={() => onChange(currency)}
        >
          {currency}
        </Button>
      ))}
    </div>
  );
}
