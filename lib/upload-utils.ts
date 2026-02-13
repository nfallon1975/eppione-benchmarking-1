import Papa from "papaparse";
import { z } from "zod";

export interface RowValidationResult<T> {
  rowIndex: number;
  valid: boolean;
  data?: T;
  errors?: { field: string; message: string }[];
}

// Case-insensitive header alias map: normalized form -> canonical field name
const HEADER_ALIASES: Record<string, string> = {
  benefitcategory: "benefitCategory",
  benefit_category: "benefitCategory",
  benefitname: "benefitName",
  benefit_name: "benefitName",
  coverlevel: "coverLevel",
  cover_level: "coverLevel",
  iscore: "isCore",
  is_core: "isCore",
  employerfunded: "employerFunded",
  employer_funded: "employerFunded",
  isvoluntary: "isVoluntary",
  is_voluntary: "isVoluntary",
  isflexible: "isFlexible",
  is_flexible: "isFlexible",
  coversspouse: "coversSpouse",
  covers_spouse: "coversSpouse",
  coversdependents: "coversDependents",
  covers_dependents: "coversDependents",
  costcurrency: "costCurrency",
  cost_currency: "costCurrency",
  annualcostperemployee: "annualCostPerEmployee",
  annual_cost_per_employee: "annualCostPerEmployee",
  employeecontributionpercent: "employeeContributionPercent",
  employee_contribution_percent: "employeeContributionPercent",
  healthexcess: "healthExcess",
  health_excess: "healthExcess",
  healthcopaypercent: "healthCopayPercent",
  health_copay_percent: "healthCopayPercent",
  healthinpatientlimit: "healthInpatientLimit",
  health_inpatient_limit: "healthInpatientLimit",
  healthoutpatientlimit: "healthOutpatientLimit",
  health_outpatient_limit: "healthOutpatientLimit",
  lifecovermultiple: "lifeCoverMultiple",
  life_cover_multiple: "lifeCoverMultiple",
  lifefixedcoveramount: "lifeFixedCoverAmount",
  life_fixed_cover_amount: "lifeFixedCoverAmount",
  ipbenefitpercent: "ipBenefitPercent",
  ip_benefit_percent: "ipBenefitPercent",
  ipwaitingperiodweeks: "ipWaitingPeriodWeeks",
  ip_waiting_period_weeks: "ipWaitingPeriodWeeks",
  cicovermultiple: "ciCoverMultiple",
  ci_cover_multiple: "ciCoverMultiple",
  cifixedcoveramount: "ciFixedCoverAmount",
  ci_fixed_cover_amount: "ciFixedCoverAmount",
  dentalannuallimit: "dentalAnnualLimit",
  dental_annual_limit: "dentalAnnualLimit",
  dentalorthoincluded: "dentalOrthoIncluded",
  dental_ortho_included: "dentalOrthoIncluded",
  pensionemployerpct: "pensionEmployerPct",
  pension_employer_pct: "pensionEmployerPct",
  pensionemployeepct: "pensionEmployeePct",
  pension_employee_pct: "pensionEmployeePct",
  companyname: "companyName",
  company_name: "companyName",
  companyemail: "companyEmail",
  company_email: "companyEmail",
  contactname: "contactName",
  contact_name: "contactName",
  employeecount: "employeeCount",
  employee_count: "employeeCount",
  employeecountrange: "employeeCountRange",
  employee_count_range: "employeeCountRange",
  licensenumber: "licenseNumber",
  license_number: "licenseNumber",
  countriesactive: "countriesActive",
  countries_active: "countriesActive",
  brokeremail: "brokerEmail",
  broker_email: "brokerEmail",
};

function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().trim().replace(/[\s-]+/g, "_");
  return HEADER_ALIASES[normalized] || HEADER_ALIASES[normalized.replace(/_/g, "")] || header.trim();
}

export function parseCSV(csvText: string): { data: Record<string, string>[]; errors: string[] } {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  const errors: string[] = [];
  if (result.errors.length > 0) {
    for (const err of result.errors) {
      if (err.type === "FieldMismatch" && err.row !== undefined) {
        errors.push(`Row ${err.row + 2}: ${err.message}`);
      }
    }
  }

  return { data: result.data, errors };
}

export function validateRows<T>(
  rows: Record<string, string>[],
  zodSchema: z.ZodType<T>
): RowValidationResult<T>[] {
  return rows.map((row, index) => {
    const result = zodSchema.safeParse(row);
    if (result.success) {
      return { rowIndex: index, valid: true, data: result.data };
    }
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return { rowIndex: index, valid: false, errors };
  });
}
