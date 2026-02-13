"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COUNTRY_LABELS } from "@/lib/utils";

interface CountryTabBarProps {
  countries: string[];
  activeCountry: string;
  onCountryChange: (country: string) => void;
}

export function CountryTabBar({
  countries,
  activeCountry,
  onCountryChange,
}: CountryTabBarProps) {
  if (countries.length <= 1) return null;

  return (
    <Tabs value={activeCountry} onValueChange={onCountryChange}>
      <TabsList>
        {countries.map((code) => (
          <TabsTrigger key={code} value={code}>
            {COUNTRY_LABELS[code] || code}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
