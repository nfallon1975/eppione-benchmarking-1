import { PrismaClient, BenefitCategory } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const countryConfigs = [
  {
    countryCode: "IE",
    countryName: "Ireland",
    currency: "EUR",
    availableBenefitCategories: [
      BenefitCategory.HEALTH,
      BenefitCategory.LIFE,
      BenefitCategory.DISABILITY,
      BenefitCategory.PENSION,
      BenefitCategory.DENTAL,
      BenefitCategory.VISION,
      BenefitCategory.EAP,
      BenefitCategory.WELLNESS,
      BenefitCategory.INCOME_PROTECTION,
      BenefitCategory.CRITICAL_ILLNESS,
      BenefitCategory.TRAVEL,
      BenefitCategory.CHILDCARE,
      BenefitCategory.EDUCATION,
    ],
    regulatoryNotes:
      "Employer pension contributions subject to Revenue limits. Health insurance BIK applies unless employer pays. Income protection taxed as income when claimed. Tax-saver commuter schemes available for transport.",
  },
  {
    countryCode: "GB",
    countryName: "United Kingdom",
    currency: "GBP",
    availableBenefitCategories: [
      BenefitCategory.HEALTH,
      BenefitCategory.LIFE,
      BenefitCategory.DISABILITY,
      BenefitCategory.PENSION,
      BenefitCategory.DENTAL,
      BenefitCategory.VISION,
      BenefitCategory.EAP,
      BenefitCategory.WELLNESS,
      BenefitCategory.INCOME_PROTECTION,
      BenefitCategory.CRITICAL_ILLNESS,
      BenefitCategory.TRAVEL,
      BenefitCategory.CHILDCARE,
      BenefitCategory.EDUCATION,
    ],
    regulatoryNotes:
      "Auto-enrolment pension minimum 8% (3% employer, 5% employee). PMI is a P11D benefit. Salary sacrifice arrangements available for pensions, cycle-to-work, EVs. Death in service typically 2-4x salary.",
  },
  {
    countryCode: "FR",
    countryName: "France",
    currency: "EUR",
    availableBenefitCategories: [
      BenefitCategory.HEALTH,
      BenefitCategory.LIFE,
      BenefitCategory.DISABILITY,
      BenefitCategory.PENSION,
      BenefitCategory.DENTAL,
      BenefitCategory.VISION,
      BenefitCategory.EAP,
      BenefitCategory.WELLNESS,
      BenefitCategory.MEAL_VOUCHERS,
      BenefitCategory.TRANSPORT,
      BenefitCategory.CHILDCARE,
      BenefitCategory.EDUCATION,
    ],
    regulatoryNotes:
      "Mutuelle (top-up health insurance) mandatory since ANI 2016 - minimum 50% employer funded. Prévoyance mandatory for cadres. Meal vouchers (Tickets Restaurant) 50-60% employer funded. 50% transport reimbursement mandatory. Profit-sharing (intéressement/participation) required for companies >50 employees.",
  },
  {
    countryCode: "ES",
    countryName: "Spain",
    currency: "EUR",
    availableBenefitCategories: [
      BenefitCategory.HEALTH,
      BenefitCategory.LIFE,
      BenefitCategory.DISABILITY,
      BenefitCategory.PENSION,
      BenefitCategory.DENTAL,
      BenefitCategory.VISION,
      BenefitCategory.EAP,
      BenefitCategory.WELLNESS,
      BenefitCategory.MEAL_VOUCHERS,
      BenefitCategory.TRANSPORT,
      BenefitCategory.CHILDCARE,
      BenefitCategory.EDUCATION,
    ],
    regulatoryNotes:
      "Private health insurance (seguro médico) common supplement to public healthcare. Flexible remuneration (retribución flexible) allows tax-efficient benefits up to 30% of salary. Meal vouchers tax-exempt up to €11/day. Childcare vouchers tax-exempt up to €0-3 years.",
  },
  {
    countryCode: "PT",
    countryName: "Portugal",
    currency: "EUR",
    availableBenefitCategories: [
      BenefitCategory.HEALTH,
      BenefitCategory.LIFE,
      BenefitCategory.DISABILITY,
      BenefitCategory.PENSION,
      BenefitCategory.DENTAL,
      BenefitCategory.VISION,
      BenefitCategory.EAP,
      BenefitCategory.WELLNESS,
      BenefitCategory.MEAL_VOUCHERS,
      BenefitCategory.TRANSPORT,
      BenefitCategory.EDUCATION,
    ],
    regulatoryNotes:
      "Meal allowance (subsídio de alimentação) tax-exempt up to €6/day cash or €9.60/day card. Private health insurance increasingly common. PPR (retirement savings plans) available with tax incentives. Social security contributions at 23.75% employer, 11% employee.",
  },
  {
    countryCode: "US",
    countryName: "United States",
    currency: "USD",
    availableBenefitCategories: [
      BenefitCategory.HEALTH,
      BenefitCategory.LIFE,
      BenefitCategory.DISABILITY,
      BenefitCategory.PENSION,
      BenefitCategory.DENTAL,
      BenefitCategory.VISION,
      BenefitCategory.EAP,
      BenefitCategory.WELLNESS,
      BenefitCategory.CRITICAL_ILLNESS,
      BenefitCategory.CHILDCARE,
      BenefitCategory.EDUCATION,
      BenefitCategory.TRANSPORT,
    ],
    regulatoryNotes:
      "ACA requires employers with 50+ FTEs to offer affordable health coverage. 401(k) match common (typically 3-6%). COBRA continuation coverage required. FSA/HSA tax-advantaged accounts available. FMLA provides 12 weeks unpaid leave. State-level mandates vary significantly (e.g., CA, NY paid family leave).",
  },
  {
    countryCode: "DE",
    countryName: "Germany",
    currency: "EUR",
    availableBenefitCategories: [
      BenefitCategory.HEALTH,
      BenefitCategory.LIFE,
      BenefitCategory.DISABILITY,
      BenefitCategory.PENSION,
      BenefitCategory.DENTAL,
      BenefitCategory.VISION,
      BenefitCategory.EAP,
      BenefitCategory.WELLNESS,
      BenefitCategory.MEAL_VOUCHERS,
      BenefitCategory.TRANSPORT,
      BenefitCategory.CHILDCARE,
      BenefitCategory.EDUCATION,
    ],
    regulatoryNotes:
      "Betriebliche Altersvorsorge (bAV) - employer must offer salary conversion for pension. Statutory health insurance mandatory up to income threshold (Versicherungspflichtgrenze). €50/month tax-free benefit allowance (sachbezug). Job ticket (Jobticket) for public transport tax-advantaged. VWL (capital-forming benefits) common.",
  },
  {
    countryCode: "NL",
    countryName: "Netherlands",
    currency: "EUR",
    availableBenefitCategories: [
      BenefitCategory.HEALTH,
      BenefitCategory.LIFE,
      BenefitCategory.DISABILITY,
      BenefitCategory.PENSION,
      BenefitCategory.DENTAL,
      BenefitCategory.VISION,
      BenefitCategory.EAP,
      BenefitCategory.WELLNESS,
      BenefitCategory.TRANSPORT,
      BenefitCategory.CHILDCARE,
      BenefitCategory.EDUCATION,
    ],
    regulatoryNotes:
      "Pension via industry-wide funds (bedrijfstakpensioenfonds) often mandatory. Holiday allowance (8% of salary) statutory. 30% ruling for expats. Commuter allowance at €0.23/km tax-free. WGA-hiaat insurance common for disability gap coverage. Collective health insurance discounts typical.",
  },
  {
    countryCode: "AE",
    countryName: "United Arab Emirates",
    currency: "AED",
    availableBenefitCategories: [
      BenefitCategory.HEALTH,
      BenefitCategory.LIFE,
      BenefitCategory.DISABILITY,
      BenefitCategory.DENTAL,
      BenefitCategory.VISION,
      BenefitCategory.EAP,
      BenefitCategory.WELLNESS,
      BenefitCategory.TRAVEL,
      BenefitCategory.EDUCATION,
      BenefitCategory.TRANSPORT,
      BenefitCategory.CHILDCARE,
    ],
    regulatoryNotes:
      "Health insurance mandatory in Abu Dhabi and Dubai (employer funded). End of service gratuity (EOSB) statutory - 21 days per year for first 5 years, 30 days thereafter. No income tax. Education allowance common for expats. Housing and transport allowances are standard components. DIFC/ADGM have separate employment regulations.",
  },
  {
    countryCode: "SG",
    countryName: "Singapore",
    currency: "SGD",
    availableBenefitCategories: [
      BenefitCategory.HEALTH,
      BenefitCategory.LIFE,
      BenefitCategory.DISABILITY,
      BenefitCategory.PENSION,
      BenefitCategory.DENTAL,
      BenefitCategory.VISION,
      BenefitCategory.EAP,
      BenefitCategory.WELLNESS,
      BenefitCategory.CRITICAL_ILLNESS,
      BenefitCategory.TRAVEL,
      BenefitCategory.EDUCATION,
      BenefitCategory.CHILDCARE,
    ],
    regulatoryNotes:
      "CPF contributions mandatory (employer 17%, employee 20% for <55). Group hospitalisation & surgical (GHS) insurance standard. Foreign worker levy applies for work permit holders. Flexible benefits platforms increasingly popular. AWS (Annual Wage Supplement / 13th month) common but not mandatory.",
  },
  {
    countryCode: "AU",
    countryName: "Australia",
    currency: "AUD",
    availableBenefitCategories: [
      BenefitCategory.HEALTH,
      BenefitCategory.LIFE,
      BenefitCategory.DISABILITY,
      BenefitCategory.PENSION,
      BenefitCategory.DENTAL,
      BenefitCategory.VISION,
      BenefitCategory.EAP,
      BenefitCategory.WELLNESS,
      BenefitCategory.INCOME_PROTECTION,
      BenefitCategory.CRITICAL_ILLNESS,
      BenefitCategory.CHILDCARE,
      BenefitCategory.EDUCATION,
    ],
    regulatoryNotes:
      "Superannuation Guarantee at 11.5% (rising to 12% by 2025-26). Salary sacrifice for super tax-effective. Private health insurance incentivised via Medicare Levy Surcharge. FBT (Fringe Benefits Tax) at 47% on grossed-up value. Novated leasing popular for vehicles. Income protection and TPD insurance commonly bundled with super.",
  },
];

// ─── Additional Companies ───────────────────────────────────────────

