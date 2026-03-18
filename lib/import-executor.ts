import { prisma } from "@/lib/db";
import { BenefitCategory } from "@prisma/client";
import { parseSpreadsheet } from "./spreadsheet-parser";
import { readFile } from "fs/promises";

interface ColumnMappingRecord {
  sourceColumn: string;
  targetField: string | null;
  targetBenefitCategory: string | null;
  transformRule: string | null;
  status: string;
}

interface ImportResult {
  companiesCreated: number;
  companiesUpdated: number;
  entriesCreated: number;
  errorRows: number;
  errors: { row: number; message: string }[];
}

/**
 * Apply a transform rule to a raw value.
 */
function applyTransform(value: string, rule: string | null): unknown {
  if (!value || value.trim().length === 0) return null;
  const trimmed = value.trim();

  switch (rule) {
    case "multiply_by_100":
      const num = parseFloat(trimmed.replace(/,/g, ""));
      return isNaN(num) ? null : num * 100;

    case "map_yes_no":
      const lower = trimmed.toLowerCase();
      if (["yes", "y", "true", "1"].includes(lower)) return true;
      if (["no", "n", "false", "0"].includes(lower)) return false;
      return null;

    case "parse_currency":
      const cleaned = trimmed.replace(/[€£$¥,\s]/g, "").replace(/^[A-Z]{3}\s*/, "");
      const amount = parseFloat(cleaned);
      return isNaN(amount) ? null : amount;

    default:
      return trimmed;
  }
}

/**
 * Convert a raw string value to the appropriate type for a target field.
 */
function coerceValue(value: string, targetField: string, transform: string | null): unknown {
  if (!value || value.trim().length === 0) return null;

  // Apply transform first
  if (transform) {
    return applyTransform(value, transform);
  }

  const trimmed = value.trim();

  // Boolean fields
  const booleanFields = [
    "employerFunded", "coversSpouse", "coversDependents", "isCore", "isVoluntary", "isFlexible",
    "dentalOrthoIncluded", "leaveIncludesPublicHolidays", "leaveIncreasesWithTenure",
    "leaveBuySellDays", "leaveBirthdayOff", "sickPayAboveStatutory", "maternityAboveStatutory",
    "maternityGradualReturn", "paternityAboveStatutory", "paternitySharedParentalLeave",
    "usesPlatform",
  ];
  if (booleanFields.includes(targetField)) {
    const lower = trimmed.toLowerCase();
    if (["yes", "y", "true", "1"].includes(lower)) return true;
    if (["no", "n", "false", "0"].includes(lower)) return false;
    return null;
  }

  // Integer fields
  const intFields = [
    "employeeCount", "maxDependents", "ipWaitingPeriodWeeks", "ipMaxBenefitAge",
    "leaveDaysEntitlement", "leaveMaxDays", "leaveCarryOverDays", "leaveVolunteerDays",
    "leaveChristmasClosureDays", "sickPayFullPayWeeks", "sickPayHalfPayWeeks", "sickPayWaitingDays",
    "maternityFullPayWeeks", "maternityPartialPayWeeks", "maternityTotalLeaveWeeks", "maternityKitDays",
    "paternityFullPayWeeks", "paternityPartialPayWeeks", "paternityTotalLeaveWeeks",
    "brokerSatisfactionScore", "benefitSatisfactionScore",
  ];
  if (intFields.includes(targetField)) {
    const n = parseInt(trimmed.replace(/,/g, ""));
    return isNaN(n) ? null : n;
  }

  // Float fields
  const floatFields = [
    "averageSalary", "averageBonus", "averageAge", "annualCostPerEmployee",
    "employeeContributionPercent", "healthExcess", "healthCopayPercent",
    "healthInpatientLimit", "healthOutpatientLimit", "lifeCoverMultiple",
    "lifeFixedCoverAmount", "lifeFreeCoverLimit", "ipBenefitPercent",
    "ciCoverMultiple", "ciFixedCoverAmount", "dentalAnnualLimit",
    "pensionContributionRateEmployer", "pensionContributionRateEmployee",
    "pensionDeathBenefitMultiple", "flexFundAmount", "annualPlatformFee",
    "sickPayPartialPayPercent", "maternityPartialPayPercent", "paternityPartialPayPercent",
  ];
  if (floatFields.includes(targetField)) {
    const n = parseFloat(trimmed.replace(/[,€£$¥]/g, ""));
    return isNaN(n) ? null : n;
  }

  return trimmed;
}

