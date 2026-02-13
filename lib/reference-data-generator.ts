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
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW" | null;
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

// Country-specific data source recommendations
const COUNTRY_SOURCES: Record<string, string> = {
  IE: `**Ireland-specific sources (use these first):**
- CSO (Central Statistics Office): Labour Cost Surveys, EHECS
- IBEC: Annual HR Update, Benefits & Trends Survey
- Irish Association of Pension Funds (IAPF): Annual pension survey
- Revenue.ie: Benefit-in-Kind thresholds, pension tax relief limits
- OECD Ireland country profile (social spending, pension contribution rates)
- Eurostat: Labour Cost Survey (LCS) for Ireland — non-wage costs ~13.4% of total labour costs`,

  GB: `**UK-specific sources (use these first):**
- ONS ASHE (Annual Survey of Hours and Earnings): earnings and benefits data
- GRiD (Group Risk Development): Annual employer-sponsored risk benefits survey
- CIPD: Reward Management Survey, Employee Benefits trends
- HMRC: Benefit-in-Kind statistics, pension auto-enrolment thresholds
- The Pensions Regulator: Auto-enrolment contribution data
- OECD UK country profile
- Eurostat LCS for UK — non-wage costs ~16.8% of total labour costs`,

  FR: `**France-specific sources (use these first):**
- DARES (Ministry of Labour statistics): Employer benefit provision data
- INSEE: Labour cost surveys, social protection statistics
- OECD France country profile — social spending ~30% of GDP (highest OECD tier)
- Eurostat LCS for France — non-wage costs ~31.2% of total labour costs (highest in EU)
- AGIRC-ARRCO: Complementary pension contribution rates
- Mutualité Française: Complementary health insurance (mutuelle) statistics`,

  DE: `**Germany-specific sources (use these first):**
- Destatis (Federal Statistical Office): Employer cost surveys
- Bundesministerium für Arbeit und Soziales: Social insurance contribution rates
- OECD Germany country profile
- Eurostat LCS for Germany
- GDV (German Insurance Association): Occupational pension and group insurance data`,

  ES: `**Spain-specific sources (use these first):**
- INE (Instituto Nacional de Estadística): Encuesta de Coste Laboral
- Seguridad Social: Contribution rate tables
- OECD Spain country profile
- Eurostat LCS for Spain — non-wage costs ~24.8% of total labour costs`,

  PT: `**Portugal-specific sources (use these first):**
- INE Portugal (Instituto Nacional de Estatística): Labour cost data
- Segurança Social: Contribution rates
- OECD Portugal country profile
- Eurostat LCS for Portugal — non-wage costs ~20.2% of total labour costs`,

  US: `**US-specific sources (use these first):**
- BLS ECEC (Employer Costs for Employee Compensation): Benefits = $13.58/hr (29.8% of total comp), health insurance = $3.35/hr
- BLS NCS (National Compensation Survey): Detailed benefit prevalence and access rates
- SHRM (Society for Human Resource Management): Annual Employee Benefits Survey
- Kaiser Family Foundation: Employer Health Benefits Survey (premiums, cost-sharing)
- DOL/IRS: 401(k) contribution limits, ERISA reporting`,

  NL: `**Netherlands-specific sources (use these first):**
- CBS (Centraal Bureau voor de Statistiek): Labour cost surveys
- DNB (De Nederlandsche Bank): Pension fund statistics
- OECD Netherlands country profile
- Eurostat LCS for Netherlands`,

  SE: `**Sweden-specific sources (use these first):**
- SCB (Statistiska centralbyrån): Labour cost statistics
- Försäkringskassan: Social insurance data
- OECD Sweden country profile
- Eurostat LCS for Sweden — non-wage costs ~28% of total labour costs
- Collectum / Alecta: Occupational pension statistics`,

  DK: `**Denmark-specific sources (use these first):**
- Danmarks Statistik: Labour cost data
- ATP (Arbejdsmarkedets Tillægspension): Supplementary pension statistics
- OECD Denmark country profile
- Eurostat LCS for Denmark — non-wage costs ~8% of total labour costs (lowest EU)`,
};

function getCountrySources(country: string): string {
  if (COUNTRY_SOURCES[country]) {
    return COUNTRY_SOURCES[country];
  }
  return `**General international sources (no country-specific database identified):**
- ILO (International Labour Organization): World Social Protection Database
- ISSA (International Social Security Association): Country profiles
- OECD: Social Expenditure Database (SOCX), Taxing Wages, Pensions at a Glance
- Eurostat: Labour Cost Survey (LCS) if European country
- World Bank: Social protection and labour indicators`;
}