interface SeedCompany {
  id: string;
  name: string;
  country: string;
  industry: string;
  employeeCount: number;
  employeeCountRange: string;
  averageSalary: number;
  averageSalaryCurrency: string;
  averageBonusPercent: number;
  surveyCompletedAt: Date;
}

interface SeedBenefit {
  benefitCategory: BenefitCategory;
  country: string;
  benefitName: string;
  coverLevel: string;
  employerFunded: boolean;
  employeeContributionPercent?: number | null;
  coversSpouse?: boolean;
  coversDependents?: boolean;
  isCore?: boolean;
  isVoluntary?: boolean;
  isFlexible?: boolean;
  provider?: string;
  annualCostPerEmployee: number;
  costCurrency: string;
  // Health detail fields (existing)
  healthExcess?: number;
  healthExcessCurrency?: string;
  healthCopayPercent?: number;
  healthInpatientLimit?: number;
  healthOutpatientLimit?: number;
  healthLimitCurrency?: string;
  // Life Insurance
  lifeCoverMultiple?: number;
  lifeFixedCoverAmount?: number;
  lifeCoverAmountCurrency?: string;
  lifeFreeCoverLimit?: number;
  // Income Protection
  ipBenefitPercent?: number;
  ipWaitingPeriodWeeks?: number;
  ipMaxBenefitAge?: number;
  // Critical Illness
  ciCoverMultiple?: number;
  ciFixedCoverAmount?: number;
  ciCoverAmountCurrency?: string;
  // Dental
  dentalAnnualLimit?: number;
  dentalAnnualLimitCurrency?: string;
  dentalOrthoIncluded?: boolean;
  // Pension
  pensionEmployerPct?: number;
  pensionEmployeePct?: number;
}

interface SeedPlatform {
  usesPlatform: boolean;
  platformName?: string;
  platformType?: "FLEX_BENEFITS" | "TOTAL_REWARD" | "VOLUNTARY" | "DISCOUNT" | "WELLBEING" | "OTHER";
  annualPlatformFee?: number;
  feeCurrency?: string;
  feeModel?: "PER_EMPLOYEE_PER_MONTH" | "PER_EMPLOYEE_PER_YEAR" | "FLAT_FEE" | "PERCENTAGE" | "OTHER";
  platformSatisfactionScore?: number;
}

