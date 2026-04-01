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
  // Plan Design
  deductibleamount: "deductibleAmount",
  deductible_amount: "deductibleAmount",
  deductiblecurrency: "deductibleCurrency",
  deductible_currency: "deductibleCurrency",
  copaypercent: "coPayPercent",
  co_pay_percent: "coPayPercent",
  copay_percent: "coPayPercent",
  copaymaxamount: "coPayMaxAmount",
  co_pay_max_amount: "coPayMaxAmount",
  copay_max_amount: "coPayMaxAmount",
  suminsured: "sumInsured",
  sum_insured: "sumInsured",
  suminsuredcurrency: "sumInsuredCurrency",
  sum_insured_currency: "sumInsuredCurrency",
  covermultiple: "coverMultiple",
  cover_multiple: "coverMultiple",
  covermultiplebase: "coverMultipleBase",
  cover_multiple_base: "coverMultipleBase",
  roomcategory: "roomCategory",
  room_category: "roomCategory",
  waitingperioddays: "waitingPeriodDays",
  waiting_period_days: "waitingPeriodDays",
  benefitmaxannual: "benefitMaxAnnual",
  benefit_max_annual: "benefitMaxAnnual",
  benefitmaxcurrency: "benefitMaxCurrency",
  benefit_max_currency: "benefitMaxCurrency",
  reimbursementpercent: "reimbursementPercent",
  reimbursement_percent: "reimbursementPercent",
  benefitdurationdays: "benefitDurationDays",
  benefit_duration_days: "benefitDurationDays",
  eliminationperioddays: "eliminationPeriodDays",
  elimination_period_days: "eliminationPeriodDays",
  // Coverage Scope
  insuredlives: "insuredLives",
  insured_lives: "insuredLives",
  dependentcoveragetype: "dependentCoverageType",
  dependent_coverage_type: "dependentCoverageType",
  maxdependentsperemployee: "maxDependentsPerEmployee",
  max_dependents_per_employee: "maxDependentsPerEmployee",
  coveragescope: "coverageScope",
  coverage_scope: "coverageScope",
  networktype: "networkType",
  network_type: "networkType",
  hospitallevel: "hospitalLevel",
  hospital_level: "hospitalLevel",
  // Regulatory & Tax
  mandatoryclassification: "mandatoryClassification",
  mandatory_classification: "mandatoryClassification",
  taxtreatment: "taxTreatment",
  tax_treatment: "taxTreatment",
  taxratepercent: "taxRatePercent",
  tax_rate_percent: "taxRatePercent",
  employeeeligibility: "employeeEligibility",
  employee_eligibility: "employeeEligibility",
  eligibilitynotes: "eligibilityNotes",
  eligibility_notes: "eligibilityNotes",
  // Carrier & Broker Detail
  carrierterminationnoticedays: "carrierTerminationNoticeDays",
  carrier_termination_notice_days: "carrierTerminationNoticeDays",
  brokercommissionpercent: "brokerCommissionPercent",
  broker_commission_percent: "brokerCommissionPercent",
  brokerfee: "brokerFee",
  broker_fee: "brokerFee",
  brokerfeecurrency: "brokerFeeCurrency",
  broker_fee_currency: "brokerFeeCurrency",
  // Multinational Pooling
  inmultinationalpool: "inMultinationalPool",
  in_multinational_pool: "inMultinationalPool",
  poolprovidername: "poolProviderName",
  pool_provider_name: "poolProviderName",
  // Bundling / Riders
  isrider: "isRider",
  is_rider: "isRider",
  parentbenefitentryid: "parentBenefitEntryId",
  parent_benefit_entry_id: "parentBenefitEntryId",
  riderdescription: "riderDescription",
  rider_description: "riderDescription",
  // Maternity Specific
  maternitynormaldelivery: "maternityNormalDelivery",
  maternity_normal_delivery: "maternityNormalDelivery",
  maternitycsection: "maternityCSection",
  maternity_c_section: "maternityCSection",
  maternitycurrency: "maternityCurrency",
  maternity_currency: "maternityCurrency",
  // Dental Specific
  dentalannualmax: "dentalAnnualMax",
  dental_annual_max: "dentalAnnualMax",
  dentalpreventivecoverage: "dentalPreventiveCoverage",
  dental_preventive_coverage: "dentalPreventiveCoverage",
  dentalmajorcoverage: "dentalMajorCoverage",
  dental_major_coverage: "dentalMajorCoverage",
  // Vision Specific
  visionannualmax: "visionAnnualMax",
  vision_annual_max: "visionAnnualMax",
  visionexamcovered: "visionExamCovered",
  vision_exam_covered: "visionExamCovered",
  // Policy Metadata
  policycontractlength: "policyContractLength",
  policy_contract_length: "policyContractLength",
  lastrenewaloutcome: "lastRenewalOutcome",
  last_renewal_outcome: "lastRenewalOutcome",
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
