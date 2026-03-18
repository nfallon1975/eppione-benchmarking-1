import Anthropic from "@anthropic-ai/sdk";
import { BENEFIT_CATEGORY_LABELS } from "./utils";

/**
 * All possible target fields the AI can map columns to.
 * Grouped by entity type.
 */
export const TARGET_FIELDS = [
  // Company fields
  { field: "companyName", label: "Company Name", entity: "COMPANY", type: "string", description: "Company/employer name or identifier" },
  { field: "country", label: "Country", entity: "COMPANY", type: "string", description: "Country (ISO code or name)" },
  { field: "industry", label: "Industry", entity: "COMPANY", type: "string", description: "Industry sector or NACE code" },
  { field: "employeeCount", label: "Employee Count", entity: "COMPANY", type: "number", description: "Number of employees" },
  { field: "employeeCountRange", label: "Employee Count Range", entity: "COMPANY", type: "string", description: "Employee size band (e.g. 1-50, 51-250)" },
  { field: "averageSalary", label: "Average Salary", entity: "COMPANY", type: "number", description: "Average employee salary" },
  { field: "averageBonus", label: "Average Bonus", entity: "COMPANY", type: "number", description: "Average bonus (amount or % of salary)" },
  { field: "averageAge", label: "Average Workforce Age", entity: "COMPANY", type: "number", description: "Average age of employees" },

  // Common benefit fields
  { field: "benefitCategory", label: "Benefit Category", entity: "BENEFIT", type: "string", description: "Type of benefit (Health, Life, Pension, etc.)" },
  { field: "benefitName", label: "Benefit Name", entity: "BENEFIT", type: "string", description: "Specific benefit plan name" },
  { field: "coverLevel", label: "Cover Level", entity: "BENEFIT", type: "string", description: "Level of cover (e.g. 2x salary, €50,000)" },
  { field: "employerFunded", label: "Employer Funded", entity: "BENEFIT", type: "boolean", description: "Whether employer pays for this benefit" },
  { field: "employeeContributionPercent", label: "Employee Contribution %", entity: "BENEFIT", type: "number", description: "Employee contribution percentage" },
  { field: "coversSpouse", label: "Covers Spouse", entity: "BENEFIT", type: "boolean", description: "Whether benefit covers spouse/partner" },
  { field: "coversDependents", label: "Covers Dependents", entity: "BENEFIT", type: "boolean", description: "Whether benefit covers dependents/children" },
  { field: "isCore", label: "Core Benefit", entity: "BENEFIT", type: "boolean", description: "Whether this is a core (not voluntary) benefit" },
  { field: "isVoluntary", label: "Voluntary Benefit", entity: "BENEFIT", type: "boolean", description: "Whether this is a voluntary (employee-opted) benefit" },
  { field: "provider", label: "Provider/Insurer", entity: "BENEFIT", type: "string", description: "Insurance company or provider name" },
  { field: "annualCostPerEmployee", label: "Annual Cost Per Employee", entity: "BENEFIT", type: "number", description: "Annual cost per employee" },
  { field: "costCurrency", label: "Cost Currency", entity: "BENEFIT", type: "string", description: "Currency code (EUR, GBP, USD, etc.)" },
  { field: "renewalDate", label: "Renewal Date", entity: "BENEFIT", type: "date", description: "Policy renewal date" },
  { field: "benefitSatisfactionScore", label: "Satisfaction Score", entity: "BENEFIT", type: "number", description: "Satisfaction rating (1-10)" },
  { field: "brokerName", label: "Broker Name", entity: "BENEFIT", type: "string", description: "Benefits broker/adviser name" },

  // Health-specific
  { field: "healthExcess", label: "Health Excess/Deductible", entity: "BENEFIT", type: "number", category: "HEALTH", description: "Health insurance excess amount" },
  { field: "healthCopayPercent", label: "Health Co-Pay %", entity: "BENEFIT", type: "number", category: "HEALTH", description: "Health insurance co-pay percentage" },
  { field: "healthInpatientLimit", label: "Inpatient Limit", entity: "BENEFIT", type: "number", category: "HEALTH", description: "Maximum inpatient coverage" },
  { field: "healthOutpatientLimit", label: "Outpatient Limit", entity: "BENEFIT", type: "number", category: "HEALTH", description: "Maximum outpatient coverage" },

  // Life-specific
  { field: "lifeCoverMultiple", label: "Life Cover Multiple", entity: "BENEFIT", type: "number", category: "LIFE", description: "Life cover as multiple of salary (e.g. 4)" },
  { field: "lifeFixedCoverAmount", label: "Life Fixed Cover Amount", entity: "BENEFIT", type: "number", category: "LIFE", description: "Life cover fixed amount" },
  { field: "lifeFreeCoverLimit", label: "Life Free Cover Limit", entity: "BENEFIT", type: "number", category: "LIFE", description: "Free cover limit without medical underwriting" },

  // Income Protection
  { field: "ipBenefitPercent", label: "IP Benefit %", entity: "BENEFIT", type: "number", category: "INCOME_PROTECTION", description: "Income protection replacement percentage" },
  { field: "ipWaitingPeriodWeeks", label: "IP Waiting Period (weeks)", entity: "BENEFIT", type: "number", category: "INCOME_PROTECTION", description: "Waiting/deferred period in weeks" },
  { field: "ipMaxBenefitAge", label: "IP Max Benefit Age", entity: "BENEFIT", type: "number", category: "INCOME_PROTECTION", description: "Maximum age for benefits" },

  // Critical Illness
  { field: "ciCoverMultiple", label: "CI Cover Multiple", entity: "BENEFIT", type: "number", category: "CRITICAL_ILLNESS", description: "Critical illness cover as multiple of salary" },
  { field: "ciFixedCoverAmount", label: "CI Fixed Cover Amount", entity: "BENEFIT", type: "number", category: "CRITICAL_ILLNESS", description: "Critical illness fixed cover amount" },

  // Dental
  { field: "dentalAnnualLimit", label: "Dental Annual Limit", entity: "BENEFIT", type: "number", category: "DENTAL", description: "Annual dental benefit limit" },
  { field: "dentalOrthoIncluded", label: "Dental Orthodontic Cover", entity: "BENEFIT", type: "boolean", category: "DENTAL", description: "Whether orthodontic treatment is covered" },

  // Pension
  { field: "pensionContributionRateEmployer", label: "Pension Employer %", entity: "BENEFIT", type: "number", category: "PENSION", description: "Employer pension contribution rate" },
  { field: "pensionContributionRateEmployee", label: "Pension Employee %", entity: "BENEFIT", type: "number", category: "PENSION", description: "Employee pension contribution rate" },
  { field: "pensionPlanType", label: "Pension Plan Type", entity: "BENEFIT", type: "string", category: "PENSION", description: "DC, DB, Cash Balance, or Hybrid" },
  { field: "pensionDeathBenefitMultiple", label: "Pension Death Benefit Multiple", entity: "BENEFIT", type: "number", category: "PENSION", description: "Death benefit as multiple of salary" },

  // Annual Leave
  { field: "leaveDaysEntitlement", label: "Annual Leave Days", entity: "BENEFIT", type: "number", category: "ANNUAL_LEAVE", description: "Annual leave days entitlement" },
  { field: "leaveIncludesPublicHolidays", label: "Includes Public Holidays", entity: "BENEFIT", type: "boolean", category: "ANNUAL_LEAVE", description: "Whether public holidays are included in entitlement" },
  { field: "leaveIncreasesWithTenure", label: "Leave Increases with Service", entity: "BENEFIT", type: "boolean", category: "ANNUAL_LEAVE", description: "Whether leave entitlement increases with tenure" },
  { field: "leaveBuySellDays", label: "Buy/Sell Leave Days", entity: "BENEFIT", type: "boolean", category: "ANNUAL_LEAVE", description: "Whether employees can buy or sell leave days" },
  { field: "leaveCarryOverDays", label: "Leave Carry-Over Days", entity: "BENEFIT", type: "number", category: "ANNUAL_LEAVE", description: "Number of days that can be carried over" },

  // Sick Pay
  { field: "sickPayFullPayWeeks", label: "Sick Pay Full Pay (weeks)", entity: "BENEFIT", type: "number", category: "SICK_PAY", description: "Weeks of full sick pay" },
  { field: "sickPayHalfPayWeeks", label: "Sick Pay Partial Pay (weeks)", entity: "BENEFIT", type: "number", category: "SICK_PAY", description: "Weeks of partial/half sick pay" },
  { field: "sickPayAboveStatutory", label: "Sick Pay Above Statutory", entity: "BENEFIT", type: "boolean", category: "SICK_PAY", description: "Whether sick pay exceeds statutory minimum" },

  // Maternity
  { field: "maternityFullPayWeeks", label: "Maternity Full Pay (weeks)", entity: "BENEFIT", type: "number", category: "MATERNITY_PAY", description: "Weeks of full maternity pay" },
  { field: "maternityPartialPayWeeks", label: "Maternity Partial Pay (weeks)", entity: "BENEFIT", type: "number", category: "MATERNITY_PAY", description: "Weeks of partial maternity pay" },
  { field: "maternityPartialPayPercent", label: "Maternity Partial Pay %", entity: "BENEFIT", type: "number", category: "MATERNITY_PAY", description: "Partial maternity pay rate" },
  { field: "maternityTotalLeaveWeeks", label: "Maternity Total Leave (weeks)", entity: "BENEFIT", type: "number", category: "MATERNITY_PAY", description: "Total maternity leave offered" },

  // Paternity
  { field: "paternityFullPayWeeks", label: "Paternity Full Pay (weeks)", entity: "BENEFIT", type: "number", category: "PATERNITY_PAY", description: "Weeks of full paternity pay" },
  { field: "paternityPartialPayWeeks", label: "Paternity Partial Pay (weeks)", entity: "BENEFIT", type: "number", category: "PATERNITY_PAY", description: "Weeks of partial paternity pay" },
  { field: "paternitySharedParentalLeave", label: "Shared Parental Leave", entity: "BENEFIT", type: "boolean", category: "PATERNITY_PAY", description: "Whether shared parental leave is offered" },

  // Platform
  { field: "usesPlatform", label: "Uses Benefits Platform", entity: "PLATFORM", type: "boolean", description: "Whether company uses a benefits platform" },
  { field: "platformName", label: "Platform Name", entity: "PLATFORM", type: "string", description: "Benefits platform provider name" },
  { field: "annualPlatformFee", label: "Platform Fee", entity: "PLATFORM", type: "number", description: "Annual platform fee per employee" },
] as const;

