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

  // Create demo company and client user
  const demoCompany = await prisma.company.upsert({
    where: { id: "demo-company-1" },
    update: {},
    create: {
      id: "demo-company-1",
      name: "Acme Corp Ireland",
      country: "IE",
      industry: "J62", // NACE: Computer programming
      employeeCount: 250,
      averageSalary: 65000,
      averageSalaryCurrency: "EUR",
      averageBonus: 5000,
      averageBonusCurrency: "EUR",
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

  // Create demo benefit entries
  const demoBenefits = [
    {
      companyId: demoCompany.id,
      benefitCategory: BenefitCategory.HEALTH,
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
    },
    {
      companyId: demoCompany.id,
      benefitCategory: BenefitCategory.LIFE,
      benefitName: "Death in Service",
      coverLevel: "4x salary",
      employerFunded: true,
      employeeContributionPercent: null,
      coversSpouse: false,
      coversDependents: false,
      maxDependents: null,
      isCore: true,
      isVoluntary: false,
      provider: "Zurich Life",
      annualCostPerEmployee: 350,
      costCurrency: "EUR",
      notes: null,
    },
    {
      companyId: demoCompany.id,
      benefitCategory: BenefitCategory.PENSION,
      benefitName: "Defined Contribution Pension",
      coverLevel: "5% employer match",
      employerFunded: true,
      employeeContributionPercent: 5,
      coversSpouse: false,
      coversDependents: false,
      maxDependents: null,
      isCore: true,
      isVoluntary: false,
      provider: "Irish Life",
      annualCostPerEmployee: 3250,
      costCurrency: "EUR",
      notes: "Employee can contribute additional voluntary contributions",
    },
    {
      companyId: demoCompany.id,
      benefitCategory: BenefitCategory.INCOME_PROTECTION,
      benefitName: "Income Protection",
      coverLevel: "75% of salary",
      employerFunded: true,
      employeeContributionPercent: null,
      coversSpouse: false,
      coversDependents: false,
      maxDependents: null,
      isCore: true,
      isVoluntary: false,
      provider: "Zurich Life",
      annualCostPerEmployee: 800,
      costCurrency: "EUR",
      notes: "26-week deferred period",
    },
    {
      companyId: demoCompany.id,
      benefitCategory: BenefitCategory.EAP,
      benefitName: "Employee Assistance Programme",
      coverLevel: "6 sessions per issue",
      employerFunded: true,
      employeeContributionPercent: null,
      coversSpouse: true,
      coversDependents: true,
      maxDependents: null,
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
      benefitName: "Dental Insurance",
      coverLevel: "Plan B - €750 annual limit",
      employerFunded: false,
      employeeContributionPercent: 100,
      coversSpouse: false,
      coversDependents: false,
      maxDependents: null,
      isCore: false,
      isVoluntary: true,
      provider: "DeCare Dental",
      annualCostPerEmployee: 320,
      costCurrency: "EUR",
      notes: "Available as voluntary benefit via salary deduction",
    },
  ];

  for (const benefit of demoBenefits) {
    await prisma.benefitEntry.create({ data: benefit });
  }
  console.log(`  Seeded ${demoBenefits.length} demo benefit entries`);

  // Create demo platform info
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
  console.log("  Seeded demo platform info");

  // Create a second demo company for benchmarking
  const demoCompany2 = await prisma.company.upsert({
    where: { id: "demo-company-2" },
    update: {},
    create: {
      id: "demo-company-2",
      name: "TechStart Ltd",
      country: "IE",
      industry: "J62",
      employeeCount: 80,
      averageSalary: 72000,
      averageSalaryCurrency: "EUR",
      averageBonus: 8000,
      averageBonusCurrency: "EUR",
    },
  });

  const demoBenefits2 = [
    {
      companyId: demoCompany2.id,
      benefitCategory: BenefitCategory.HEALTH,
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
    },
    {
      companyId: demoCompany2.id,
      benefitCategory: BenefitCategory.LIFE,
      benefitName: "Death in Service",
      coverLevel: "3x salary",
      employerFunded: true,
      isCore: true,
      isVoluntary: false,
      provider: "Aviva",
      annualCostPerEmployee: 280,
      costCurrency: "EUR",
    },
    {
      companyId: demoCompany2.id,
      benefitCategory: BenefitCategory.PENSION,
      benefitName: "Group Pension Scheme",
      coverLevel: "6% employer, 4% employee",
      employerFunded: true,
      employeeContributionPercent: 4,
      isCore: true,
      isVoluntary: false,
      provider: "Zurich Life",
      annualCostPerEmployee: 4320,
      costCurrency: "EUR",
    },
    {
      companyId: demoCompany2.id,
      benefitCategory: BenefitCategory.WELLNESS,
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
  console.log(`  Seeded ${demoBenefits2.length} demo benefit entries for TechStart`);

  console.log("\nSeeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
