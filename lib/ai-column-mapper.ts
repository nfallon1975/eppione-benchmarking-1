import Anthropic from "@anthropic-ai/sdk";
import { BENEFIT_CATEGORY_LABELS } from "./utils";
import { TARGET_FIELDS } from "./import-target-fields";
export type { TargetField } from "./import-target-fields";
export { TARGET_FIELDS };

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
