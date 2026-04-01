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

  // Plan Design (generic cross-category)
  { field: "deductibleAmount", label: "Deductible Amount", entity: "BENEFIT", type: "number", description: "Deductible/excess amount" },
  { field: "deductibleCurrency", label: "Deductible Currency", entity: "BENEFIT", type: "string", description: "Currency for deductible amount" },
  { field: "coPayPercent", label: "Co-Pay %", entity: "BENEFIT", type: "number", description: "Co-pay percentage (0-100)" },
  { field: "coPayMaxAmount", label: "Co-Pay Max Amount", entity: "BENEFIT", type: "number", description: "Maximum co-pay cap per claim/year" },
  { field: "sumInsured", label: "Sum Insured", entity: "BENEFIT", type: "number", description: "Total sum insured amount" },
  { field: "sumInsuredCurrency", label: "Sum Insured Currency", entity: "BENEFIT", type: "string", description: "Currency for sum insured" },
  { field: "coverMultiple", label: "Cover Multiple", entity: "BENEFIT", type: "number", description: "Cover as multiple of salary (e.g. 2.0 for 2x)" },
  { field: "coverMultipleBase", label: "Cover Multiple Base", entity: "BENEFIT", type: "string", description: "What the multiple is based on: BASIC_SALARY, ANNUAL_CTC, FIXED_AMOUNT" },
  { field: "roomCategory", label: "Room Category", entity: "BENEFIT", type: "string", category: "HEALTH", description: "Room type: PRIVATE, SEMI_PRIVATE, STANDARD, NA" },
  { field: "waitingPeriodDays", label: "Waiting Period (days)", entity: "BENEFIT", type: "number", description: "Waiting period in days before cover starts" },
  { field: "benefitMaxAnnual", label: "Annual Benefit Maximum", entity: "BENEFIT", type: "number", description: "Annual maximum benefit amount" },
  { field: "benefitMaxCurrency", label: "Benefit Max Currency", entity: "BENEFIT", type: "string", description: "Currency for annual benefit maximum" },
  { field: "reimbursementPercent", label: "Reimbursement %", entity: "BENEFIT", type: "number", description: "Reimbursement rate (e.g. 80 for 80%)" },
  { field: "benefitDurationDays", label: "Benefit Duration (days)", entity: "BENEFIT", type: "number", description: "Maximum benefit duration in days" },
  { field: "eliminationPeriodDays", label: "Elimination Period (days)", entity: "BENEFIT", type: "number", category: "INCOME_PROTECTION", description: "Elimination/qualifying period for income protection" },

  // Coverage Scope
  { field: "insuredLives", label: "Insured Lives", entity: "BENEFIT", type: "number", description: "Total insured lives including dependents" },
  { field: "dependentCoverageType", label: "Dependent Coverage Type", entity: "BENEFIT", type: "string", description: "NONE, SPOUSE_ONLY, FAMILY, CHILDREN_ONLY" },
  { field: "maxDependentsPerEmployee", label: "Max Dependents Per Employee", entity: "BENEFIT", type: "number", description: "Maximum dependents per employee (null = unlimited)" },
  { field: "coverageScope", label: "Coverage Scope", entity: "BENEFIT", type: "string", description: "LOCAL, NATIONAL, REGIONAL, WORLDWIDE" },
  { field: "networkType", label: "Network Type", entity: "BENEFIT", type: "string", category: "HEALTH", description: "PANEL, NON_PANEL, BOTH, OPEN_ACCESS" },
  { field: "hospitalLevel", label: "Hospital Level", entity: "BENEFIT", type: "string", category: "HEALTH", description: "EXECUTIVE, PRIVATE, SEMI_PRIVATE, STANDARD, ANY" },

  // Regulatory & Tax
  { field: "mandatoryClassification", label: "Mandatory Classification", entity: "BENEFIT", type: "string", description: "MANDATORY, SUPPLEMENTAL, HYBRID" },
  { field: "taxTreatment", label: "Tax Treatment", entity: "BENEFIT", type: "string", description: "INCLUDES_TAX, EXCLUDES_TAX, TAX_EXEMPT" },
  { field: "taxRatePercent", label: "Tax Rate %", entity: "BENEFIT", type: "number", description: "Local tax rate on premiums" },
  { field: "employeeEligibility", label: "Employee Eligibility", entity: "BENEFIT", type: "string", description: "ALL_EMPLOYEES, MANAGERS_ONLY, DIRECTORS_ONLY, CUSTOM" },
  { field: "eligibilityNotes", label: "Eligibility Notes", entity: "BENEFIT", type: "string", description: "Free text eligibility notes" },

  // Carrier & Broker Detail
  { field: "carrierTerminationNoticeDays", label: "Carrier Termination Notice (days)", entity: "BENEFIT", type: "number", description: "Notice period to switch carrier in days" },
  { field: "brokerCommissionPercent", label: "Broker Commission %", entity: "BENEFIT", type: "number", description: "Broker commission rate percentage" },
  { field: "brokerFee", label: "Broker Fee", entity: "BENEFIT", type: "number", description: "Broker fee excluding commission" },
  { field: "brokerFeeCurrency", label: "Broker Fee Currency", entity: "BENEFIT", type: "string", description: "Currency for broker fee" },

  // Multinational Pooling
  { field: "inMultinationalPool", label: "In Multinational Pool", entity: "BENEFIT", type: "boolean", description: "Whether benefit is in a multinational pooling arrangement" },
  { field: "poolProviderName", label: "Pool Provider Name", entity: "BENEFIT", type: "string", description: "Multinational pool provider (e.g. Swiss Re Network)" },

  // Bundling / Riders
  { field: "isRider", label: "Is Rider", entity: "BENEFIT", type: "boolean", description: "Whether this benefit is a rider on another policy" },
  { field: "parentBenefitEntryId", label: "Parent Benefit Entry ID", entity: "BENEFIT", type: "string", description: "ID of parent benefit if this is a rider" },
  { field: "riderDescription", label: "Rider Description", entity: "BENEFIT", type: "string", description: "Description of rider (e.g. TPD & Accident rider on Life policy)" },

  // Maternity Specific
  { field: "maternityNormalDelivery", label: "Maternity Normal Delivery Cover", entity: "BENEFIT", type: "number", category: "MATERNITY_PAY", description: "Cover amount for normal delivery" },
  { field: "maternityCSection", label: "Maternity C-Section Cover", entity: "BENEFIT", type: "number", category: "MATERNITY_PAY", description: "Cover amount for C-section" },
  { field: "maternityCurrency", label: "Maternity Cover Currency", entity: "BENEFIT", type: "string", category: "MATERNITY_PAY", description: "Currency for maternity cover amounts" },

  // Dental Specific
  { field: "dentalAnnualMax", label: "Dental Annual Max", entity: "BENEFIT", type: "number", category: "DENTAL", description: "Annual dental maximum benefit" },
  { field: "dentalPreventiveCoverage", label: "Dental Preventive Coverage", entity: "BENEFIT", type: "boolean", category: "DENTAL", description: "Whether cleanings and checkups are covered" },
  { field: "dentalMajorCoverage", label: "Dental Major Coverage", entity: "BENEFIT", type: "boolean", category: "DENTAL", description: "Whether crowns, root canals, orthodontics are covered" },

  // Vision Specific
  { field: "visionAnnualMax", label: "Vision Annual Max", entity: "BENEFIT", type: "number", description: "Annual vision benefit maximum" },
  { field: "visionExamCovered", label: "Vision Exam Covered", entity: "BENEFIT", type: "boolean", description: "Whether vision exams are covered" },

  // Policy Metadata
  { field: "policyContractLength", label: "Policy Contract Length (years)", entity: "BENEFIT", type: "number", description: "Contract length in years" },
  { field: "lastRenewalOutcome", label: "Last Renewal Outcome", entity: "BENEFIT", type: "string", description: "RENEWED_AS_IS, RENEWED_WITH_CHANGES, REMARKET, NEW_PLACEMENT" },

  // Platform
  { field: "usesPlatform", label: "Uses Benefits Platform", entity: "PLATFORM", type: "boolean", description: "Whether company uses a benefits platform" },
  { field: "platformName", label: "Platform Name", entity: "PLATFORM", type: "string", description: "Benefits platform provider name" },
  { field: "annualPlatformFee", label: "Platform Fee", entity: "PLATFORM", type: "number", description: "Annual platform fee per employee" },
] as const;

export type TargetField = (typeof TARGET_FIELDS)[number];
