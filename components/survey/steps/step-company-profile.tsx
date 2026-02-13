"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MONTH_LABELS,
  EMPLOYEE_COUNT_RANGES,
} from "@/lib/utils";
import { getCountryName, getCurrencyForCountry } from "@/lib/countries";
import { CountryPicker } from "@/components/ui/country-picker";
import { NaceIndustrySelector } from "../nace-industry-selector";
import { SurveyStep1, CountryConfigData, CountryProfile } from "@/lib/survey-types";
import { Plus, X } from "lucide-react";

const currencies = [
  "EUR", "GBP", "USD", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "CNY",
  "INR", "BRL", "ZAR", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF",
  "RON", "BGN", "HRK", "ISK", "TRY", "MXN", "ARS", "CLP", "COP", "PEN",
  "KRW", "TWD", "HKD", "THB", "MYR", "PHP", "IDR", "VND", "KES", "NGN",
  "EGP", "SAR", "QAR", "KWD", "BHD", "OMR", "JOD", "ILS", "RUB", "UAH",
];

interface StepCompanyProfileProps {
  data: SurveyStep1;
  countryConfigs: CountryConfigData[];
  onChange: (data: SurveyStep1) => void;
  onCountryAdd: (country: string) => void;
  onCountryRemove: (country: string) => void;
  onCountrySwitch: (oldCountry: string, newCountry: string) => void;
}

export function StepCompanyProfile({
  data,
  countryConfigs,
  onChange,
  onCountryAdd,
  onCountryRemove,
  onCountrySwitch,
}: StepCompanyProfileProps) {
  const selectedCountries = data.countries.map((c) => c.country);

  function updateIndustry(field: "industrySector" | "industryCode", value: string) {
    onChange({ ...data, [field]: value });
  }

  function updateCountryProfile(index: number, updates: Partial<CountryProfile>) {
    const newCountries = [...data.countries];
    newCountries[index] = { ...newCountries[index], ...updates };
    onChange({ ...data, countries: newCountries });
  }

  function handleCountryChange(index: number, newCountry: string) {
    if (!newCountry) return;
    const oldCountry = data.countries[index].country;
    const config = countryConfigs.find((c) => c.countryCode === newCountry);
    const currency = config?.currency || getCurrencyForCountry(newCountry);

    // Update the profile with the new country and default currency
    const newCountries = [...data.countries];
    newCountries[index] = {
      ...newCountries[index],
      country: newCountry,
      averageSalaryCurrency: currency,
    };
    onChange({ ...data, countries: newCountries });

    // Notify parent to migrate benefit data
    if (oldCountry) {
      onCountrySwitch(oldCountry, newCountry);
    } else {
      onCountryAdd(newCountry);
    }
  }

  function handleAddCountry() {
    const newProfile: CountryProfile = {
      country: "",
      employeeCountRange: "",
      averageSalary: null,
      averageSalaryCurrency: "EUR",
      averageBonusPercent: null,
      financialYearEndMonth: null,
    };
    onChange({ ...data, countries: [...data.countries, newProfile] });
  }

  function handleRemoveCountry(index: number) {
    const country = data.countries[index].country;
    const newCountries = data.countries.filter((_, i) => i !== index);
    onChange({ ...data, countries: newCountries });
    onCountryRemove(country);
  }

  // Check if there's already a blank country being added
  const hasBlankCountry = data.countries.some((c) => !c.country);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Company Profile</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tell us about your company and workforce across each country
        </p>
      </div>

      {/* Company-wide: Industry */}
      <Card>
        <CardContent className="space-y-6 pt-6">
          <NaceIndustrySelector
            sector={data.industrySector}
            industryCode={data.industryCode}
            onSectorChange={(v) => updateIndustry("industrySector", v)}
            onIndustryCodeChange={(v) => updateIndustry("industryCode", v)}
          />
        </CardContent>
      </Card>

      {/* Per-country cards */}
      {data.countries.map((profile, index) => (
        <Card key={profile.country || index}>
          <div className="flex items-center justify-between p-4 pb-0">
            <h3 className="text-lg font-semibold text-slate-900">
              {profile.country ? getCountryName(profile.country) : "New Country"} Profile
            </h3>
            {data.countries.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveCountry(index)}
              >
                <X className="mr-1 h-3 w-3" />
                Remove
              </Button>
            )}
          </div>
          <CardContent className="space-y-6 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Country</Label>
                <CountryPicker
                  value={profile.country}
                  onChange={(v) => handleCountryChange(index, v)}
                  disabled={selectedCountries.filter((c) => c !== profile.country)}
                  placeholder="Search for a country..."
                />
              </div>
              <div className="space-y-2">
                <Label>Employee Count Range</Label>
                <Select
                  value={profile.employeeCountRange}
                  onValueChange={(v) =>
                    updateCountryProfile(index, { employeeCountRange: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_COUNT_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range} employees
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Average Salary</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    value={profile.averageSalary ?? ""}
                    onChange={(e) =>
                      updateCountryProfile(index, {
                        averageSalary: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      })
                    }
                    placeholder="e.g. 65000"
                  />
                  <Select
                    value={profile.averageSalaryCurrency}
                    onValueChange={(v) =>
                      updateCountryProfile(index, { averageSalaryCurrency: v })
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Average Bonus (% of salary)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={profile.averageBonusPercent ?? ""}
                  onChange={(e) =>
                    updateCountryProfile(index, {
                      averageBonusPercent: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  placeholder="e.g. 10"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Financial Year End Month</Label>
                <Select
                  value={
                    profile.financialYearEndMonth
                      ? profile.financialYearEndMonth.toString()
                      : ""
                  }
                  onValueChange={(v) =>
                    updateCountryProfile(index, {
                      financialYearEndMonth: v ? parseInt(v) : null,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_LABELS.map((month, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Company-wide: Budget, Age, Desired Benefits */}
      <Card>
        <div className="p-4 pb-0">
          <h3 className="text-lg font-semibold text-slate-900">
            Company-Wide Benefits Info
          </h3>
        </div>
        <CardContent className="space-y-6 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Total Benefits Budget</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={data.benefitBudget ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      benefitBudget: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  placeholder="e.g. 500000"
                />
                <Select
                  value={data.benefitBudgetCurrency}
                  onValueChange={(v) =>
                    onChange({ ...data, benefitBudgetCurrency: v })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Average Workforce Age</Label>
              <Input
                type="number"
                min={16}
                max={100}
                step={0.1}
                value={data.averageWorkforceAge ?? ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    averageWorkforceAge: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                placeholder="e.g. 35"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Desired New Benefits</Label>
            <Textarea
              value={data.desiredNewBenefits}
              onChange={(e) =>
                onChange({ ...data, desiredNewBenefits: e.target.value })
              }
              placeholder="What new benefits would you like to offer? e.g. Mental health support, fertility benefits..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Country button */}
      {!hasBlankCountry && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleAddCountry}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Country
        </Button>
      )}

      {data.countries.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-slate-500 mb-4">
              Add at least one country to continue
            </p>
            <Button variant="outline" onClick={handleAddCountry}>
              <Plus className="mr-2 h-4 w-4" />
              Add Country
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
