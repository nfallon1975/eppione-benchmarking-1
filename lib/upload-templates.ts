/** All benefit columns in the template, in order */
const BENEFIT_COLUMNS: Record<string, string> = {
  country: "", benefitCategory: "", benefitName: "", coverLevel: "",
  isCore: "", employerFunded: "", isVoluntary: "", isFlexible: "",
  coversSpouse: "", coversDependents: "", costCurrency: "",
  annualCostPerEmployee: "", employeeContributionPercent: "",
  // Health
  healthExcess: "", healthCopayPercent: "", healthInpatientLimit: "", healthOutpatientLimit: "",
  // Life
  lifeCoverMultiple: "", lifeFixedCoverAmount: "", lifeFreeCoverLimit: "",
  // Income Protection
  ipBenefitPercent: "", ipWaitingPeriodWeeks: "", ipMaxBenefitAge: "",
  // Critical Illness
  ciCoverMultiple: "", ciFixedCoverAmount: "",
  // Dental
  dentalAnnualLimit: "", dentalOrthoIncluded: "",
  // Pension
  pensionEmployerPct: "", pensionEmployeePct: "",
  pensionContributionRateEmployer: "", pensionContributionRateEmployee: "",
  pensionPlanType: "", pensionDeathBenefitMultiple: "",
  // Annual Leave
  leaveDaysEntitlement: "", leaveIncludesPublicHolidays: "", leaveIncreasesWithTenure: "",
  leaveMaxDays: "", leaveBuySellDays: "", leaveCarryOverDays: "",
  leaveBirthdayOff: "", leaveVolunteerDays: "", leaveChristmasClosureDays: "",
  // Sick Pay
  sickPayFullPayWeeks: "", sickPayHalfPayWeeks: "", sickPayPartialPayPercent: "",
  sickPayWaitingDays: "", sickPayAboveStatutory: "",
  // Maternity Pay
  maternityFullPayWeeks: "", maternityPartialPayWeeks: "", maternityPartialPayPercent: "",
  maternityTotalLeaveWeeks: "", maternityAboveStatutory: "", maternityKitDays: "", maternityGradualReturn: "",
  // Paternity Pay
  paternityFullPayWeeks: "", paternityPartialPayWeeks: "", paternityPartialPayPercent: "",
  paternityTotalLeaveWeeks: "", paternityAboveStatutory: "", paternitySharedParentalLeave: "",
  // Meta
  provider: "", notes: "",
  // Plan Design
  deductibleAmount: "", deductibleCurrency: "", coPayPercent: "", coPayMaxAmount: "",
  sumInsured: "", sumInsuredCurrency: "", coverMultiple: "", coverMultipleBase: "",
  roomCategory: "", waitingPeriodDays: "", benefitMaxAnnual: "", benefitMaxCurrency: "",
  reimbursementPercent: "", benefitDurationDays: "", eliminationPeriodDays: "",
  // Coverage Scope
  insuredLives: "", dependentCoverageType: "", maxDependentsPerEmployee: "",
  coverageScope: "", networkType: "", hospitalLevel: "",
  // Regulatory & Tax
  mandatoryClassification: "", taxTreatment: "", taxRatePercent: "",
  employeeEligibility: "", eligibilityNotes: "",
  // Carrier & Broker Detail
  carrierTerminationNoticeDays: "", brokerCommissionPercent: "", brokerFee: "", brokerFeeCurrency: "",
  // Multinational Pooling
  inMultinationalPool: "", poolProviderName: "",
  // Bundling / Riders
  isRider: "", parentBenefitEntryId: "", riderDescription: "",
  // Maternity Specific
  maternityNormalDelivery: "", maternityCSection: "", maternityCurrency: "",
  // Dental Specific
  dentalAnnualMax: "", dentalPreventiveCoverage: "", dentalMajorCoverage: "",
  // Vision Specific
  visionAnnualMax: "", visionExamCovered: "",
  // Policy Metadata
  policyContractLength: "", lastRenewalOutcome: "",
};

