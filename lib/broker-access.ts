import { prisma } from "@/lib/db";

/**
 * Get the countries a broker is allowed to access for a given client.
 * Returns null if no active relationship exists (caller should 403).
 * Returns the countries array — empty means all countries allowed.
 */
export async function getBrokerCountriesForCompany(
  brokerId: string,
  companyId: string
): Promise<string[] | null> {
  const relationship = await prisma.brokerClientRelationship.findFirst({
    where: {
      brokerId,
      companyId,
      status: "ACTIVE",
    },
    select: { countries: true },
  });

  if (!relationship) return null;
  return relationship.countries;
}

/**
 * Check if a broker has access to a specific country.
 * Empty allowedCountries array means all countries are allowed (backward compat).
 */
export function brokerHasCountryAccess(
  allowedCountries: string[],
  requestedCountry: string
): boolean {
  if (allowedCountries.length === 0) return true;
  return allowedCountries.includes(requestedCountry);
}
