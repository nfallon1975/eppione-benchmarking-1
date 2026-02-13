"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRY_LABELS } from "@/lib/utils";

interface CountrySelectorProps {
  value: string;
  onChange: (value: string) => void;
  countries: string[];
}

export function CountrySelector({ value, onChange, countries }: CountrySelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select country" />
      </SelectTrigger>
      <SelectContent>
        {countries.map((code) => (
          <SelectItem key={code} value={code}>
            {COUNTRY_LABELS[code] || code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