export function getClientBenefitTemplate(): Record<string, string>[] {
  return [
    {
      ...BENEFIT_COLUMNS,
      country: "IE",
      benefitCategory: "HEALTH",
      benefitName: "Company Health Insurance",
      coverLevel: "Level 2 - Room + Semi-Private",
      isCore: "true",
      employerFunded: "true",
      coversSpouse: "true",
      coversDependents: "true",
      costCurrency: "EUR",
      annualCostPerEmployee: "2500",
      employeeContributionPercent: "25",
      healthExcess: "150",
      healthInpatientLimit: "1000000",
      healthOutpatientLimit: "15000",
      provider: "Laya Healthcare",
    },
    {
      ...BENEFIT_COLUMNS,
      country: "IE",
      benefitCategory: "PENSION",
      benefitName: "Company Pension Scheme",
      coverLevel: "Defined Contribution",
      isCore: "true",
      employerFunded: "true",
      costCurrency: "EUR",
      annualCostPerEmployee: "5000",
      employeeContributionPercent: "5",
      pensionEmployerPct: "6",
      pensionEmployeePct: "5",
      pensionContributionRateEmployer: "6",
      pensionContributionRateEmployee: "5",
      pensionPlanType: "DC",
      provider: "Irish Life",
      notes: "Auto-enrolment scheme",
    },
    {
      ...BENEFIT_COLUMNS,
      country: "IE",
      benefitCategory: "ANNUAL_LEAVE",
      benefitName: "Annual Leave Policy",
      coverLevel: "25 days + public holidays",
      isCore: "true",
      employerFunded: "true",
      leaveDaysEntitlement: "25",
      leaveIncreasesWithTenure: "true",
      leaveMaxDays: "30",
      leaveBuySellDays: "true",
      leaveCarryOverDays: "5",
      leaveBirthdayOff: "true",
      leaveVolunteerDays: "2",
      leaveChristmasClosureDays: "3",
    },
    {
      ...BENEFIT_COLUMNS,
      country: "IE",
      benefitCategory: "SICK_PAY",
      benefitName: "Company Sick Pay",
      coverLevel: "12 weeks full + 12 weeks half",
      isCore: "true",
      employerFunded: "true",
      sickPayFullPayWeeks: "12",
      sickPayHalfPayWeeks: "12",
      sickPayPartialPayPercent: "50",
      sickPayWaitingDays: "3",
      sickPayAboveStatutory: "true",
    },
    {
      ...BENEFIT_COLUMNS,
      country: "IE",
      benefitCategory: "MATERNITY_PAY",
      benefitName: "Enhanced Maternity Pay",
      coverLevel: "26 weeks full + 16 weeks partial",
      isCore: "true",
      employerFunded: "true",
      maternityFullPayWeeks: "26",
      maternityPartialPayWeeks: "16",
      maternityPartialPayPercent: "50",
      maternityTotalLeaveWeeks: "52",
      maternityAboveStatutory: "true",
      maternityKitDays: "10",
      maternityGradualReturn: "true",
    },
    {
      ...BENEFIT_COLUMNS,
      country: "IE",
      benefitCategory: "PATERNITY_PAY",
      benefitName: "Enhanced Paternity Pay",
      coverLevel: "4 weeks full pay",
      isCore: "true",
      employerFunded: "true",
      paternityFullPayWeeks: "4",
      paternityPartialPayWeeks: "2",
      paternityPartialPayPercent: "50",
      paternityTotalLeaveWeeks: "6",
      paternityAboveStatutory: "true",
      paternitySharedParentalLeave: "true",
    },
  ];
}