export type TargetField = (typeof TARGET_FIELDS)[number];

export interface AIMappingResult {
  sourceColumn: string;
  targetField: string | null;
  targetFieldLabel: string | null;
  targetBenefitCategory: string | null;
  confidence: number;
  reasoning: string;
  transformRule: string | null;
  detectedType: string;
}

/**
 * Build the system prompt for the AI column mapper.
 */
function buildSystemPrompt(): string {
  const fieldsList = TARGET_FIELDS.map(
    (f) =>
      `  - ${f.field} (${f.entity}${"category" in f && f.category ? `, category: ${f.category}` : ""}, type: ${f.type}): ${f.description}`
  ).join("\n");

  const categories = Object.entries(BENEFIT_CATEGORY_LABELS)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");

  return `You are a data mapping specialist for an employee benefits benchmarking platform. A broker has uploaded a spreadsheet of client benefit data. Map each column to the correct platform field.

AVAILABLE TARGET FIELDS:
${fieldsList}

BENEFIT CATEGORIES:
${categories}

COMMON ABBREVIATIONS:
PMI/GIP/PHI = HEALTH, GLA/DIS/Death = LIFE, IP/PHI = INCOME_PROTECTION,
ER = Employer, EE = Employee, CI = CRITICAL_ILLNESS, DEN = DENTAL,
PEN/GP = PENSION, AL = ANNUAL_LEAVE

RULES:
1. One column maps to one field. Choose the best fit.
2. Some columns contain benefit data encoded in headers (e.g. "PMI Y/N", "Life Cover Multiple", "Pension ER%") — map to the correct benefit category + field.
3. If a column is not relevant to benefits benchmarking (e.g. "account manager", "last contact date"), set targetField to null.
4. Provide confidence 0-1 for each mapping and explain reasoning.
5. If values look like percentages stored as decimals (0.05 instead of 5%), set transformRule to "multiply_by_100".
6. If values are Yes/No or Y/N that map to boolean fields, set transformRule to "map_yes_no".
7. If values contain currency symbols mixed with numbers, set transformRule to "parse_currency".
8. Detect the data type of each column from the sample values.

Respond ONLY in valid JSON — an array of mapping objects:
[
  {
    "sourceColumn": "Original Column Header",
    "targetField": "fieldName or null if unmapped",
    "targetFieldLabel": "Human readable label or null",
    "targetBenefitCategory": "HEALTH|LIFE|PENSION|etc or null",
    "confidence": 0.95,
    "reasoning": "Why this mapping was chosen",
    "transformRule": "multiply_by_100|map_yes_no|parse_currency|null",
    "detectedType": "string|number|boolean|date|currency"
  }
]`;
}