const seedCompanies: {
  company: SeedCompany;
  benefits: SeedBenefit[];
  platform: SeedPlatform;
  userEmail: string;
  userName: string;
  countryProfiles?: { country: string; employeeCountRange: string; averageSalary: number; averageSalaryCurrency: string; averageBonusPercent: number }[];
}[] = [
  // ── IE Company 3 ──
  {
    company: {
      id: "demo-company-3",
      name: "FinServe Ireland",
      country: "IE",
      industry: "K64",
      employeeCount: 500,
      employeeCountRange: "251-1000",
      averageSalary: 78000,
      averageSalaryCurrency: "EUR",
      averageBonusPercent: 15,
      surveyCompletedAt: new Date("2026-01-10"),
    },
    benefits: [
      { benefitCategory: BenefitCategory.HEALTH, country: "IE", benefitName: "PMI", coverLevel: "Full private room", employerFunded: true, coversSpouse: true, coversDependents: true, provider: "Laya Healthcare", annualCostPerEmployee: 2800, costCurrency: "EUR", healthExcess: 100, healthExcessCurrency: "EUR", healthCopayPercent: 0, healthInpatientLimit: 5000000, healthOutpatientLimit: 100000, healthLimitCurrency: "EUR" },
      { benefitCategory: BenefitCategory.LIFE, country: "IE", benefitName: "Death in Service", coverLevel: "4x salary", employerFunded: true, provider: "Irish Life", annualCostPerEmployee: 420, costCurrency: "EUR", lifeCoverMultiple: 4, lifeFreeCoverLimit: 500000, lifeCoverAmountCurrency: "EUR" },
      { benefitCategory: BenefitCategory.PENSION, country: "IE", benefitName: "DC Pension", coverLevel: "7% employer match", employerFunded: true, employeeContributionPercent: 5, provider: "Irish Life", annualCostPerEmployee: 5460, costCurrency: "EUR", pensionEmployerPct: 7, pensionEmployeePct: 5 },
      { benefitCategory: BenefitCategory.INCOME_PROTECTION, country: "IE", benefitName: "Income Protection", coverLevel: "75% of salary", employerFunded: true, provider: "Aviva", annualCostPerEmployee: 950, costCurrency: "EUR", ipBenefitPercent: 75, ipWaitingPeriodWeeks: 13, ipMaxBenefitAge: 65 },
      { benefitCategory: BenefitCategory.EAP, country: "IE", benefitName: "EAP", coverLevel: "Unlimited sessions", employerFunded: true, provider: "Spectrum.Life", annualCostPerEmployee: 40, costCurrency: "EUR" },
      { benefitCategory: BenefitCategory.DENTAL, country: "IE", benefitName: "Dental Plan", coverLevel: "€1000 annual limit", employerFunded: true, provider: "DeCare Dental", annualCostPerEmployee: 450, costCurrency: "EUR", dentalAnnualLimit: 1000, dentalAnnualLimitCurrency: "EUR", dentalOrthoIncluded: false },
      { benefitCategory: BenefitCategory.WELLNESS, country: "IE", benefitName: "Wellness Programme", coverLevel: "€600 annual allowance", employerFunded: true, annualCostPerEmployee: 600, costCurrency: "EUR" },
    ],
    platform: { usesPlatform: true, platformName: "Mercer Marsh Benefits", platformType: "FLEX_BENEFITS", annualPlatformFee: 25000, feeCurrency: "EUR", feeModel: "PER_EMPLOYEE_PER_YEAR", platformSatisfactionScore: 8 },
    userEmail: "hr@finserve.ie",
    userName: "Sarah O'Brien",
  },
  // ── IE Company 4 ──
  {
    company: {
      id: "demo-company-4",
      name: "MedTech Solutions",
      country: "IE",
      industry: "C21",
      employeeCount: 180,
      employeeCountRange: "51-250",
      averageSalary: 70000,
      averageSalaryCurrency: "EUR",
      averageBonusPercent: 10,
      surveyCompletedAt: new Date("2026-01-15"),
    },
    benefits: [
      { benefitCategory: BenefitCategory.HEALTH, country: "IE", benefitName: "Group Health", coverLevel: "Semi-private", employerFunded: true, coversSpouse: true, coversDependents: false, provider: "VHI", annualCostPerEmployee: 2200, costCurrency: "EUR", healthExcess: 300, healthExcessCurrency: "EUR", healthCopayPercent: 25, healthInpatientLimit: 750000, healthOutpatientLimit: 30000, healthLimitCurrency: "EUR" },
      { benefitCategory: BenefitCategory.LIFE, country: "IE", benefitName: "Life Cover", coverLevel: "3x salary", employerFunded: true, provider: "Zurich", annualCostPerEmployee: 300, costCurrency: "EUR", lifeCoverMultiple: 3, lifeFreeCoverLimit: 300000, lifeCoverAmountCurrency: "EUR" },
      { benefitCategory: BenefitCategory.PENSION, country: "IE", benefitName: "Pension", coverLevel: "5% employer", employerFunded: true, employeeContributionPercent: 5, provider: "Zurich", annualCostPerEmployee: 3500, costCurrency: "EUR", pensionEmployerPct: 5, pensionEmployeePct: 5 },
      { benefitCategory: BenefitCategory.EAP, country: "IE", benefitName: "EAP", coverLevel: "8 sessions", employerFunded: true, provider: "VHI EAP", annualCostPerEmployee: 30, costCurrency: "EUR" },
      { benefitCategory: BenefitCategory.INCOME_PROTECTION, country: "IE", benefitName: "IP Cover", coverLevel: "66% of salary", employerFunded: true, provider: "Irish Life", annualCostPerEmployee: 720, costCurrency: "EUR", ipBenefitPercent: 66, ipWaitingPeriodWeeks: 26, ipMaxBenefitAge: 65 },
    ],
    platform: { usesPlatform: false },
    userEmail: "hr@medtech.ie",
    userName: "Mark Byrne",
  },
  // ── IE Company 5 ──
  {
    company: {
      id: "demo-company-5",
      name: "GreenEnergy Ireland",
      country: "IE",
      industry: "D35",
      employeeCount: 120,
      employeeCountRange: "51-250",
      averageSalary: 62000,
      averageSalaryCurrency: "EUR",
      averageBonusPercent: 8,
      surveyCompletedAt: new Date("2026-01-20"),
    },
    benefits: [
      { benefitCategory: BenefitCategory.HEALTH, country: "IE", benefitName: "Health Insurance", coverLevel: "Semi-private", employerFunded: true, coversSpouse: false, coversDependents: false, provider: "Irish Life Health", annualCostPerEmployee: 1900, costCurrency: "EUR", healthExcess: 500, healthExcessCurrency: "EUR", healthCopayPercent: 30, healthInpatientLimit: 500000, healthOutpatientLimit: 20000, healthLimitCurrency: "EUR" },
      { benefitCategory: BenefitCategory.PENSION, country: "IE", benefitName: "Pension", coverLevel: "4% employer", employerFunded: true, employeeContributionPercent: 4, provider: "Aviva", annualCostPerEmployee: 2480, costCurrency: "EUR", pensionEmployerPct: 4, pensionEmployeePct: 4 },
      { benefitCategory: BenefitCategory.LIFE, country: "IE", benefitName: "Death in Service", coverLevel: "2x salary", employerFunded: true, provider: "Aviva", annualCostPerEmployee: 200, costCurrency: "EUR", lifeCoverMultiple: 2, lifeFreeCoverLimit: 200000, lifeCoverAmountCurrency: "EUR" },
      { benefitCategory: BenefitCategory.EAP, country: "IE", benefitName: "EAP", coverLevel: "6 sessions", employerFunded: true, annualCostPerEmployee: 28, costCurrency: "EUR" },
      { benefitCategory: BenefitCategory.TRANSPORT, country: "IE", benefitName: "Tax Saver Commuter", coverLevel: "Bus/Rail pass", employerFunded: false, employeeContributionPercent: 100, isVoluntary: true, isCore: false, annualCostPerEmployee: 0, costCurrency: "EUR" },
    ],
    platform: { usesPlatform: false },
    userEmail: "hr@greenenergy.ie",
    userName: "Emma Walsh",
  },
  // ── IE Company 6 ──
  {
    company: {
      id: "demo-company-6",
      name: "Dublin Consulting Group",
      country: "IE",
      industry: "M70",
      employeeCount: 350,
      employeeCountRange: "251-1000",
      averageSalary: 85000,
      averageSalaryCurrency: "EUR",
      averageBonusPercent: 20,
      surveyCompletedAt: new Date("2026-01-22"),
    },
    benefits: [
      { benefitCategory: BenefitCategory.HEALTH, country: "IE", benefitName: "PMI Premium", coverLevel: "Full private room", employerFunded: true, coversSpouse: true, coversDependents: true, provider: "Laya Healthcare", annualCostPerEmployee: 3200, costCurrency: "EUR", healthExcess: 200, healthExcessCurrency: "EUR", healthCopayPercent: 15, healthInpatientLimit: 3000000, healthOutpatientLimit: 80000, healthLimitCurrency: "EUR" },
      { benefitCategory: BenefitCategory.LIFE, country: "IE", benefitName: "Death in Service", coverLevel: "4x salary", employerFunded: true, provider: "Zurich", annualCostPerEmployee: 480, costCurrency: "EUR", lifeCoverMultiple: 4, lifeFreeCoverLimit: 600000, lifeCoverAmountCurrency: "EUR" },
      { benefitCategory: BenefitCategory.PENSION, country: "IE", benefitName: "Pension", coverLevel: "8% employer", employerFunded: true, employeeContributionPercent: 5, provider: "Irish Life", annualCostPerEmployee: 6800, costCurrency: "EUR", pensionEmployerPct: 8, pensionEmployeePct: 5 },
      { benefitCategory: BenefitCategory.INCOME_PROTECTION, country: "IE", benefitName: "IP", coverLevel: "75% of salary", employerFunded: true, provider: "Zurich", annualCostPerEmployee: 1100, costCurrency: "EUR", ipBenefitPercent: 75, ipWaitingPeriodWeeks: 13, ipMaxBenefitAge: 65 },
      { benefitCategory: BenefitCategory.EAP, country: "IE", benefitName: "EAP", coverLevel: "Unlimited", employerFunded: true, provider: "Spectrum.Life", annualCostPerEmployee: 42, costCurrency: "EUR" },
      { benefitCategory: BenefitCategory.DENTAL, country: "IE", benefitName: "Dental", coverLevel: "€1500 limit", employerFunded: true, provider: "DeCare Dental", annualCostPerEmployee: 520, costCurrency: "EUR", dentalAnnualLimit: 1500, dentalAnnualLimitCurrency: "EUR", dentalOrthoIncluded: true },
      { benefitCategory: BenefitCategory.WELLNESS, country: "IE", benefitName: "Wellbeing", coverLevel: "€800 allowance", employerFunded: true, annualCostPerEmployee: 800, costCurrency: "EUR" },
      { benefitCategory: BenefitCategory.CRITICAL_ILLNESS, country: "IE", benefitName: "Critical Illness", coverLevel: "€100k lump sum", employerFunded: true, provider: "Aviva", annualCostPerEmployee: 380, costCurrency: "EUR", ciFixedCoverAmount: 100000, ciCoverAmountCurrency: "EUR" },
    ],
    platform: { usesPlatform: true, platformName: "Benefex OneHub", platformType: "FLEX_BENEFITS", annualPlatformFee: 30000, feeCurrency: "EUR", feeModel: "PER_EMPLOYEE_PER_YEAR", platformSatisfactionScore: 9 },
    userEmail: "hr@dcg.ie",
    userName: "Aoife Kelly",
  },
  // ── IE Company 7 (J62 - Software) ──
  {
    company: {
      id: "demo-company-ie-j62-1",
      name: "CloudNine Technologies",
      country: "IE",
      industry: "J62",
      employeeCount: 150,
      employeeCountRange: "51-250",
      averageSalary: 68000,
      averageSalaryCurrency: "EUR",
      averageBonusPercent: 10,
      surveyCompletedAt: new Date("2026-01-14"),
    },
    benefits: [
      { benefitCategory: BenefitCategory.HEALTH, country: "IE", benefitName: "Group Health Insurance", coverLevel: "Semi-private room", employerFunded: true, coversSpouse: true, coversDependents: true, provider: "VHI", annualCostPerEmployee: 2350, costCurrency: "EUR", healthExcess: 300, healthExcessCurrency: "EUR", healthCopayPercent: 15, healthInpatientLimit: 1500000, healthOutpatientLimit: 45000, healthLimitCurrency: "EUR" },
      { benefitCategory: BenefitCategory.LIFE, country: "IE", benefitName: "Death in Service", coverLevel: "3x salary", employerFunded: true, provider: "Irish Life", annualCostPerEmployee: 290, costCurrency: "EUR", lifeCoverMultiple: 3, lifeFreeCoverLimit: 350000, lifeCoverAmountCurrency: "EUR" },
      { benefitCategory: BenefitCategory.PENSION, country: "IE", benefitName: "DC Pension", coverLevel: "5% employer", employerFunded: true, employeeContributionPercent: 5, provider: "Zurich", annualCostPerEmployee: 3400, costCurrency: "EUR", pensionEmployerPct: 5, pensionEmployeePct: 5 },
      { benefitCategory: BenefitCategory.INCOME_PROTECTION, country: "IE", benefitName: "Income Protection", coverLevel: "66% of salary", employerFunded: true, provider: "Aviva", annualCostPerEmployee: 700, costCurrency: "EUR", ipBenefitPercent: 66, ipWaitingPeriodWeeks: 26, ipMaxBenefitAge: 65 },
      { benefitCategory: BenefitCategory.EAP, country: "IE", benefitName: "EAP", coverLevel: "8 sessions", employerFunded: true, provider: "Spectrum.Life", annualCostPerEmployee: 32, costCurrency: "EUR" },
      { benefitCategory: BenefitCategory.WELLNESS, country: "IE", benefitName: "Wellness Allowance", coverLevel: "€400 annual", employerFunded: true, annualCostPerEmployee: 400, costCurrency: "EUR" },
    ],
    platform: { usesPlatform: false },
    userEmail: "hr@cloudnine.ie",
    userName: "Siobhan Healy",
  },
  // ── IE Company 8 (J62 - Software) ──
  {
    company: {
      id: "demo-company-ie-j62-2",
      name: "DataStream Analytics",
      country: "IE",
      industry: "J62",
      employeeCount: 320,
      employeeCountRange: "251-1000",
      averageSalary: 78000,
      averageSalaryCurrency: "EUR",
      averageBonusPercent: 14,
      surveyCompletedAt: new Date("2026-01-18"),
    },
    benefits: [
      { benefitCategory: BenefitCategory.HEALTH, country: "IE", benefitName: "PMI Premium", coverLevel: "Full private room", employerFunded: true, coversSpouse: true, coversDependents: true, provider: "Laya Healthcare", annualCostPerEmployee: 3050, costCurrency: "EUR", healthExcess: 200, healthExcessCurrency: "EUR", healthCopayPercent: 10, healthInpatientLimit: 2500000, healthOutpatientLimit: 80000, healthLimitCurrency: "EUR" },
      { benefitCategory: BenefitCategory.LIFE, country: "IE", benefitName: "Death in Service", coverLevel: "4x salary", employerFunded: true, provider: "Zurich", annualCostPerEmployee: 420, costCurrency: "EUR", lifeCoverMultiple: 4, lifeFreeCoverLimit: 500000, lifeCoverAmountCurrency: "EUR" },
      { benefitCategory: BenefitCategory.PENSION, country: "IE", benefitName: "Group Pension", coverLevel: "7% employer", employerFunded: true, employeeContributionPercent: 5, provider: "Irish Life", annualCostPerEmployee: 5460, costCurrency: "EUR", pensionEmployerPct: 7, pensionEmployeePct: 5 },
      { benefitCategory: BenefitCategory.INCOME_PROTECTION, country: "IE", benefitName: "IP Cover", coverLevel: "75% of salary", employerFunded: true, provider: "Irish Life", annualCostPerEmployee: 920, costCurrency: "EUR", ipBenefitPercent: 75, ipWaitingPeriodWeeks: 13, ipMaxBenefitAge: 65 },
      { benefitCategory: BenefitCategory.EAP, country: "IE", benefitName: "EAP", coverLevel: "Unlimited", employerFunded: true, provider: "Laya EAP", annualCostPerEmployee: 40, costCurrency: "EUR" },
      { benefitCategory: BenefitCategory.DENTAL, country: "IE", benefitName: "Dental Plan", coverLevel: "€1000 annual", employerFunded: true, provider: "DeCare Dental", annualCostPerEmployee: 420, costCurrency: "EUR", dentalAnnualLimit: 1000, dentalAnnualLimitCurrency: "EUR", dentalOrthoIncluded: false },
      { benefitCategory: BenefitCategory.CRITICAL_ILLNESS, country: "IE", benefitName: "Critical Illness", coverLevel: "€75k lump sum", employerFunded: true, provider: "Aviva", annualCostPerEmployee: 340, costCurrency: "EUR", ciFixedCoverAmount: 75000, ciCoverAmountCurrency: "EUR" },
    ],
    platform: { usesPlatform: true, platformName: "Benefex OneHub", platformType: "FLEX_BENEFITS", annualPlatformFee: 20000, feeCurrency: "EUR", feeModel: "PER_EMPLOYEE_PER_YEAR", platformSatisfactionScore: 8 },
    userEmail: "hr@datastream.ie",
    userName: "Declan Murphy",
  },
  // ── IE Company 9 (J62 - Software) ──
  {
    company: {
      id: "demo-company-ie-j62-3",
      name: "Galway Software Solutions",
      country: "IE",
      industry: "J62",
      employeeCount: 60,
      employeeCountRange: "51-250",
      averageSalary: 60000,
      averageSalaryCurrency: "EUR",
      averageBonusPercent: 8,
      surveyCompletedAt: new Date("2026-01-22"),
    },
    benefits: [
      { benefitCategory: BenefitCategory.HEALTH, country: "IE", benefitName: "Health Insurance", coverLevel: "Semi-private", employerFunded: true, coversSpouse: false, coversDependents: false, provider: "Irish Life Health", annualCostPerEmployee: 1850, costCurrency: "EUR", healthExcess: 500, healthExcessCurrency: "EUR", healthCopayPercent: 25, healthInpatientLimit: 750000, healthOutpatientLimit: 25000, healthLimitCurrency: "EUR" },
      { benefitCategory: BenefitCategory.LIFE, country: "IE", benefitName: "Death in Service", coverLevel: "2x salary", employerFunded: true, provider: "Aviva", annualCostPerEmployee: 180, costCurrency: "EUR", lifeCoverMultiple: 2, lifeFreeCoverLimit: 200000, lifeCoverAmountCurrency: "EUR" },
      { benefitCategory: BenefitCategory.PENSION, country: "IE", benefitName: "PRSA", coverLevel: "4% employer", employerFunded: true, employeeContributionPercent: 4, provider: "Aviva", annualCostPerEmployee: 2400, costCurrency: "EUR", pensionEmployerPct: 4, pensionEmployeePct: 4 },
      { benefitCategory: BenefitCategory.EAP, country: "IE", benefitName: "EAP", coverLevel: "6 sessions", employerFunded: true, annualCostPerEmployee: 28, costCurrency: "EUR" },
    ],
    platform: { usesPlatform: false },
    userEmail: "hr@galwaysoftware.ie",
    userName: "Roisin Gallagher",
  },
  // ── GB Company 1 ──
  {
    company: {
      id: "demo-company-gb-1",
      name: "London Tech Ltd",
      country: "GB",
      industry: "J62",
      employeeCount: 400,
      employeeCountRange: "251-1000",
      averageSalary: 55000,
      averageSalaryCurrency: "GBP",
      averageBonusPercent: 12,
      surveyCompletedAt: new Date("2026-01-08"),
    },
    benefits: [
      { benefitCategory: BenefitCategory.HEALTH, country: "GB", benefitName: "PMI", coverLevel: "Comprehensive", employerFunded: true, coversSpouse: true, coversDependents: true, provider: "Bupa", annualCostPerEmployee: 1800, costCurrency: "GBP", healthExcess: 200, healthExcessCurrency: "GBP", healthCopayPercent: 0, healthInpatientLimit: 2000000, healthOutpatientLimit: 50000, healthLimitCurrency: "GBP" },
      { benefitCategory: BenefitCategory.LIFE, country: "GB", benefitName: "Death in Service", coverLevel: "4x salary", employerFunded: true, provider: "Aviva", annualCostPerEmployee: 380, costCurrency: "GBP", lifeCoverMultiple: 4, lifeFreeCoverLimit: 400000, lifeCoverAmountCurrency: "GBP" },
      { benefitCategory: BenefitCategory.PENSION, country: "GB", benefitName: "Group Pension", coverLevel: "5% employer", employerFunded: true, employeeContributionPercent: 5, provider: "Scottish Widows", annualCostPerEmployee: 2750, costCurrency: "GBP", pensionEmployerPct: 5, pensionEmployeePct: 5 },
      { benefitCategory: BenefitCategory.INCOME_PROTECTION, country: "GB", benefitName: "GIP", coverLevel: "75% of salary", employerFunded: true, provider: "Unum", annualCostPerEmployee: 650, costCurrency: "GBP", ipBenefitPercent: 75, ipWaitingPeriodWeeks: 13, ipMaxBenefitAge: 65 },
      { benefitCategory: BenefitCategory.EAP, country: "GB", benefitName: "EAP", coverLevel: "8 sessions", employerFunded: true, provider: "Health Assured", annualCostPerEmployee: 25, costCurrency: "GBP" },
      { benefitCategory: BenefitCategory.DENTAL, country: "GB", benefitName: "Dental Plan", coverLevel: "£500 annual", employerFunded: true, provider: "Denplan", annualCostPerEmployee: 280, costCurrency: "GBP", dentalAnnualLimit: 500, dentalAnnualLimitCurrency: "GBP", dentalOrthoIncluded: false },
    ],
    platform: { usesPlatform: true, platformName: "Benify", platformType: "FLEX_BENEFITS", annualPlatformFee: 18000, feeCurrency: "GBP", feeModel: "PER_EMPLOYEE_PER_YEAR", platformSatisfactionScore: 7 },
    userEmail: "hr@londontech.co.uk",
    userName: "James Wilson",
  },
  // ── GB Company 2 ──
  {
    company: {
      id: "demo-company-gb-2",
      name: "Manchester Financial Services",
      country: "GB",
      industry: "K64",
      employeeCount: 600,
      employeeCountRange: "251-1000",
      averageSalary: 62000,
      averageSalaryCurrency: "GBP",
      averageBonusPercent: 18,
      surveyCompletedAt: new Date("2026-01-12"),
    },
    benefits: [
      { benefitCategory: BenefitCategory.HEALTH, country: "GB", benefitName: "PMI", coverLevel: "Comprehensive+", employerFunded: true, coversSpouse: true, coversDependents: true, provider: "AXA Health", annualCostPerEmployee: 2200, costCurrency: "GBP", healthExcess: 100, healthExcessCurrency: "GBP", healthCopayPercent: 0, healthInpatientLimit: 5000000, healthOutpatientLimit: 100000, healthLimitCurrency: "GBP" },
      { benefitCategory: BenefitCategory.LIFE, country: "GB", benefitName: "Death in Service", coverLevel: "4x salary", employerFunded: true, provider: "Legal & General", annualCostPerEmployee: 450, costCurrency: "GBP", lifeCoverMultiple: 4, lifeFreeCoverLimit: 500000, lifeCoverAmountCurrency: "GBP" },
      { benefitCategory: BenefitCategory.PENSION, country: "GB", benefitName: "Pension", coverLevel: "8% employer", employerFunded: true, employeeContributionPercent: 5, provider: "Aviva", annualCostPerEmployee: 4960, costCurrency: "GBP", pensionEmployerPct: 8, pensionEmployeePct: 5 },
      { benefitCategory: BenefitCategory.INCOME_PROTECTION, country: "GB", benefitName: "GIP", coverLevel: "75% salary", employerFunded: true, provider: "Canada Life", annualCostPerEmployee: 780, costCurrency: "GBP", ipBenefitPercent: 75, ipWaitingPeriodWeeks: 26, ipMaxBenefitAge: 67 },
      { benefitCategory: BenefitCategory.EAP, country: "GB", benefitName: "EAP", coverLevel: "Unlimited", employerFunded: true, provider: "Bupa EAP", annualCostPerEmployee: 35, costCurrency: "GBP" },
      { benefitCategory: BenefitCategory.DENTAL, country: "GB", benefitName: "Dental", coverLevel: "£750 annual", employerFunded: true, provider: "Denplan", annualCostPerEmployee: 350, costCurrency: "GBP", dentalAnnualLimit: 750, dentalAnnualLimitCurrency: "GBP", dentalOrthoIncluded: true },
      { benefitCategory: BenefitCategory.CRITICAL_ILLNESS, country: "GB", benefitName: "Critical Illness", coverLevel: "£100k", employerFunded: true, provider: "Legal & General", annualCostPerEmployee: 420, costCurrency: "GBP", ciFixedCoverAmount: 100000, ciCoverAmountCurrency: "GBP" },
      { benefitCategory: BenefitCategory.WELLNESS, country: "GB", benefitName: "Wellbeing", coverLevel: "£500 allowance", employerFunded: true, annualCostPerEmployee: 500, costCurrency: "GBP" },
    ],
    platform: { usesPlatform: true, platformName: "Darwin", platformType: "FLEX_BENEFITS", annualPlatformFee: 35000, feeCurrency: "GBP", feeModel: "PER_EMPLOYEE_PER_YEAR", platformSatisfactionScore: 8 },
    userEmail: "hr@manchesterfs.co.uk",
    userName: "Rebecca Thompson",
  },
  // ── US Company 1 ──
  {
    company: {
      id: "demo-company-us-1",
      name: "Bay Area Software Inc",
      country: "US",
      industry: "J62",
      employeeCount: 200,
      employeeCountRange: "51-250",
      averageSalary: 120000,
      averageSalaryCurrency: "USD",
      averageBonusPercent: 15,
      surveyCompletedAt: new Date("2026-01-18"),
    },
    benefits: [
      { benefitCategory: BenefitCategory.HEALTH, country: "US", benefitName: "Medical PPO", coverLevel: "Gold Plan", employerFunded: true, employeeContributionPercent: 20, coversSpouse: true, coversDependents: true, provider: "UnitedHealthcare", annualCostPerEmployee: 8500, costCurrency: "USD", healthExcess: 1500, healthExcessCurrency: "USD", healthCopayPercent: 20, healthInpatientLimit: 2000000, healthOutpatientLimit: 100000, healthLimitCurrency: "USD" },
      { benefitCategory: BenefitCategory.DENTAL, country: "US", benefitName: "Dental PPO", coverLevel: "$2000 annual max", employerFunded: true, provider: "Delta Dental", annualCostPerEmployee: 600, costCurrency: "USD", dentalAnnualLimit: 2000, dentalAnnualLimitCurrency: "USD", dentalOrthoIncluded: true },
      { benefitCategory: BenefitCategory.VISION, country: "US", benefitName: "Vision Plan", coverLevel: "$200 frame allowance", employerFunded: true, provider: "VSP", annualCostPerEmployee: 180, costCurrency: "USD" },
      { benefitCategory: BenefitCategory.LIFE, country: "US", benefitName: "Basic Life", coverLevel: "2x salary", employerFunded: true, provider: "MetLife", annualCostPerEmployee: 300, costCurrency: "USD", lifeCoverMultiple: 2, lifeFixedCoverAmount: 250000, lifeCoverAmountCurrency: "USD" },
      { benefitCategory: BenefitCategory.PENSION, country: "US", benefitName: "401(k)", coverLevel: "4% match", employerFunded: true, employeeContributionPercent: 6, provider: "Fidelity", annualCostPerEmployee: 4800, costCurrency: "USD", pensionEmployerPct: 4, pensionEmployeePct: 6 },
      { benefitCategory: BenefitCategory.EAP, country: "US", benefitName: "EAP", coverLevel: "8 sessions", employerFunded: true, provider: "Lyra Health", annualCostPerEmployee: 50, costCurrency: "USD" },
      { benefitCategory: BenefitCategory.WELLNESS, country: "US", benefitName: "Wellness Stipend", coverLevel: "$1200/year", employerFunded: true, annualCostPerEmployee: 1200, costCurrency: "USD" },
    ],
    platform: { usesPlatform: true, platformName: "Rippling", platformType: "FLEX_BENEFITS", annualPlatformFee: 12000, feeCurrency: "USD", feeModel: "PER_EMPLOYEE_PER_MONTH", platformSatisfactionScore: 8 },
    userEmail: "hr@bayareasw.com",
    userName: "Michael Chen",
  },
  // ── Multi-country Company (IE + GB) ──
  {
    company: {
      id: "demo-company-multi-1",
      name: "EuroCloud Systems",
      country: "IE",
      industry: "J62",
      employeeCount: 450,
      employeeCountRange: "251-1000",
      averageSalary: 72000,
      averageSalaryCurrency: "EUR",
      averageBonusPercent: 12,
      surveyCompletedAt: new Date("2026-01-25"),
    },
    countryProfiles: [
      { country: "IE", employeeCountRange: "251-1000", averageSalary: 72000, averageSalaryCurrency: "EUR", averageBonusPercent: 12 },
      { country: "GB", employeeCountRange: "51-250", averageSalary: 58000, averageSalaryCurrency: "GBP", averageBonusPercent: 10 },
    ],
    benefits: [
      // IE benefits
      { benefitCategory: BenefitCategory.HEALTH, country: "IE", benefitName: "PMI", coverLevel: "Semi-private", employerFunded: true, coversSpouse: true, coversDependents: true, provider: "VHI", annualCostPerEmployee: 2600, costCurrency: "EUR", healthExcess: 350, healthExcessCurrency: "EUR", healthCopayPercent: 20, healthInpatientLimit: 1500000, healthOutpatientLimit: 60000, healthLimitCurrency: "EUR" },
      { benefitCategory: BenefitCategory.LIFE, country: "IE", benefitName: "Death in Service", coverLevel: "4x salary", employerFunded: true, provider: "Irish Life", annualCostPerEmployee: 400, costCurrency: "EUR", lifeCoverMultiple: 4, lifeFreeCoverLimit: 450000, lifeCoverAmountCurrency: "EUR" },
      { benefitCategory: BenefitCategory.PENSION, country: "IE", benefitName: "DC Pension", coverLevel: "6% employer", employerFunded: true, employeeContributionPercent: 5, provider: "Irish Life", annualCostPerEmployee: 4320, costCurrency: "EUR", pensionEmployerPct: 6, pensionEmployeePct: 5 },
      { benefitCategory: BenefitCategory.INCOME_PROTECTION, country: "IE", benefitName: "IP", coverLevel: "75% salary", employerFunded: true, provider: "Aviva", annualCostPerEmployee: 850, costCurrency: "EUR", ipBenefitPercent: 75, ipWaitingPeriodWeeks: 13, ipMaxBenefitAge: 65 },
      { benefitCategory: BenefitCategory.EAP, country: "IE", benefitName: "EAP", coverLevel: "8 sessions", employerFunded: true, annualCostPerEmployee: 35, costCurrency: "EUR" },
      // GB benefits
      { benefitCategory: BenefitCategory.HEALTH, country: "GB", benefitName: "PMI", coverLevel: "Comprehensive", employerFunded: true, coversSpouse: true, coversDependents: false, provider: "Bupa", annualCostPerEmployee: 1600, costCurrency: "GBP", healthExcess: 250, healthExcessCurrency: "GBP", healthCopayPercent: 10, healthInpatientLimit: 1500000, healthOutpatientLimit: 40000, healthLimitCurrency: "GBP" },
      { benefitCategory: BenefitCategory.LIFE, country: "GB", benefitName: "Death in Service", coverLevel: "3x salary", employerFunded: true, provider: "Aviva", annualCostPerEmployee: 320, costCurrency: "GBP", lifeCoverMultiple: 3, lifeFreeCoverLimit: 350000, lifeCoverAmountCurrency: "GBP" },
      { benefitCategory: BenefitCategory.PENSION, country: "GB", benefitName: "Group Pension", coverLevel: "5% employer", employerFunded: true, employeeContributionPercent: 5, provider: "Aviva", annualCostPerEmployee: 2900, costCurrency: "GBP", pensionEmployerPct: 5, pensionEmployeePct: 5 },
      { benefitCategory: BenefitCategory.EAP, country: "GB", benefitName: "EAP", coverLevel: "6 sessions", employerFunded: true, annualCostPerEmployee: 22, costCurrency: "GBP" },
    ],
    platform: { usesPlatform: true, platformName: "Benefex OneHub", platformType: "FLEX_BENEFITS", annualPlatformFee: 22000, feeCurrency: "EUR", feeModel: "PER_EMPLOYEE_PER_YEAR", platformSatisfactionScore: 7 },
    userEmail: "hr@eurocloud.io",
    userName: "Ciaran Doyle",
  },
];