export function getBrokerClientTemplate(): Record<string, string>[] {
  const BROKER_COLS = { companyName: "", companyEmail: "", contactName: "", industry: "", employeeCount: "", employeeCountRange: "" };
  return [
    {
      ...BROKER_COLS, ...BENEFIT_COLUMNS,
      companyName: "Acme Corp", companyEmail: "hr@acmecorp.com", contactName: "Jane Smith",
      industry: "J62", employeeCount: "250", employeeCountRange: "251-1000",
      country: "IE", benefitCategory: "HEALTH", benefitName: "Group Health Insurance",
      coverLevel: "Level 2", isCore: "true", employerFunded: "true",
      coversSpouse: "true", coversDependents: "true", costCurrency: "EUR",
      annualCostPerEmployee: "2800", employeeContributionPercent: "20",
      healthExcess: "100", provider: "VHI",
    },
    {
      ...BROKER_COLS, ...BENEFIT_COLUMNS,
      companyName: "Acme Corp", companyEmail: "hr@acmecorp.com", contactName: "Jane Smith",
      industry: "J62", employeeCount: "250", employeeCountRange: "251-1000",
      country: "IE", benefitCategory: "ANNUAL_LEAVE", benefitName: "Annual Leave Policy",
      coverLevel: "25 days", isCore: "true", employerFunded: "true",
      leaveDaysEntitlement: "25", leaveIncreasesWithTenure: "true", leaveMaxDays: "30",
      leaveBuySellDays: "true", leaveCarryOverDays: "5", leaveBirthdayOff: "true",
    },
    {
      ...BROKER_COLS, ...BENEFIT_COLUMNS,
      companyName: "Beta Industries", companyEmail: "benefits@betaind.com", contactName: "John Doe",
      industry: "C21", employeeCount: "1200", employeeCountRange: "1001-5000",
      country: "GB", benefitCategory: "LIFE", benefitName: "Death in Service",
      coverLevel: "4x salary", isCore: "true", employerFunded: "true",
      costCurrency: "GBP", annualCostPerEmployee: "400",
      lifeCoverMultiple: "4", provider: "Aviva",
    },
    {
      ...BROKER_COLS, ...BENEFIT_COLUMNS,
      companyName: "Beta Industries", companyEmail: "benefits@betaind.com", contactName: "John Doe",
      industry: "C21", employeeCount: "1200", employeeCountRange: "1001-5000",
      country: "GB", benefitCategory: "SICK_PAY", benefitName: "Company Sick Pay",
      coverLevel: "26 weeks full + 26 weeks half", isCore: "true", employerFunded: "true",
      sickPayFullPayWeeks: "26", sickPayHalfPayWeeks: "26", sickPayPartialPayPercent: "50",
      sickPayAboveStatutory: "true",
    },
  ];
}

export function getAdminBenefitTemplate(): Record<string, string>[] {
  return [
    {
      companyName: "Acme Corp", ...BENEFIT_COLUMNS,
      country: "IE", benefitCategory: "HEALTH", benefitName: "Company Health Insurance",
      coverLevel: "Level 2 - Room + Semi-Private", isCore: "true", employerFunded: "true",
      coversSpouse: "true", coversDependents: "true", costCurrency: "EUR",
      annualCostPerEmployee: "2500", employeeContributionPercent: "25",
      healthExcess: "150", healthInpatientLimit: "1000000", healthOutpatientLimit: "15000",
      provider: "Laya Healthcare",
    },
    {
      companyName: "Beta Industries", ...BENEFIT_COLUMNS,
      country: "GB", benefitCategory: "LIFE", benefitName: "Death in Service",
      coverLevel: "4x salary", isCore: "true", employerFunded: "true",
      costCurrency: "GBP", annualCostPerEmployee: "400",
      lifeCoverMultiple: "4", provider: "Aviva",
    },
    {
      companyName: "Acme Corp", ...BENEFIT_COLUMNS,
      country: "IE", benefitCategory: "MATERNITY_PAY", benefitName: "Enhanced Maternity",
      coverLevel: "26 weeks full + 16 weeks partial", isCore: "true", employerFunded: "true",
      maternityFullPayWeeks: "26", maternityPartialPayWeeks: "16", maternityPartialPayPercent: "50",
      maternityTotalLeaveWeeks: "52", maternityAboveStatutory: "true", maternityKitDays: "10",
      maternityGradualReturn: "true",
    },
  ];
}

export function getAdminBrokerTemplate(): Record<string, string>[] {
  return [
    {
      email: "broker@insurancefirm.com",
      name: "Sarah O'Brien",
      companyName: "Insurance Firm Ltd",
      licenseNumber: "BRK-2024-001",
      countriesActive: "IE,GB",
    },
  ];
}

export function getAdminClientTemplate(): Record<string, string>[] {
  return [
    {
      email: "hr@newcompany.com",
      name: "Tom Murphy",
      companyName: "New Company Ltd",
      country: "IE",
      industry: "J62",
      employeeCount: "150",
      brokerEmail: "broker@insurancefirm.com",
    },
  ];
}
