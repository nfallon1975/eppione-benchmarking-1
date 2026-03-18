/**
 * Target fields dictionary for the AI column mapper.
 * Separated from ai-column-mapper.ts so it can be safely imported client-side.
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