// ─── Currency rates (approximate) ───────────────────────────────────

const currencyRates = [
  { fromCurrency: "EUR", toCurrency: "GBP", rate: 0.86 },
  { fromCurrency: "EUR", toCurrency: "USD", rate: 1.08 },
  { fromCurrency: "EUR", toCurrency: "AED", rate: 3.97 },
  { fromCurrency: "EUR", toCurrency: "SGD", rate: 1.45 },
  { fromCurrency: "EUR", toCurrency: "AUD", rate: 1.65 },
  { fromCurrency: "GBP", toCurrency: "EUR", rate: 1.16 },
  { fromCurrency: "GBP", toCurrency: "USD", rate: 1.26 },
  { fromCurrency: "USD", toCurrency: "EUR", rate: 0.93 },
  { fromCurrency: "USD", toCurrency: "GBP", rate: 0.79 },
];

async function main() {
  console.log("Seeding database...");

  // Upsert country configs
  for (const config of countryConfigs) {
    await prisma.countryConfig.upsert({
      where: { countryCode: config.countryCode },
      update: config,
      create: config,
    });
    console.log(`  Seeded country: ${config.countryName}`);
  }

  // Seed currency rates
  for (const rate of currencyRates) {
    await prisma.currencyRate.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: rate.fromCurrency,
          toCurrency: rate.toCurrency,
        },
      },
      update: { rate: rate.rate },
      create: rate,
    });
  }
  console.log(`  Seeded ${currencyRates.length} currency rates`);

  // Create admin user
  const adminPassword = await hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@eppione.com" },
    update: {},
    create: {
      email: "admin@eppione.com",
      passwordHash: adminPassword,
      name: "Eppione Admin",
      role: "ADMIN",
      status: "APPROVED",
      emailVerified: new Date(),
    },
  });
  console.log("  Seeded admin user: admin@eppione.com / admin123");

  // Create broker user
  const brokerPassword = await hash("broker123", 12);
  await prisma.user.upsert({
    where: { email: "broker@eppione.com" },
    update: {},
    create: {
      email: "broker@eppione.com",
      passwordHash: brokerPassword,
      name: "Demo Broker",
      role: "BROKER",
      status: "APPROVED",
      emailVerified: new Date(),
    },
  });
  console.log("  Seeded broker user: broker@eppione.com / broker123");

  // Create demo company 1 (Acme Corp) with updated fields
  const demoCompany = await prisma.company.upsert({
    where: { id: "demo-company-1" },
    update: {
      employeeCountRange: "51-250",
      averageBonusPercent: 7.7,
      surveyCompletedAt: new Date("2026-01-05"),
    },
    create: {
      id: "demo-company-1",
      name: "Acme Corp Ireland",
      country: "IE",
      industry: "J62",
      employeeCount: 250,
      employeeCountRange: "51-250",
      averageSalary: 65000,
      averageSalaryCurrency: "EUR",
      averageBonus: 5000,
      averageBonusCurrency: "EUR",
      averageBonusPercent: 7.7,
      surveyCompletedAt: new Date("2026-01-05"),
    },
  });

  const clientPassword = await hash("client123", 12);
  await prisma.user.upsert({
    where: { email: "client@acme.com" },
    update: {},
    create: {
      email: "client@acme.com",
      passwordHash: clientPassword,
      name: "Jane Murphy",
      role: "CLIENT",
      status: "APPROVED",
      emailVerified: new Date(),
      companyId: demoCompany.id,
    },
  });
  console.log("  Seeded client user: client@acme.com / client123");

  // Upsert Acme benefits with country field
  const demoBenefits = [
    {
      companyId: demoCompany.id,
      benefitCategory: BenefitCategory.HEALTH,
      country: "IE",
      benefitName: "Group Private Medical Insurance",
      coverLevel: "Full cover, semi-private room",
      employerFunded: true,
      employeeContributionPercent: null,
      coversSpouse: true,
      coversDependents: true,
      maxDependents: 4,
      isCore: true,
      isVoluntary: false,
      provider: "Irish Life Health",
      annualCostPerEmployee: 2400,
      costCurrency: "EUR",
      notes: "Includes outpatient cover and day-to-day expenses",
      healthExcess: 250,
      healthExcessCurrency: "EUR",
      healthCopayPercent: 20,
      healthInpatientLimit: 1000000,
      healthOutpatientLimit: 50000,
      healthLimitCurrency: "EUR",
    },
    {
      companyId: demoCompany.id,
      benefitCategory: BenefitCategory.LIFE,
      country: "IE",
      benefitName: "Death in Service",
      coverLevel: "4x salary",
      employerFunded: true,
      coversSpouse: false,
      coversDependents: false,
      isCore: true,
      isVoluntary: false,
      provider: "Zurich Life",
      annualCostPerEmployee: 350,
      costCurrency: "EUR",
      lifeCoverMultiple: 4,
      lifeFreeCoverLimit: 400000,
      lifeCoverAmountCurrency: "EUR",
    },
    {
      companyId: demoCompany.id,
      benefitCategory: BenefitCategory.PENSION,
      country: "IE",
      benefitName: "Defined Contribution Pension",
      coverLevel: "5% employer match",
      employerFunded: true,
      employeeContributionPercent: 5,
      coversSpouse: false,
      coversDependents: false,
      isCore: true,
      isVoluntary: false,
      provider: "Irish Life",
      annualCostPerEmployee: 3250,
      costCurrency: "EUR",
      notes: "Employee can contribute additional voluntary contributions",
      pensionEmployerPct: 5,
      pensionEmployeePct: 5,
    },
    {
      companyId: demoCompany.id,
      benefitCategory: BenefitCategory.INCOME_PROTECTION,
      country: "IE",
      benefitName: "Income Protection",
      coverLevel: "75% of salary",
      employerFunded: true,
      coversSpouse: false,
      coversDependents: false,
      isCore: true,
      isVoluntary: false,
      provider: "Zurich Life",
      annualCostPerEmployee: 800,
      costCurrency: "EUR",
      notes: "26-week deferred period",
      ipBenefitPercent: 75,
      ipWaitingPeriodWeeks: 26,
      ipMaxBenefitAge: 65,
    },
    {
      companyId: demoCompany.id,
      benefitCategory: BenefitCategory.EAP,
      country: "IE",
      benefitName: "Employee Assistance Programme",
      coverLevel: "6 sessions per issue",
      employerFunded: true,
      coversSpouse: true,
      coversDependents: true,
      isCore: true,
      isVoluntary: false,
      provider: "Spectrum.Life",
      annualCostPerEmployee: 35,
      costCurrency: "EUR",
      notes: "24/7 counselling, financial and legal support",
    },
    {
      companyId: demoCompany.id,
      benefitCategory: BenefitCategory.DENTAL,
      country: "IE",
      benefitName: "Dental Insurance",
      coverLevel: "Plan B - €750 annual limit",
      employerFunded: false,
      employeeContributionPercent: 100,
      coversSpouse: false,
      coversDependents: false,
      isCore: false,
      isVoluntary: true,
      provider: "DeCare Dental",
      annualCostPerEmployee: 320,
      costCurrency: "EUR",
      notes: "Available as voluntary benefit via salary deduction",
      dentalAnnualLimit: 750,
      dentalAnnualLimitCurrency: "EUR",
      dentalOrthoIncluded: false,
    },
  ];

  // Delete existing benefits for demo-company-1 to avoid duplicates, then re-create
  await prisma.benefitEntry.deleteMany({ where: { companyId: demoCompany.id } });
  for (const benefit of demoBenefits) {
    await prisma.benefitEntry.create({ data: benefit });
  }
  console.log(`  Seeded ${demoBenefits.length} benefit entries for Acme Corp`);

  // Create demo platform info for Acme
  await prisma.platformInfo.deleteMany({ where: { companyId: demoCompany.id } });
  await prisma.platformInfo.create({
    data: {
      companyId: demoCompany.id,
      usesPlatform: true,
      platformName: "Benefex OneHub",
      platformType: "FLEX_BENEFITS",
      annualPlatformFee: 15000,
      feeCurrency: "EUR",
      feeModel: "PER_EMPLOYEE_PER_YEAR",
      platformSatisfactionScore: 7,
    },
  });

  // Create demo company 2 (TechStart) with updated fields
  const demoCompany2 = await prisma.company.upsert({
    where: { id: "demo-company-2" },
    update: {
      employeeCountRange: "51-250",
      averageBonusPercent: 11.1,
      surveyCompletedAt: new Date("2026-01-08"),
    },
    create: {
      id: "demo-company-2",
      name: "TechStart Ltd",
      country: "IE",
      industry: "J62",
      employeeCount: 80,
      employeeCountRange: "51-250",
      averageSalary: 72000,
      averageSalaryCurrency: "EUR",
      averageBonus: 8000,
      averageBonusCurrency: "EUR",
      averageBonusPercent: 11.1,
      surveyCompletedAt: new Date("2026-01-08"),
    },
  });

  // Create APPROVED user for TechStart
  await prisma.user.upsert({
    where: { email: "hr@techstart.ie" },
    update: {},
    create: {
      email: "hr@techstart.ie",
      passwordHash: clientPassword,
      name: "Tom Ryan",
      role: "CLIENT",
      status: "APPROVED",
      emailVerified: new Date(),
      companyId: demoCompany2.id,
    },
  });

  await prisma.benefitEntry.deleteMany({ where: { companyId: demoCompany2.id } });
  const demoBenefits2 = [
    {
      companyId: demoCompany2.id,
      benefitCategory: BenefitCategory.HEALTH,
      country: "IE",
      benefitName: "Private Health Insurance",
      coverLevel: "Full cover, private room",
      employerFunded: true,
      coversSpouse: true,
      coversDependents: true,
      maxDependents: 3,
      isCore: true,
      isVoluntary: false,
      provider: "Laya Healthcare",
      annualCostPerEmployee: 3100,
      costCurrency: "EUR",
      healthExcess: 150,
      healthExcessCurrency: "EUR",
      healthCopayPercent: 10,
      healthInpatientLimit: 2000000,
      healthOutpatientLimit: 75000,
      healthLimitCurrency: "EUR",
    },
    {
      companyId: demoCompany2.id,
      benefitCategory: BenefitCategory.LIFE,
      country: "IE",
      benefitName: "Death in Service",
      coverLevel: "3x salary",
      employerFunded: true,
      isCore: true,
      isVoluntary: false,
      provider: "Aviva",
      annualCostPerEmployee: 280,
      costCurrency: "EUR",
      lifeCoverMultiple: 3,
      lifeFreeCoverLimit: 350000,
      lifeCoverAmountCurrency: "EUR",
    },
    {
      companyId: demoCompany2.id,
      benefitCategory: BenefitCategory.PENSION,
      country: "IE",
      benefitName: "Group Pension Scheme",
      coverLevel: "6% employer, 4% employee",
      employerFunded: true,
      employeeContributionPercent: 4,
      isCore: true,
      isVoluntary: false,
      provider: "Zurich Life",
      annualCostPerEmployee: 4320,
      costCurrency: "EUR",
      pensionEmployerPct: 6,
      pensionEmployeePct: 4,
    },
    {
      companyId: demoCompany2.id,
      benefitCategory: BenefitCategory.WELLNESS,
      country: "IE",
      benefitName: "Wellness Allowance",
      coverLevel: "€500 per year",
      employerFunded: true,
      isCore: true,
      isVoluntary: false,
      annualCostPerEmployee: 500,
      costCurrency: "EUR",
      notes: "Gym membership, fitness classes, wellness apps",
    },
    {
      companyId: demoCompany2.id,
      benefitCategory: BenefitCategory.EAP,
      country: "IE",
      benefitName: "EAP",
      coverLevel: "Unlimited sessions",
      employerFunded: true,
      isCore: true,
      isVoluntary: false,
      provider: "Laya EAP",
      annualCostPerEmployee: 45,
      costCurrency: "EUR",
    },
  ];

  for (const benefit of demoBenefits2) {
    await prisma.benefitEntry.create({ data: benefit });
  }
  console.log(`  Seeded ${demoBenefits2.length} benefit entries for TechStart`);

  // ── Seed additional companies ──
  for (const seed of seedCompanies) {
    const company = await prisma.company.upsert({
      where: { id: seed.company.id },
      update: {
        employeeCountRange: seed.company.employeeCountRange,
        averageBonusPercent: seed.company.averageBonusPercent,
        surveyCompletedAt: seed.company.surveyCompletedAt,
      },
      create: seed.company,
    });

    // Create APPROVED user
    await prisma.user.upsert({
      where: { email: seed.userEmail },
      update: {},
      create: {
        email: seed.userEmail,
        passwordHash: clientPassword,
        name: seed.userName,
        role: "CLIENT",
        status: "APPROVED",
        emailVerified: new Date(),
        companyId: company.id,
      },
    });

    // Country profiles for multi-country companies
    if (seed.countryProfiles) {
      for (const profile of seed.countryProfiles) {
        await prisma.companyCountryProfile.upsert({
          where: {
            companyId_country: { companyId: company.id, country: profile.country },
          },
          update: profile,
          create: { companyId: company.id, ...profile },
        });
      }
    }

    // Benefits
    await prisma.benefitEntry.deleteMany({ where: { companyId: company.id } });
    for (const b of seed.benefits) {
      await prisma.benefitEntry.create({
        data: {
          companyId: company.id,
          benefitCategory: b.benefitCategory,
          country: b.country,
          benefitName: b.benefitName,
          coverLevel: b.coverLevel,
          employerFunded: b.employerFunded,
          employeeContributionPercent: b.employeeContributionPercent ?? null,
          coversSpouse: b.coversSpouse ?? false,
          coversDependents: b.coversDependents ?? false,
          isCore: b.isCore ?? true,
          isVoluntary: b.isVoluntary ?? false,
          isFlexible: b.isFlexible ?? false,
          provider: b.provider ?? null,
          annualCostPerEmployee: b.annualCostPerEmployee,
          costCurrency: b.costCurrency,
          // Health details
          healthExcess: b.healthExcess ?? null,
          healthExcessCurrency: b.healthExcessCurrency ?? "EUR",
          healthCopayPercent: b.healthCopayPercent ?? null,
          healthInpatientLimit: b.healthInpatientLimit ?? null,
          healthOutpatientLimit: b.healthOutpatientLimit ?? null,
          healthLimitCurrency: b.healthLimitCurrency ?? "EUR",
          // Life Insurance
          lifeCoverMultiple: b.lifeCoverMultiple ?? null,
          lifeFixedCoverAmount: b.lifeFixedCoverAmount ?? null,
          lifeCoverAmountCurrency: b.lifeCoverAmountCurrency ?? "EUR",
          lifeFreeCoverLimit: b.lifeFreeCoverLimit ?? null,
          // Income Protection
          ipBenefitPercent: b.ipBenefitPercent ?? null,
          ipWaitingPeriodWeeks: b.ipWaitingPeriodWeeks ?? null,
          ipMaxBenefitAge: b.ipMaxBenefitAge ?? null,
          // Critical Illness
          ciCoverMultiple: b.ciCoverMultiple ?? null,
          ciFixedCoverAmount: b.ciFixedCoverAmount ?? null,
          ciCoverAmountCurrency: b.ciCoverAmountCurrency ?? "EUR",
          // Dental
          dentalAnnualLimit: b.dentalAnnualLimit ?? null,
          dentalAnnualLimitCurrency: b.dentalAnnualLimitCurrency ?? "EUR",
          dentalOrthoIncluded: b.dentalOrthoIncluded ?? null,
          // Pension
          pensionEmployerPct: b.pensionEmployerPct ?? null,
          pensionEmployeePct: b.pensionEmployeePct ?? null,
        },
      });
    }

    // Platform
    await prisma.platformInfo.deleteMany({ where: { companyId: company.id } });
    await prisma.platformInfo.create({
      data: {
        companyId: company.id,
        usesPlatform: seed.platform.usesPlatform,
        platformName: seed.platform.platformName ?? null,
        platformType: seed.platform.platformType ?? null,
        annualPlatformFee: seed.platform.annualPlatformFee ?? null,
        feeCurrency: seed.platform.feeCurrency ?? "EUR",
        feeModel: seed.platform.feeModel ?? null,
        platformSatisfactionScore: seed.platform.platformSatisfactionScore ?? null,
      },
    });

    console.log(`  Seeded company: ${seed.company.name} (${seed.company.country}) - ${seed.benefits.length} benefits`);
  }

  // ========================================
  // Seed Compliance Data (Requirements + Statutory Limits)
  // ========================================
  console.log("\nSeeding compliance data...");

  // Get admin user ID for contributedById
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@eppione.com" },
    select: { id: true },
  });

  if (adminUser) {
    // Clear existing compliance data
    await prisma.complianceCheckResult.deleteMany({});
    await prisma.countryBenefitRequirement.deleteMany({});
    await prisma.countryStatutoryLimit.deleteMany({});

    const adminId = adminUser.id;
    const now = new Date();

    // ---- IRELAND (IE) ----
    const ieRequirements = [
      {
        country: "IE",
        benefitCategory: BenefitCategory.PENSION,
        requirementType: "QUASI_MANDATORY" as const,
        description: "PRSI-related pension: Employers expected to provide occupational pension scheme or access to PRSA (Personal Retirement Savings Account)",
        minimumLevel: "Employer PRSA access",
        legalReference: "Pensions Act 1990 (as amended)",
        effectiveFrom: now,
        penaltyForNonCompliance: "Failure to provide PRSA access: €2,000 fine per employee",
        notes: "Auto-enrolment expected from 2025. Current requirement is access to PRSA, not mandatory contributions.",
      },
      {
        country: "IE",
        benefitCategory: BenefitCategory.HEALTH,
        requirementType: "RECOMMENDED" as const,
        description: "Private health insurance commonly provided by employers to attract talent",
        minimumLevel: null,
        legalReference: "Health Insurance Act 1994",
        effectiveFrom: now,
        penaltyForNonCompliance: null,
        notes: "BIK applies on employer-paid health insurance premiums. ~46% of population has private health insurance.",
      },
      {
        country: "IE",
        benefitCategory: BenefitCategory.DISABILITY,
        requirementType: "MANDATORY" as const,
        description: "Statutory sick pay scheme — employers must provide sick pay for qualifying employees",
        minimumLevel: "70% of gross pay (capped at €110/day) for 5 days per year",
        legalReference: "Sick Leave Act 2022",
        effectiveFrom: now,
        penaltyForNonCompliance: "Non-compliance may result in WRC adjudication and compensation orders",
        notes: "Phased introduction: 3 days (2023), 5 days (2024), 7 days (2025), 10 days (2026).",
      },
      {
        country: "IE",
        benefitCategory: BenefitCategory.LIFE,
        requirementType: "COMMON_PRACTICE" as const,
        description: "Death in service benefit commonly offered as part of group risk schemes",
        minimumLevel: "2x salary",
        legalReference: null,
        effectiveFrom: now,
        penaltyForNonCompliance: null,
        notes: "Typical coverage is 2-4x annual salary. Tax-efficient for employer and tax-free for beneficiary.",
      },
      {
        country: "IE",
        benefitCategory: BenefitCategory.INCOME_PROTECTION,
        requirementType: "RECOMMENDED" as const,
        description: "Income protection insurance recommended to supplement statutory illness benefit",
        minimumLevel: "66% of salary",
        legalReference: null,
        effectiveFrom: now,
        penaltyForNonCompliance: null,
        notes: "Tax relief available on employee premiums. Benefits taxed as income when received.",
      },
    ];

    const ieLimits = [
      {
        country: "IE",
        limitType: "TAX_RELIEF_CAP" as const,
        benefitCategory: BenefitCategory.PENSION,
        description: "Annual pension contribution tax relief cap (age-dependent: 15-40% of earnings)",
        limitValue: "115,000",
        currency: "EUR",
        taxYear: "2025/26",
        legalReference: "TCA 1997 s.774",
      },
      {
        country: "IE",
        limitType: "CONTRIBUTION_LIMIT" as const,
        benefitCategory: BenefitCategory.PENSION,
        description: "Standard Fund Threshold (SFT) — lifetime pension fund limit",
        limitValue: "2,000,000",
        currency: "EUR",
        taxYear: "2025/26",
        legalReference: "TCA 1997 s.787O",
      },
      {
        country: "IE",
        limitType: "BENEFIT_IN_KIND_THRESHOLD" as const,
        benefitCategory: BenefitCategory.HEALTH,
        description: "Health insurance BIK: full premium amount treated as BIK",
        limitValue: "Full premium",
        currency: null,
        taxYear: "2025/26",
        legalReference: "TCA 1997 s.112",
      },
      {
        country: "IE",
        limitType: "SOCIAL_SECURITY_CAP" as const,
        benefitCategory: null,
        description: "PRSI earnings ceiling — no cap currently applies (employer PRSI on all earnings)",
        limitValue: "No cap",
        currency: null,
        taxYear: "2025/26",
        legalReference: "SWCA 2005",
      },
      {
        country: "IE",
        limitType: "BENEFIT_IN_KIND_THRESHOLD" as const,
        benefitCategory: BenefitCategory.TRANSPORT,
        description: "Tax-saver commuter ticket scheme — tax and PRSI exempt for qualifying tickets",
        limitValue: "Qualifying public transport tickets",
        currency: null,
        taxYear: "2025/26",
        legalReference: "TCA 1997 s.118(5A)",
      },
    ];

    // ---- UNITED KINGDOM (GB) ----
    const gbRequirements = [
      {
        country: "GB",
        benefitCategory: BenefitCategory.PENSION,
        requirementType: "MANDATORY" as const,
        description: "Auto-enrolment workplace pension: minimum total contribution 8% (3% employer, 5% employee)",
        minimumLevel: "3% employer contribution",
        legalReference: "Pensions Act 2008",
        effectiveFrom: now,
        penaltyForNonCompliance: "TPR escalating penalty notices: fixed £400, then daily penalties up to £10,000",
        notes: "Applies to all qualifying workers aged 22+ earning above £10,000. Re-enrolment every 3 years.",
      },
      {
        country: "GB",
        benefitCategory: BenefitCategory.DISABILITY,
        requirementType: "MANDATORY" as const,
        description: "Statutory Sick Pay (SSP) — employer must pay SSP for eligible employees",
        minimumLevel: "£116.75 per week for up to 28 weeks",
        legalReference: "Social Security Contributions and Benefits Act 1992",
        effectiveFrom: now,
        penaltyForNonCompliance: "HMRC penalties for non-payment; employee can claim through employment tribunal",
        notes: "SSP starts from 4th qualifying day of absence. Employee must earn at least LEL (£123/week).",
      },
      {
        country: "GB",
        benefitCategory: BenefitCategory.LIFE,
        requirementType: "COMMON_PRACTICE" as const,
        description: "Death in service benefit (group life assurance) widely offered by UK employers",
        minimumLevel: "2x salary",
        legalReference: null,
        effectiveFrom: now,
        penaltyForNonCompliance: null,
        notes: "Typically 2-4x salary. Paid via discretionary trust (IHT-free). No BIK for employee.",
      },
      {
        country: "GB",
        benefitCategory: BenefitCategory.HEALTH,
        requirementType: "RECOMMENDED" as const,
        description: "Private Medical Insurance (PMI) commonly offered to attract and retain talent",
        minimumLevel: null,
        legalReference: "ITEPA 2003 s.204",
        effectiveFrom: now,
        penaltyForNonCompliance: null,
        notes: "PMI is a P11D benefit. Employer must report to HMRC. Employee pays tax on benefit value.",
      },
      {
        country: "GB",
        benefitCategory: BenefitCategory.EAP,
        requirementType: "RECOMMENDED" as const,
        description: "Employee Assistance Programme — increasingly expected by employees and regulators",
        minimumLevel: null,
        legalReference: null,
        effectiveFrom: now,
        penaltyForNonCompliance: null,
        notes: "NICE guidelines recommend employer mental health support. No BIK if no medical treatment.",
      },
    ];

    const gbLimits = [
      {
        country: "GB",
        limitType: "TAX_RELIEF_CAP" as const,
        benefitCategory: BenefitCategory.PENSION,
        description: "Annual Allowance — tax-relieved pension contributions limit",
        limitValue: "60,000",
        currency: "GBP",
        taxYear: "2025/26",
        legalReference: "Finance Act 2004 s.228",
      },
      {
        country: "GB",
        limitType: "CONTRIBUTION_LIMIT" as const,
        benefitCategory: BenefitCategory.PENSION,
        description: "Lifetime Allowance — abolished from April 2024, replaced by lump sum allowance",
        limitValue: "268,275 (tax-free lump sum)",
        currency: "GBP",
        taxYear: "2025/26",
        legalReference: "Finance (No. 2) Act 2023",
      },
      {
        country: "GB",
        limitType: "INSURABLE_EARNINGS_CEILING" as const,
        benefitCategory: null,
        description: "NIC Upper Earnings Limit — employee NIC rate drops above this threshold",
        limitValue: "50,270",
        currency: "GBP",
        taxYear: "2025/26",
        legalReference: "SSCBA 1992",
      },
      {
        country: "GB",
        limitType: "BENEFIT_IN_KIND_THRESHOLD" as const,
        benefitCategory: BenefitCategory.HEALTH,
        description: "PMI is a fully taxable benefit in kind — no threshold exemption",
        limitValue: "Full premium value",
        currency: null,
        taxYear: "2025/26",
        legalReference: "ITEPA 2003",
      },
    ];

    // ---- FRANCE (FR) ----
    const frRequirements = [
      {
        country: "FR",
        benefitCategory: BenefitCategory.HEALTH,
        requirementType: "MANDATORY" as const,
        description: "Mutuelle (complementary health insurance) — employer must offer collective health cover to all employees",
        minimumLevel: "50% employer contribution minimum",
        legalReference: "ANI du 11 janvier 2013 / Loi 2013-504",
        effectiveFrom: now,
        penaltyForNonCompliance: "URSSAF reassessment: loss of social charge exemptions on employer contributions",
        notes: "Must cover the 'panier de soins minimum' basket. Contract must be 'responsable et solidaire'.",
      },
      {
        country: "FR",
        benefitCategory: BenefitCategory.LIFE,
        requirementType: "MANDATORY" as const,
        description: "Prévoyance (death/disability insurance) — mandatory for cadres (managers) under CCN",
        minimumLevel: "1.50% of Tranche A salary for death cover",
        legalReference: "CCN des cadres du 14 mars 1947, art. 7",
        effectiveFrom: now,
        penaltyForNonCompliance: "Employer personally liable for equivalent benefits if no cover in place",
        notes: "Applies to all cadres. Non-cadres may be covered by industry-level collective agreements.",
      },
      {
        country: "FR",
        benefitCategory: BenefitCategory.PENSION,
        requirementType: "MANDATORY" as const,
        description: "AGIRC-ARRCO complementary pension — mandatory employer contribution to supplementary pension",
        minimumLevel: "Employer share as per AGIRC-ARRCO rates",
        legalReference: "Accord national interprofessionnel AGIRC-ARRCO",
        effectiveFrom: now,
        penaltyForNonCompliance: "URSSAF penalties and back-payment of contributions",
        notes: "Total rate ~7.87% on T1, employer pays 60%. Unified since 2019.",
      },
      {
        country: "FR",
        benefitCategory: BenefitCategory.MEAL_VOUCHERS,
        requirementType: "COMMON_PRACTICE" as const,
        description: "Tickets restaurant (meal vouchers) — very common employer benefit in France",
        minimumLevel: null,
        legalReference: "Code du travail art. R3262-4",
        effectiveFrom: now,
        penaltyForNonCompliance: null,
        notes: "Employer contribution 50-60% is exempt from social charges up to a limit. Very high prevalence (~80% of companies).",
      },
    ];

    const frLimits = [
      {
        country: "FR",
        limitType: "SOCIAL_SECURITY_CAP" as const,
        benefitCategory: null,
        description: "Plafond Annuel de la Sécurité Sociale (PASS) — social security annual ceiling",
        limitValue: "46,368",
        currency: "EUR",
        taxYear: "2025",
        legalReference: "Code de la sécurité sociale",
      },
      {
        country: "FR",
        limitType: "BENEFIT_IN_KIND_THRESHOLD" as const,
        benefitCategory: BenefitCategory.MEAL_VOUCHERS,
        description: "Ticket restaurant employer contribution exemption limit per day",
        limitValue: "7.18",
        currency: "EUR",
        taxYear: "2025",
        legalReference: "Art. 81-19° CGI",
      },
      {
        country: "FR",
        limitType: "TAX_RELIEF_CAP" as const,
        benefitCategory: BenefitCategory.HEALTH,
        description: "Mutuelle employer contribution — exempt from social charges up to ceiling",
        limitValue: "6% PASS + 1.5% salary",
        currency: null,
        taxYear: "2025",
        legalReference: "Art. L242-1 CSS",
      },
    ];

    // ---- SPAIN (ES) ----
    const esRequirements = [
      {
        country: "ES",
        benefitCategory: BenefitCategory.PENSION,
        requirementType: "MANDATORY" as const,
        description: "Social Security contributions — employer must contribute to the Spanish social security system",
        minimumLevel: "Employer rate ~29.9% of salary (includes pension, unemployment, etc.)",
        legalReference: "Ley General de la Seguridad Social (LGSS)",
        effectiveFrom: now,
        penaltyForNonCompliance: "TGSS penalties: 100-200% of unpaid contributions",
        notes: "Covers pension, healthcare, unemployment, occupational accidents. No separate employer pension obligation beyond SS.",
      },
      {
        country: "ES",
        benefitCategory: BenefitCategory.DISABILITY,
        requirementType: "MANDATORY" as const,
        description: "Sick pay (Incapacidad Temporal) — employer pays from day 4-15, then SS takes over",
        minimumLevel: "60% of base salary (days 4-20), 75% (day 21+)",
        legalReference: "Art. 169-176 LGSS",
        effectiveFrom: now,
        penaltyForNonCompliance: "Labour inspection fines for non-payment",
        notes: "Days 1-3: no pay (unless CBA provides). Days 4-15: employer pays. Day 16+: SS pays (employer may advance).",
      },
      {
        country: "ES",
        benefitCategory: BenefitCategory.HEALTH,
        requirementType: "COMMON_PRACTICE" as const,
        description: "Private health insurance (seguro médico) — increasingly common employer benefit",
        minimumLevel: null,
        legalReference: null,
        effectiveFrom: now,
        penaltyForNonCompliance: null,
        notes: "Employer-paid private health insurance up to €500/person/year is exempt from personal income tax (IRPF).",
      },
      {
        country: "ES",
        benefitCategory: BenefitCategory.MEAL_VOUCHERS,
        requirementType: "COMMON_PRACTICE" as const,
        description: "Ticket restaurante — meal vouchers are a popular flexible remuneration benefit",
        minimumLevel: null,
        legalReference: "Art. 42.3.c LIRPF",
        effectiveFrom: now,
        penaltyForNonCompliance: null,
        notes: "Exempt from IRPF up to €11/day. Must be non-transferable and for working days only.",
      },
    ];

    const esLimits = [
      {
        country: "ES",
        limitType: "SOCIAL_SECURITY_CAP" as const,
        benefitCategory: null,
        description: "Maximum social security contribution base (base máxima de cotización)",
        limitValue: "56,646",
        currency: "EUR",
        taxYear: "2025",
        legalReference: "Ley de Presupuestos Generales del Estado",
      },
      {
        country: "ES",
        limitType: "BENEFIT_IN_KIND_THRESHOLD" as const,
        benefitCategory: BenefitCategory.HEALTH,
        description: "Private health insurance IRPF exemption per person per year",
        limitValue: "500",
        currency: "EUR",
        taxYear: "2025",
        legalReference: "Art. 42.3.c LIRPF",
      },
      {
        country: "ES",
        limitType: "BENEFIT_IN_KIND_THRESHOLD" as const,
        benefitCategory: BenefitCategory.MEAL_VOUCHERS,
        description: "Meal voucher daily IRPF exemption limit",
        limitValue: "11",
        currency: "EUR",
        taxYear: "2025",
        legalReference: "Art. 42.3.c LIRPF",
      },
      {
        country: "ES",
        limitType: "TAX_RELIEF_CAP" as const,
        benefitCategory: BenefitCategory.PENSION,
        description: "Maximum annual tax-deductible pension plan contribution",
        limitValue: "1,500",
        currency: "EUR",
        taxYear: "2025",
        legalReference: "Art. 52 LIRPF",
      },
    ];

    // ---- PORTUGAL (PT) ----
    const ptRequirements = [
      {
        country: "PT",
        benefitCategory: BenefitCategory.PENSION,
        requirementType: "MANDATORY" as const,
        description: "Social security contributions — employer must contribute to the Portuguese social security system",
        minimumLevel: "Employer rate 23.75% of gross salary",
        legalReference: "Código dos Regimes Contributivos (CRC)",
        effectiveFrom: now,
        penaltyForNonCompliance: "Segurança Social penalties: interest + fines up to 5x unpaid contributions",
        notes: "Covers pension, illness, maternity, unemployment, occupational diseases. Employer rate is 23.75%.",
      },
      {
        country: "PT",
        benefitCategory: BenefitCategory.MEAL_VOUCHERS,
        requirementType: "QUASI_MANDATORY" as const,
        description: "Subsídio de alimentação (meal allowance) — expected by employees, standard in employment contracts",
        minimumLevel: "€6.00/day (public sector reference, widely followed)",
        legalReference: "Portaria subsídio de refeição",
        effectiveFrom: now,
        penaltyForNonCompliance: null,
        notes: "Card/voucher format exempt up to €10.20/day. Cash format exempt up to €6.00/day. Nearly universal benefit.",
      },
      {
        country: "PT",
        benefitCategory: BenefitCategory.HEALTH,
        requirementType: "COMMON_PRACTICE" as const,
        description: "Private health insurance (seguro de saúde) — increasingly common employer benefit",
        minimumLevel: null,
        legalReference: null,
        effectiveFrom: now,
        penaltyForNonCompliance: null,
        notes: "Supplements the National Health Service (SNS). Growing prevalence especially in tech sector.",
      },
      {
        country: "PT",
        benefitCategory: BenefitCategory.DISABILITY,
        requirementType: "MANDATORY" as const,
        description: "Sick pay — employer pays 100% for first 3 days (if CBA), then social security pays",
        minimumLevel: "55% of reference salary (SS benefit, days 4-30)",
        legalReference: "Código do Trabalho art. 252-257",
        effectiveFrom: now,
        penaltyForNonCompliance: "ACT inspection penalties",
        notes: "SS pays: 55% (days 4-30), 60% (31-90), 70% (91-365), 75% (365+). Many employers top up.",
      },
    ];

    const ptLimits = [
      {
        country: "PT",
        limitType: "SOCIAL_SECURITY_CAP" as const,
        benefitCategory: null,
        description: "No social security contribution ceiling in Portugal — contributions on full salary",
        limitValue: "No cap",
        currency: null,
        taxYear: "2025",
        legalReference: "CRC",
      },
      {
        country: "PT",
        limitType: "BENEFIT_IN_KIND_THRESHOLD" as const,
        benefitCategory: BenefitCategory.MEAL_VOUCHERS,
        description: "Meal allowance daily IRS exemption (card/voucher format)",
        limitValue: "10.20",
        currency: "EUR",
        taxYear: "2025",
        legalReference: "Código do IRS",
      },
      {
        country: "PT",
        limitType: "TAX_RELIEF_CAP" as const,
        benefitCategory: BenefitCategory.HEALTH,
        description: "Health insurance premiums — deductible as business expense, IRS deduction for employees",
        limitValue: "15% of premiums (capped at €1,000)",
        currency: "EUR",
        taxYear: "2025",
        legalReference: "Art. 78-E CIRS",
      },
    ];

    // Insert all requirements
    const allRequirements = [...ieRequirements, ...gbRequirements, ...frRequirements, ...esRequirements, ...ptRequirements];
    for (const req of allRequirements) {
      await prisma.countryBenefitRequirement.create({
        data: {
          ...req,
          effectiveTo: null,
          penaltyForNonCompliance: req.penaltyForNonCompliance || null,
          notes: req.notes || null,
          minimumLevel: req.minimumLevel || null,
          legalReference: req.legalReference || null,
          contributedById: adminId,
          verifiedByAdmin: true,
        },
      });
    }
    console.log(`  Seeded ${allRequirements.length} compliance requirements (IE: ${ieRequirements.length}, GB: ${gbRequirements.length}, FR: ${frRequirements.length}, ES: ${esRequirements.length}, PT: ${ptRequirements.length})`);

    // Insert all limits
    const allLimits = [...ieLimits, ...gbLimits, ...frLimits, ...esLimits, ...ptLimits];
    for (const limit of allLimits) {
      await prisma.countryStatutoryLimit.create({
        data: {
          ...limit,
          benefitCategory: limit.benefitCategory || null,
          currency: limit.currency || null,
          legalReference: limit.legalReference || null,
          contributedById: adminId,
          verifiedByAdmin: true,
        },
      });
    }
    console.log(`  Seeded ${allLimits.length} statutory limits (IE: ${ieLimits.length}, GB: ${gbLimits.length}, FR: ${frLimits.length}, ES: ${esLimits.length}, PT: ${ptLimits.length})`);
  }

  console.log("\nSeeding complete!");
  console.log("Total companies: 13 (IE:9 incl 6 J62, GB:3 incl multi-country, US:1)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
