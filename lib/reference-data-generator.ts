import Anthropic from "@anthropic-ai/sdk";
import type { BenefitCategory } from "@prisma/client";

export interface GeneratedReferenceBenchmark {
  benefitCategory: BenefitCategory;
  prevalencePercent: number;
  costAvg: number | null;
  costMedian: number | null;
  costP25: number | null;
  costP75: number | null;
  costCurrency: string;
  typicalEmployerContribPct: number | null;
  typicalEmployeeContribPct: number | null;
  pctEmployerFunded: number | null;
  pctCoversSpouse: number | null;
  pctCoversDependents: number | null;
  healthExcess: number | null;
  healthCopayPercent: number | null;
  healthInpatientLimit: number | null;
  healthOutpatientLimit: number | null;
  lifeCoverMultiple: number | null;
  ipBenefitPercent: number | null;
  ipWaitingPeriodWeeks: number | null;
  pensionEmployerPct: number | null;
  pensionEmployeePct: number | null;
  coverageNotes: string | null;
  sourceDescription: string | null;
  sourceUrls: string[];
}

const BENEFIT_CATEGORIES: BenefitCategory[] = [
  "HEALTH",
  "LIFE",
  "DISABILITY",
  "PENSION",
  "DENTAL",
  "VISION",
  "EAP",
  "WELLNESS",
  "INCOME_PROTECTION",
  "CRITICAL_ILLNESS",
  "TRAVEL",
  "MEAL_VOUCHERS",
  "TRANSPORT",
  "CHILDCARE",
  "EDUCATION",
  "OTHER",
];

export async function generateReferenceBenchmarks(
  country: string,
  countryName: string,
  localCurrency: string
): Promise<GeneratedReferenceBenchmark[]> {
  const client = new Anthropic();

  const prompt = `You are an employee benefits research analyst. Generate reference benchmark data for employee benefits in ${countryName} (${country}).

For each of the following benefit categories, provide realistic market data based on publicly available surveys, government statistics, and industry reports for ${countryName}:

Categories: ${BENEFIT_CATEGORIES.join(", ")}

For EACH category, return a JSON object with these fields:
- benefitCategory: the category name exactly as listed above
- prevalencePercent: what % of employers offer this benefit (0-100)
- costAvg: average annual cost per employee in ${localCurrency} (null if not applicable)
- costMedian: median annual cost per employee in ${localCurrency} (null if not applicable)
- costP25: 25th percentile annual cost in ${localCurrency} (null if not applicable)
- costP75: 75th percentile annual cost in ${localCurrency} (null if not applicable)
- costCurrency: "${localCurrency}"
- typicalEmployerContribPct: typical employer contribution as % of total cost (null if N/A)
- typicalEmployeeContribPct: typical employee contribution as % of total cost (null if N/A)
- pctEmployerFunded: % of employers that fully fund this benefit (0-100, null if N/A)
- pctCoversSpouse: % of plans that cover spouse (0-100, null if N/A)
- pctCoversDependents: % of plans that cover dependents (0-100, null if N/A)

Category-specific fields (set to null for non-applicable categories):
- healthExcess: typical health insurance excess/deductible in ${localCurrency} (HEALTH only)
- healthCopayPercent: typical copay percentage (HEALTH only)
- healthInpatientLimit: typical inpatient limit in ${localCurrency} (HEALTH only)
- healthOutpatientLimit: typical outpatient limit in ${localCurrency} (HEALTH only)
- lifeCoverMultiple: typical life cover as multiple of salary (LIFE only)
- ipBenefitPercent: % of salary covered by income protection (INCOME_PROTECTION only)
- ipWaitingPeriodWeeks: typical waiting/deferral period in weeks (INCOME_PROTECTION only)
- pensionEmployerPct: typical employer pension contribution % (PENSION only)
- pensionEmployeePct: typical employee pension contribution % (PENSION only)
- coverageNotes: 1-2 sentences about typical coverage in ${countryName} for this category
- sourceDescription: brief description of data sources used
- sourceUrls: array of 1-3 URLs to relevant public data sources (real, verifiable URLs only)

Important guidelines:
- Use realistic data for ${countryName}'s market. If a benefit is rare or not common in ${countryName}, set prevalencePercent low.
- All monetary values should be in ${localCurrency}.
- For categories like EAP, WELLNESS, TRAVEL, MEAL_VOUCHERS, TRANSPORT, CHILDCARE, EDUCATION, OTHER: these may have lower prevalence and costs may be harder to estimate — provide best estimates or null.
- Only include real, publicly verifiable source URLs. If you cannot cite a specific URL, use an empty array.

Return ONLY a JSON array of objects, no markdown fencing, no explanation before or after.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude API");
  }

  // Parse JSON from response - strip any markdown fencing if present
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonText) as GeneratedReferenceBenchmark[];

  // Validate and filter to known categories
  const validCategories = new Set<string>(BENEFIT_CATEGORIES);
  return parsed.filter((item) => validCategories.has(item.benefitCategory));
}
