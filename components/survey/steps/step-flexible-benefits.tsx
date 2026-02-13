"use client";

import { useState } from "react";
import { BenefitCategory } from "@prisma/client";
import { SurveyStep3, CategoryData, CountryConfigData, CountryProfile, createEmptyCategory } from "@/lib/survey-types";
import { BenefitCategorySection } from "../benefit-category-section";
import { CountryTabBar } from "../country-tab-bar";

interface StepFlexibleBenefitsProps {
  data: SurveyStep3;
  countries: CountryProfile[];
  countryConfigs: CountryConfigData[];
  onChange: (data: SurveyStep3) => void;
}

export function StepFlexibleBenefits({
  data,
  countries,
  countryConfigs,
  onChange,
}: StepFlexibleBenefitsProps) {
  const countryCodes = countries.map((c) => c.country);
  const [activeCountry, setActiveCountry] = useState(countryCodes[0] || "");

  const currentCountry = countryCodes.includes(activeCountry)
    ? activeCountry
    : countryCodes[0] || "";

  const config = countryConfigs.find((c) => c.countryCode === currentCountry);
  const categories = config?.availableBenefitCategories || [];
  const countryProfile = countries.find((c) => c.country === currentCountry);
  const currency = countryProfile?.averageSalaryCurrency || "EUR";

  const countryCategories = data.countriesData[currentCountry] || {};

  function updateCategory(category: BenefitCategory, catData: CategoryData) {
    onChange({
      ...data,
      countriesData: {
        ...data.countriesData,
        [currentCountry]: {
          ...countryCategories,
          [category]: catData,
        },
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Flexible & Voluntary Benefits
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter benefits offered through a flex plan or on a voluntary
          (employee-paid) basis. Use the toggle to distinguish flexible from
          voluntary benefits.
        </p>
      </div>

      <CountryTabBar
        countries={countryCodes}
        activeCountry={currentCountry}
        onCountryChange={setActiveCountry}
      />

      {categories.length === 0 && (
        <p className="text-sm text-slate-400">
          Please select a country in Step 1 to see available benefit categories.
        </p>
      )}

      <div className="space-y-4">
        {categories.map((category) => (
          <BenefitCategorySection
            key={`${currentCountry}-${category}`}
            category={category}
            data={countryCategories[category] || createEmptyCategory()}
            currency={currency}
            showFlexFields
            onChange={(catData) => updateCategory(category, catData)}
          />
        ))}
      </div>
    </div>
  );
}