export async function generateReferenceBenchmarks(
  country: string,
  countryName: string,
  localCurrency: string
): Promise<GeneratedReferenceBenchmark[]> {
  const client = new Anthropic();

  const countrySources = getCountrySources(country);

  const prompt = `You are an employee benefits research analyst with access to institutional data. Generate reference benchmark data for employee benefits in ${countryName} (${country}).

## GROUNDING DATA — Use these real-world reference points to calibrate your estimates

**OECD Social Expenditure (SOCX):**
- France: ~30% of GDP on social spending (highest tier)
- Denmark, Sweden, Belgium: ~26-28% of GDP
- Germany, Italy: ~25-26% of GDP
- UK, Ireland, Netherlands: ~15-21% of GDP
- US: ~19% of GDP (but heavily private-sector)

**Eurostat Labour Cost Survey — Non-wage costs as % of total labour costs:**
- France: 31.2% (highest EU) | Sweden: 28% | Belgium: 27% | Italy: 26%
- Spain: 24.8% | Portugal: 20.2% | Germany: 22% | Netherlands: 22%
- UK: 16.8% | Ireland: 13.4% | Denmark: 8% (lowest, due to tax-funded model)

**BLS ECEC (US benchmark):**
- Total benefits cost: $13.58/hr (29.8% of total compensation)
- Health insurance: $3.35/hr | Retirement/savings: $1.92/hr
- Legally required: $3.01/hr | Paid leave: $3.22/hr

**ILO Global:**
- Average 19.3% of GDP on social protection worldwide

**OECD Pensions at a Glance:**
- Average effective contribution rate: 18.8% across OECD
- Range: 0% (New Zealand, tax-funded) to 33% (Italy)
- Typical auto-enrolment minimum: 3-8% employer + 3-5% employee

**ISSA Social Security Programs Throughout the World:**
- Mandatory employer social security contributions vary from 8% (IE) to 45% (FR) of gross salary
- Health insurance: Mandatory in DE, FR, NL; employer-sponsored dominant in US, IE, UK

## DATA SOURCE TIERS — Use these to determine confidence level

**Tier 1 — Mandatory/statutory costs (→ HIGH confidence expected):**
Use ISSA contribution rate tables, OECD Taxing Wages database, ILO World Social Protection Database. These provide exact statutory rates.

**Tier 2 — Aggregate spending & cost data (→ HIGH or MEDIUM confidence):**
Use OECD SOCX, Eurostat LCS/SES (Structure of Earnings Survey), BLS ECEC. These provide national-level aggregate data.

**Tier 3 — Voluntary benefit prevalence & employer practices (→ MEDIUM or LOW confidence):**
Use Ravio (European comp data), SHRM surveys, BLS NCS, CIPD surveys, GRiD surveys, IBEC surveys, Willis Towers Watson, Mercer, Aon benefit surveys. These are survey-based and may have sample bias.

## COUNTRY-SPECIFIC SOURCES FOR ${countryName.toUpperCase()}

${countrySources}

## CONFIDENCE LEVEL DEFINITIONS

For EACH data point, assign a confidenceLevel:
- **HIGH**: You can cite a specific government/institutional source with actual published figures (e.g., "ISSA reports employer pension contribution of 8.67% in Ireland")
- **MEDIUM**: Estimated from adjacent or regional data sources, or extrapolated from partial data (e.g., "Eurostat LCS suggests total non-wage costs of X%, pension portion estimated at Y%")
- **LOW**: Best estimate from general training knowledge; no specific institutional source can be cited for this figure

## OUTPUT SPECIFICATION

For each of these benefit categories, provide benchmark data for ${countryName}:
${BENEFIT_CATEGORIES.join(", ")}

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

Metadata fields:
- confidenceLevel: "HIGH", "MEDIUM", or "LOW" — the OVERALL confidence for this category entry, based on how well-sourced your numbers are
- coverageNotes: 2-3 sentences about typical coverage in ${countryName} for this category. Mention specific statutory requirements if applicable.
- sourceDescription: Name the specific institutional sources you drew from (e.g., "ISSA Social Security Programs 2024, OECD Taxing Wages 2024, IBEC HR Update 2024"). Be specific — do not just say "various industry surveys".
- sourceUrls: array of 1-3 URLs to real, verifiable institutional data sources. Only include URLs you are confident exist (e.g., oecd.org, ilo.org, eurostat, national statistics offices). Use an empty array if uncertain.

## IMPORTANT GUIDELINES
- Ground your numbers in the reference data above. Cross-check: if your per-employee costs imply a total-cost-to-employer ratio wildly different from the Eurostat LCS figures for ${countryName}, recalibrate.
- For categories uncommon in ${countryName} (e.g., DENTAL in countries with strong public dental, MEAL_VOUCHERS outside FR/BE), set prevalencePercent low and costs null.
- All monetary values in ${localCurrency}.
- Prefer UNDER-estimating confidence rather than over-estimating. If you cannot name the exact institutional source for a number, use MEDIUM or LOW.
- For statutory/mandatory benefits, always cite the governing legislation or agency.

Return ONLY a JSON array of objects, no markdown fencing, no explanation before or after.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude API");
  }

  // Check if response was truncated
  if (message.stop_reason === "max_tokens") {
    throw new Error(
      `Claude API response was truncated (used all ${message.usage.output_tokens} output tokens). Response may be incomplete.`
    );
  }

  // Parse JSON from response - strip any markdown fencing if present
  let jsonText = textBlock.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: GeneratedReferenceBenchmark[];
  try {
    parsed = JSON.parse(jsonText) as GeneratedReferenceBenchmark[];
  } catch (e) {
    throw new Error(
      `Failed to parse Claude API response as JSON: ${(e as Error).message}. First 200 chars: ${jsonText.slice(0, 200)}`
    );
  }

  // Validate and filter to known categories
  const validCategories = new Set<string>(BENEFIT_CATEGORIES);
  return parsed.filter((item) => validCategories.has(item.benefitCategory));
}
