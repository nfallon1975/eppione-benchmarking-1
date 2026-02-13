import { prisma } from "@/lib/db";
import type { BenefitCategory } from "@prisma/client";

export interface ComplianceResult {
  requirementId: string;
  benefitCategory: string;
  requirementType: string;
  description: string;
  status: "COMPLIANT" | "NON_COMPLIANT" | "PARTIALLY_COMPLIANT" | "NOT_APPLICABLE" | "UNKNOWN";
  gap: string | null;
  recommendation: string | null;
  benefitEntryId: string | null;
  legalReference: string | null;
  minimumLevel: string | null;
  penaltyForNonCompliance: string | null;
}

export interface StatutoryLimitResult {
  limitId: string;
  limitType: string;
  benefitCategory: string | null;
  description: string;
  limitValue: string;
  currency: string | null;
  taxYear: string;
  legalReference: string | null;
  status: "WITHIN_LIMIT" | "EXCEEDS_LIMIT" | "NO_DATA" | "NOT_APPLICABLE";
  currentValue: string | null;
  gap: string | null;
}

export interface ComplianceCheckOutput {
  requirements: ComplianceResult[];
  limits: StatutoryLimitResult[];
  summary: {
    totalRequirements: number;
    compliant: number;
    nonCompliant: number;
    partiallyCompliant: number;
    notApplicable: number;
    mandatoryIssues: number;
    totalLimits: number;
    limitsWithinRange: number;
    limitsExceeded: number;
    limitsNoData: number;
  };
  checkedAt: string;
}

/**
 * Enhanced compliance check engine.
 * Checks company benefit entries against country requirements AND statutory limits.
 */
export async function runComplianceCheck(
  companyId: string,
  country: string
): Promise<ComplianceResult[]> {
  const output = await runFullComplianceCheck(companyId, country);
  return output.requirements;
}

/**
 * Full compliance check returning requirements + statutory limits + summary.
 */