/**
 * Execute an approved import — create companies and benefit entries.
 */
export async function executeImport(importId: string): Promise<ImportResult> {
  const brokerImport = await prisma.brokerImport.findUnique({
    where: { id: importId },
    include: {
      columnMappings: { where: { targetField: { not: null } } },
    },
  });

  if (!brokerImport) throw new Error("Import not found");
  if (brokerImport.status !== "APPROVED") throw new Error("Import must be approved first");

  // Read and parse file
  const fileBuffer = await readFile(brokerImport.filePath!);
  const parsed = parseSpreadsheet(
    fileBuffer,
    brokerImport.fileType,
    brokerImport.sheetName || undefined
  );

  const mappings = brokerImport.columnMappings as ColumnMappingRecord[];
  const companyNameMapping = mappings.find((m) => m.targetField === "companyName");

  const result: ImportResult = {
    companiesCreated: 0,
    companiesUpdated: 0,
    entriesCreated: 0,
    errorRows: 0,
    errors: [],
  };

  // Group rows by company
  const companyRows = new Map<string, Record<string, string>[]>();
  let anonCounter = 1;

  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const companyKey = companyNameMapping
      ? (row[companyNameMapping.sourceColumn] || "").trim()
      : `row-${i}`;

    if (!companyKey) {
      result.errors.push({ row: i + 1, message: "No company identifier" });
      result.errorRows++;
      continue;
    }

    if (!companyRows.has(companyKey)) {
      companyRows.set(companyKey, []);
    }
    companyRows.get(companyKey)!.push(row);
  }

  // Process each company
  const brokerId = brokerImport.assignedBrokerId || brokerImport.uploadedByBrokerId;

  for (const [companyName, rows] of Array.from(companyRows.entries())) {
    try {
      // Generate anonymised code if needed
      const anonymisedCode = brokerImport.anonymise
        ? `CLIENT-${importId.slice(0, 4).toUpperCase()}-${String(anonCounter++).padStart(3, "0")}`
        : null;

      const displayName = brokerImport.anonymise ? anonymisedCode! : companyName;

      // Extract company-level fields from first row
      const firstRow = rows[0];
      const companyData: Record<string, unknown> = { name: displayName };

      for (const mapping of mappings) {
        if (mapping.targetField && mapping.targetField !== "companyName") {
          const val = firstRow[mapping.sourceColumn];
          if (!val) continue;

          const entity = getFieldEntity(mapping.targetField);
          if (entity === "COMPANY") {
            companyData[mapping.targetField] = coerceValue(
              val,
              mapping.targetField,
              mapping.transformRule
            );
          }
        }
      }

      // Find or create company
      let company = await prisma.company.findFirst({
        where: {
          name: displayName,
          users: brokerId ? { some: { id: brokerId } } : undefined,
        },
      });

      if (company) {
        // Update with any new company-level data
        await prisma.company.update({
          where: { id: company.id },
          data: {
            country: (companyData.country as string) || company.country,
            industry: (companyData.industry as string) || company.industry,
            employeeCount: (companyData.employeeCount as number) || company.employeeCount,
            averageSalary: (companyData.averageSalary as number) ?? company.averageSalary,
          },
        });
        result.companiesUpdated++;
      } else {
        company = await prisma.company.create({
          data: {
            name: displayName,
            country: (companyData.country as string) || "IE",
            industry: (companyData.industry as string) || "K64",
            employeeCount: (companyData.employeeCount as number) || 0,
            averageSalary: (companyData.averageSalary as number) ?? null,
          },
        });
        result.companiesCreated++;
      }

      // Create broker-client relationship if broker assigned
      if (brokerId) {
        const existingRel = await prisma.brokerClientRelationship.findFirst({
          where: { brokerId, companyId: company.id },
        });
        if (!existingRel) {
          await prisma.brokerClientRelationship.create({
            data: {
              brokerId,
              companyId: company.id,
              status: "ACTIVE",
              inviteEmail: "",
              inviteToken: `import-${importId}-${company.id}`,
              accessLevel: "VIEW_AND_ADVISE",
              acceptedAt: new Date(),
            },
          });
        }
      }

      // Create benefit entries from each row
      for (const row of rows) {
        const benefitData: Record<string, unknown> = {
          companyId: company.id,
          surveySource: false,
          isCore: true,
          employerFunded: true,
        };

        let detectedCategory: string | null = null;

        for (const mapping of mappings) {
          if (!mapping.targetField) continue;
          const val = row[mapping.sourceColumn];
          if (!val || val.trim().length === 0) continue;

          const entity = getFieldEntity(mapping.targetField);
          if (entity === "BENEFIT") {
            const coerced = coerceValue(val, mapping.targetField, mapping.transformRule);
            if (coerced !== null) {
              benefitData[mapping.targetField] = coerced;
            }

            // Track detected category from mapping or field
            if (mapping.targetBenefitCategory) {
              detectedCategory = mapping.targetBenefitCategory;
            }
          }
        }

        // Set benefit category
        const category = (benefitData.benefitCategory as string) || detectedCategory || "OTHER";
        benefitData.benefitCategory = category as BenefitCategory;

        // Ensure required fields have defaults
        if (!benefitData.benefitName) benefitData.benefitName = category;
        if (!benefitData.coverLevel) benefitData.coverLevel = "Standard";
        if (!benefitData.costCurrency) benefitData.costCurrency = "EUR";

        // Set country from company if not on benefit
        if (!benefitData.country) benefitData.country = company.country;

        // Handle pension plan type enum
        if (benefitData.pensionPlanType) {
          const pt = String(benefitData.pensionPlanType).toUpperCase();
          if (["DC", "DB", "CASH_BALANCE", "HYBRID"].includes(pt)) {
            benefitData.pensionPlanType = pt;
          } else {
            benefitData.pensionPlanType = null;
          }
        }

        try {
          await prisma.benefitEntry.create({
            data: benefitData as Parameters<typeof prisma.benefitEntry.create>[0]["data"],
          });
          result.entriesCreated++;
        } catch (entryErr) {
          result.errors.push({
            row: parsed.rows.indexOf(row) + 1,
            message: entryErr instanceof Error ? entryErr.message : "Failed to create benefit entry",
          });
          result.errorRows++;
        }
      }

      // Store imported rows for audit
      for (const row of rows) {
        await prisma.importedRow.create({
          data: {
            importId,
            rowIndex: parsed.rows.indexOf(row),
            rawData: JSON.parse(JSON.stringify(row)),
            valid: true,
            companyName: companyName,
            anonymisedCode: anonymisedCode,
            companyId: company.id,
          },
        });
      }
    } catch (companyErr) {
      result.errors.push({
        row: 0,
        message: `Company "${companyName}": ${companyErr instanceof Error ? companyErr.message : "Unknown error"}`,
      });
      result.errorRows++;
    }
  }

  return result;
}

/**
 * Determine which entity a target field belongs to.
 */
function getFieldEntity(field: string): "COMPANY" | "BENEFIT" | "PLATFORM" {
  const companyFields = [
    "companyName", "country", "industry", "employeeCount", "employeeCountRange",
    "averageSalary", "averageBonus", "averageAge",
  ];
  const platformFields = ["usesPlatform", "platformName", "annualPlatformFee"];

  if (companyFields.includes(field)) return "COMPANY";
  if (platformFields.includes(field)) return "PLATFORM";
  return "BENEFIT";
}
