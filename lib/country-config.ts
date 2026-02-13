import { prisma } from "@/lib/db";
import { BenefitCategory } from "@prisma/client";
import { getCurrencyForCountry, getCountryName, DEFAULT_BENEFIT_CATEGORIES } from "@/lib/countries";

/**
 * Get or auto-create a CountryConfig for the given country code.
 * If no config exists, creates one with sensible defaults:
 * - All standard benefit categories
 * - Currency from the country→currency map
 * - Empty regulatory notes
 */
export async function getOrCreateCountryConfig(countryCode: string) {
  const existing = await prisma.countryConfig.findUnique({
    where: { countryCode },
  });

  if (existing) return existing;

  // Auto-create with defaults
  const currency = getCurrencyForCountry(countryCode);
  const countryName = getCountryName(countryCode);
  const categories = DEFAULT_BENEFIT_CATEGORIES.filter(
    (c) => c in BenefitCategory
  ) as BenefitCategory[];

  return prisma.countryConfig.create({
    data: {
      countryCode,
      countryName,
      currency,
      availableBenefitCategories: categories,
      regulatoryNotes: null,
    },
  });
}

/**
 * Ensure CountryConfigs exist for multiple country codes at once.
 * Returns all configs (existing + newly created).
 */
export async function ensureCountryConfigs(countryCodes: string[]) {
  const existing = await prisma.countryConfig.findMany({
    where: { countryCode: { in: countryCodes } },
  });

  const existingCodes = new Set(existing.map((c) => c.countryCode));
  const missing = countryCodes.filter((c) => !existingCodes.has(c));

  const created = [];
  for (const code of missing) {
    const currency = getCurrencyForCountry(code);
    const countryName = getCountryName(code);
    const categories = DEFAULT_BENEFIT_CATEGORIES.filter(
      (c) => c in BenefitCategory
    ) as BenefitCategory[];

    const config = await prisma.countryConfig.create({
      data: {
        countryCode: code,
        countryName: countryName,
        currency,
        availableBenefitCategories: categories,
        regulatoryNotes: null,
      },
    });
    created.push(config);
  }

  return [...existing, ...created];
}