export async function runFullComplianceCheck(
  companyId: string,
  country: string
): Promise<ComplianceCheckOutput> {
  // 1. Fetch company's BenefitEntries for that country
  const benefitEntries = await prisma.benefitEntry.findMany({
    where: {
      companyId,
      OR: [
        { country },
        { country: "" }, // legacy data
      ],
    },
    include: {
      company: { select: { country: true } },
    },
  });

  // Filter to only entries for this country (including legacy fallback)
  const countryEntries = benefitEntries.filter((e) => {
    const entryCountry = e.country || e.company.country;
    return entryCountry === country;
  });

  // Build a map of benefit entries by category
  const entriesByCategory = new Map<string, typeof countryEntries>();
  for (const entry of countryEntries) {
    const cat = entry.benefitCategory;
    if (!entriesByCategory.has(cat)) {
      entriesByCategory.set(cat, []);
    }
    entriesByCategory.get(cat)!.push(entry);
  }

  // 2. Fetch all current CountryBenefitRequirements
  const now = new Date();
  const requirements = await prisma.countryBenefitRequirement.findMany({
    where: {
      country,
      effectiveFrom: { lte: now },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gt: now } },
      ],
    },
  });

  // 3. Fetch statutory limits for current tax year
  const currentTaxYear = getCurrentTaxYear(country);
  const limits = await prisma.countryStatutoryLimit.findMany({
    where: {
      country,
      taxYear: currentTaxYear,
    },
  });

  // 4. Check each requirement
  const requirementResults: ComplianceResult[] = [];

  for (const req of requirements) {
    const matchingEntries = entriesByCategory.get(req.benefitCategory) || [];
    const result = checkRequirement(req, matchingEntries);
    requirementResults.push(result);
  }

  // 5. Check statutory limits
  const limitResults: StatutoryLimitResult[] = [];

  for (const limit of limits) {
    const matchingEntries = limit.benefitCategory
      ? entriesByCategory.get(limit.benefitCategory) || []
      : countryEntries;
    const result = checkStatutoryLimit(limit, matchingEntries);
    limitResults.push(result);
  }

  // 6. Upsert ComplianceCheckResult records for requirements
  for (const result of requirementResults) {
    const existing = await prisma.complianceCheckResult.findFirst({
      where: { companyId, country, requirementId: result.requirementId },
      select: { id: true },
    });

    if (existing) {
      await prisma.complianceCheckResult.update({
        where: { id: existing.id },
        data: {
          benefitEntryId: result.benefitEntryId,
          status: result.status,
          gap: result.gap,
          recommendation: result.recommendation,
          checkedAt: new Date(),
        },
      });
    } else {
      await prisma.complianceCheckResult.create({
        data: {
          companyId,
          country,
          benefitEntryId: result.benefitEntryId,
          requirementId: result.requirementId,
          status: result.status,
          gap: result.gap,
          recommendation: result.recommendation,
          checkedAt: new Date(),
        },
      });
    }
  }

  // 7. Build summary
  const summary = {
    totalRequirements: requirementResults.length,
    compliant: requirementResults.filter((r) => r.status === "COMPLIANT").length,
    nonCompliant: requirementResults.filter((r) => r.status === "NON_COMPLIANT").length,
    partiallyCompliant: requirementResults.filter((r) => r.status === "PARTIALLY_COMPLIANT").length,
    notApplicable: requirementResults.filter((r) => r.status === "NOT_APPLICABLE").length,
    mandatoryIssues: requirementResults.filter(
      (r) =>
        (r.requirementType === "MANDATORY" || r.requirementType === "QUASI_MANDATORY") &&
        (r.status === "NON_COMPLIANT" || r.status === "PARTIALLY_COMPLIANT")
    ).length,
    totalLimits: limitResults.length,
    limitsWithinRange: limitResults.filter((r) => r.status === "WITHIN_LIMIT").length,
    limitsExceeded: limitResults.filter((r) => r.status === "EXCEEDS_LIMIT").length,
    limitsNoData: limitResults.filter((r) => r.status === "NO_DATA").length,
  };

  return {
    requirements: requirementResults,
    limits: limitResults,
    summary,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Check a single requirement against matching benefit entries.
 */
function checkRequirement(
  req: {
    id: string;
    benefitCategory: BenefitCategory;
    requirementType: string;
    description: string;
    minimumLevel: string | null;
    legalReference: string | null;
    penaltyForNonCompliance: string | null;
  },
  matchingEntries: Array<{
    id: string;
    coverLevel: string;
    annualCostPerEmployee: number | null;
    employerFunded: boolean;
    employeeContributionPercent: number | null;
  }>
): ComplianceResult {
  let status: ComplianceResult["status"];
  let gap: string | null = null;
  let recommendation: string | null = null;
  let benefitEntryId: string | null = null;

  if (matchingEntries.length === 0) {
    // No matching benefit entry
    if (req.requirementType === "MANDATORY") {
      status = "NON_COMPLIANT";
      gap = `No ${req.benefitCategory} benefit found. This is a mandatory requirement.`;
      recommendation = `Implement a ${req.benefitCategory} benefit to meet the mandatory requirement: ${req.description}`;
    } else if (req.requirementType === "QUASI_MANDATORY") {
      status = "NON_COMPLIANT";
      gap = `No ${req.benefitCategory} benefit found. This is quasi-mandatory (industry standard/expected).`;
      recommendation = `Consider adding a ${req.benefitCategory} benefit. While not strictly legally required, this is expected by regulators/industry norms.`;
    } else if (req.requirementType === "RECOMMENDED") {
      status = "NOT_APPLICABLE";
      gap = `No ${req.benefitCategory} benefit found. This is a recommended practice.`;
      recommendation = `Consider offering ${req.benefitCategory} to align with best practices: ${req.description}`;
    } else {
      // COMMON_PRACTICE
      status = "NOT_APPLICABLE";
      gap = null;
    }
  } else {
    benefitEntryId = matchingEntries[0].id;

    if (req.minimumLevel) {
      // Enhanced comparison logic
      const comparisonResult = compareLevel(
        matchingEntries[0].coverLevel,
        req.minimumLevel,
        matchingEntries[0].annualCostPerEmployee,
        matchingEntries[0].employeeContributionPercent
      );

      if (comparisonResult === "meets") {
        status = "COMPLIANT";
      } else if (comparisonResult === "partial") {
        status = "PARTIALLY_COMPLIANT";
        gap = `Current level "${matchingEntries[0].coverLevel}" may not fully meet the minimum of "${req.minimumLevel}".`;
        recommendation = `Review if your current ${req.benefitCategory} coverage meets the minimum requirement of ${req.minimumLevel}.`;
      } else {
        status = "NON_COMPLIANT";
        gap = `Current level "${matchingEntries[0].coverLevel}" does not meet the required minimum of "${req.minimumLevel}".`;
        recommendation = `Increase ${req.benefitCategory} coverage to at least ${req.minimumLevel} to meet compliance requirements.`;
      }
    } else {
      // No minimum level specified — having the benefit is sufficient
      status = "COMPLIANT";
    }
  }

  return {
    requirementId: req.id,
    benefitCategory: req.benefitCategory,
    requirementType: req.requirementType,
    description: req.description,
    status,
    gap,
    recommendation,
    benefitEntryId,
    legalReference: req.legalReference,
    minimumLevel: req.minimumLevel,
    penaltyForNonCompliance: req.penaltyForNonCompliance,
  };
}

/**
 * Compare actual cover level against minimum level.
 * Handles percentage patterns, multiplier patterns, and currency amounts.
 */
function compareLevel(
  actual: string,
  minimum: string,
  annualCost: number | null,
  employeeContrib: number | null
): "meets" | "partial" | "below" {
  const actualLower = actual.toLowerCase().trim();
  const minimumLower = minimum.toLowerCase().trim();

  // Exact match
  if (actualLower === minimumLower || actualLower.includes(minimumLower)) {
    return "meets";
  }

  // Try to extract numeric values for comparison

  // Percentage pattern: "5%", "3% employer"
  const actualPct = extractPercentage(actualLower);
  const minPct = extractPercentage(minimumLower);
  if (actualPct !== null && minPct !== null) {
    if (actualPct >= minPct) return "meets";
    if (actualPct >= minPct * 0.75) return "partial";
    return "below";
  }

  // Multiplier pattern: "2x salary", "4x base salary"
  const actualMult = extractMultiplier(actualLower);
  const minMult = extractMultiplier(minimumLower);
  if (actualMult !== null && minMult !== null) {
    if (actualMult >= minMult) return "meets";
    if (actualMult >= minMult * 0.75) return "partial";
    return "below";
  }

  // Currency amount pattern: "€50,000", "$100,000", "£75,000"
  const actualAmount = extractAmount(actualLower);
  const minAmount = extractAmount(minimumLower);
  if (actualAmount !== null && minAmount !== null) {
    if (actualAmount >= minAmount) return "meets";
    if (actualAmount >= minAmount * 0.75) return "partial";
    return "below";
  }

  // Weeks/days pattern: "26 weeks", "28 days"
  const actualWeeks = extractWeeks(actualLower);
  const minWeeks = extractWeeks(minimumLower);
  if (actualWeeks !== null && minWeeks !== null) {
    if (actualWeeks >= minWeeks) return "meets";
    if (actualWeeks >= minWeeks * 0.75) return "partial";
    return "below";
  }

  // If we have an annual cost and can compare with minimum amount
  if (annualCost !== null && minAmount !== null) {
    if (annualCost >= minAmount) return "meets";
    if (annualCost >= minAmount * 0.75) return "partial";
    return "below";
  }

  // If employer contribution is relevant
  if (employeeContrib !== null && minPct !== null) {
    const employerPct = 100 - employeeContrib;
    if (employerPct >= minPct) return "meets";
    if (employerPct >= minPct * 0.75) return "partial";
    return "below";
  }

  // Cannot determine — default to partial (needs review)
  return "partial";
}

function extractPercentage(s: string): number | null {
  const match = s.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : null;
}

function extractMultiplier(s: string): number | null {
  const match = s.match(/(\d+(?:\.\d+)?)\s*x\s*(salary|base|annual)/i);
  return match ? parseFloat(match[1]) : null;
}

function extractAmount(s: string): number | null {
  const match = s.match(/[€$£]?\s*(\d{1,3}(?:[,.\s]\d{3})*(?:\.\d+)?)/);
  if (!match) return null;
  return parseFloat(match[1].replace(/[,\s]/g, ""));
}

function extractWeeks(s: string): number | null {
  const weekMatch = s.match(/(\d+)\s*weeks?/i);
  if (weekMatch) return parseInt(weekMatch[1]);
  const dayMatch = s.match(/(\d+)\s*days?/i);
  if (dayMatch) return parseInt(dayMatch[1]) / 7;
  return null;
}

/**
 * Check a statutory limit against matching benefit entries.
 */
function checkStatutoryLimit(
  limit: {
    id: string;
    limitType: string;
    benefitCategory: BenefitCategory | null;
    description: string;
    limitValue: string;
    currency: string | null;
    taxYear: string;
    legalReference: string | null;
  },
  matchingEntries: Array<{
    annualCostPerEmployee: number | null;
    coverLevel: string;
    costCurrency: string;
  }>
): StatutoryLimitResult {
  if (matchingEntries.length === 0) {
    return {
      limitId: limit.id,
      limitType: limit.limitType,
      benefitCategory: limit.benefitCategory,
      description: limit.description,
      limitValue: limit.limitValue,
      currency: limit.currency,
      taxYear: limit.taxYear,
      legalReference: limit.legalReference,
      status: limit.benefitCategory ? "NO_DATA" : "NOT_APPLICABLE",
      currentValue: null,
      gap: limit.benefitCategory ? `No ${limit.benefitCategory} benefit data to check against this limit.` : null,
    };
  }

  // Try to compare the limit value against actual data
  const limitAmount = extractAmount(limit.limitValue);
  const limitPct = extractPercentage(limit.limitValue);

  // Check if any entry exceeds the limit
  for (const entry of matchingEntries) {
    if (entry.annualCostPerEmployee !== null && limitAmount !== null) {
      if (entry.annualCostPerEmployee > limitAmount) {
        return {
          limitId: limit.id,
          limitType: limit.limitType,
          benefitCategory: limit.benefitCategory,
          description: limit.description,
          limitValue: limit.limitValue,
          currency: limit.currency,
          taxYear: limit.taxYear,
          legalReference: limit.legalReference,
          status: "EXCEEDS_LIMIT",
          currentValue: `${entry.costCurrency} ${entry.annualCostPerEmployee.toLocaleString()}`,
          gap: `Current cost of ${entry.costCurrency} ${entry.annualCostPerEmployee.toLocaleString()} exceeds the limit of ${limit.limitValue}.`,
        };
      }
    }

    // Check percentage-based limits against cover level
    const entryPct = extractPercentage(entry.coverLevel);
    if (entryPct !== null && limitPct !== null) {
      if (entryPct > limitPct) {
        return {
          limitId: limit.id,
          limitType: limit.limitType,
          benefitCategory: limit.benefitCategory,
          description: limit.description,
          limitValue: limit.limitValue,
          currency: limit.currency,
          taxYear: limit.taxYear,
          legalReference: limit.legalReference,
          status: "EXCEEDS_LIMIT",
          currentValue: entry.coverLevel,
          gap: `Current level of ${entry.coverLevel} exceeds the limit of ${limit.limitValue}.`,
        };
      }
    }
  }

  // No exceedance found
  const firstEntry = matchingEntries[0];
  const currentValue = firstEntry.annualCostPerEmployee
    ? `${firstEntry.costCurrency} ${firstEntry.annualCostPerEmployee.toLocaleString()}`
    : firstEntry.coverLevel;

  return {
    limitId: limit.id,
    limitType: limit.limitType,
    benefitCategory: limit.benefitCategory,
    description: limit.description,
    limitValue: limit.limitValue,
    currency: limit.currency,
    taxYear: limit.taxYear,
    legalReference: limit.legalReference,
    status: "WITHIN_LIMIT",
    currentValue,
    gap: null,
  };
}

/**
 * Get the current tax year string for a country.
 * Different countries have different tax year conventions.
 */
function getCurrentTaxYear(country: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  switch (country) {
    case "GB":
    case "IE":
      // UK/Ireland: tax year runs April to April
      // If before April, we're in previous/current tax year
      if (month < 4) return `${year - 1}/${year.toString().slice(-2)}`;
      return `${year}/${(year + 1).toString().slice(-2)}`;
    default:
      // Most countries: calendar year
      return `${year}`;
  }
}

/**
 * Auto-run compliance check after benefit changes.
 * Fire-and-forget — doesn't block the main operation.
 */
export async function triggerComplianceCheckForCompany(
  companyId: string,
  country: string
): Promise<void> {
  try {
    await runFullComplianceCheck(companyId, country);
  } catch (error) {
    console.error("Auto compliance check failed:", error);
  }
}

/**
 * Re-run compliance checks for all companies in a given country.
 * Used by admin when requirements/limits change.
 */
export async function rerunComplianceForCountry(country: string): Promise<number> {
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { country },
        {
          benefitEntries: {
            some: { country },
          },
        },
      ],
    },
    select: { id: true },
  });

  let count = 0;
  for (const company of companies) {
    try {
      await runFullComplianceCheck(company.id, country);
      count++;
    } catch (error) {
      console.error(`Compliance re-check failed for company ${company.id}:`, error);
    }
  }

  return count;
}