/**
 * Build the user prompt with column data.
 */
function buildUserPrompt(
  columns: { header: string; sampleValues: string[]; detectedType: string }[],
  totalRows: number
): string {
  const colData = columns
    .map(
      (c) =>
        `Column: "${c.header}" | Type: ${c.detectedType} | Samples: ${c.sampleValues.map((v) => `"${v}"`).join(", ")}`
    )
    .join("\n");

  return `Spreadsheet has ${totalRows} rows and ${columns.length} columns.

COLUMNS:
${colData}

Map each column to the appropriate platform field. Return JSON array only.`;
}

/**
 * Call Claude to map spreadsheet columns to platform fields.
 */
export async function mapColumnsWithAI(
  columns: { header: string; index: number; sampleValues: string[]; detectedType: string }[],
  totalRows: number
): Promise<AIMappingResult[]> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: buildSystemPrompt(),
    messages: [
      {
        role: "user",
        content: buildUserPrompt(columns, totalRows),
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON from response (handle markdown code blocks)
  let json = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    json = codeBlockMatch[1];
  }

  const parsed: AIMappingResult[] = JSON.parse(json.trim());

  // Validate and enrich with field labels
  return parsed.map((m) => {
    const targetDef = TARGET_FIELDS.find((f) => f.field === m.targetField);
    return {
      ...m,
      targetFieldLabel: m.targetFieldLabel || targetDef?.label || null,
      targetBenefitCategory:
        m.targetBenefitCategory || (targetDef && "category" in targetDef ? targetDef.category : null) || null,
      confidence: Math.max(0, Math.min(1, m.confidence || 0)),
    };
  });
}
