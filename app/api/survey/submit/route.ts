import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { BenefitCategory } from "@prisma/client";
import { ensureCountryConfigs } from "@/lib/country-config";
import { classifySalaryBand } from "@/lib/benchmarking-types";

const benefitFormSchema = z.object({
  tempId: z.string(),
  benefitName: z.string().min(1, "Benefit name is required"),
  coverLevel: z.string().min(1, "Cover level is required"),
  employerFunded: z.boolean(),
  employeeContributionPercent: z.number().min(0).max(100).nullable(),
  coversSpouse: z.boolean(),
  coversDependents: z.boolean(),
  maxDependents: z.number().int().positive().nullable(),
  isFlexible: z.boolean(),
  flexFundAmount: z.number().positive().nullable(),
  flexFundCurrency: z.string(),
  provider: z.string(),
  annualCostPerEmployee: z.number().min(0).nullable(),
  costCurrency: z.string(),
  notes: z.string(),
  healthExcess: z.number().nullable().optional().default(null),
  healthExcessCurrency: z.string().optional().default("EUR"),
  healthCopayPercent: z.number().min(0).max(100).nullable().optional().default(null),
  healthInpatientLimit: z.number().nullable().optional().default(null),
  healthOutpatientLimit: z.number().nullable().optional().default(null),
  healthLimitCurrency: z.string().optional().default("EUR"),
  healthLimits: z.array(z.object({
    limitType: z.string().min(1),
    customLimitName: z.string().optional().default(""),
    hasLimit: z.boolean(),
    limitAmount: z.number().nullable(),
    limitCurrency: z.string().optional().default("EUR"),
  })).optional().default([]),
  // Life Insurance
  lifeCoverMultiple: z.number().nullable().optional().default(null),
  lifeFixedCoverAmount: z.number().nullable().optional().default(null),
  lifeCoverAmountCurrency: z.string().optional().default("EUR"),
  lifeFreeCoverLimit: z.number().nullable().optional().default(null),
  // Income Protection
  ipBenefitPercent: z.number().min(0).max(100).nullable().optional().default(null),
  ipWaitingPeriodWeeks: z.number().int().nullable().optional().default(null),
  ipMaxBenefitAge: z.number().int().nullable().optional().default(null),
  // Critical Illness
  ciCoverMultiple: z.number().nullable().optional().default(null),
  ciFixedCoverAmount: z.number().nullable().optional().default(null),
  ciCoverAmountCurrency: z.string().optional().default("EUR"),
  // Dental
  dentalAnnualLimit: z.number().nullable().optional().default(null),
  dentalAnnualLimitCurrency: z.string().optional().default("EUR"),
  dentalOrthoIncluded: z.boolean().nullable().optional().default(null),
  // Pension
  pensionEmployerPct: z.number().min(0).max(100).nullable().optional().default(null),
  pensionEmployeePct: z.number().min(0).max(100).nullable().optional().default(null),
  pensionPlanType: z.string().optional().default(""),
  pensionContributionRateEmployer: z.number().min(0).max(100).nullable().optional().default(null),
  pensionContributionRateEmployee: z.number().min(0).max(100).nullable().optional().default(null),
  pensionDeathBenefitMultiple: z.number().min(0).nullable().optional().default(null),
  pensionDeathBenefitType: z.string().optional().default(""),
  pensionFormulaType: z.string().optional().default(""),
  // Annual Leave
  leaveDaysEntitlement: z.number().int().nullable().optional().default(null),
  leaveIncludesPublicHolidays: z.boolean().nullable().optional().default(null),
  leaveIncreasesWithTenure: z.boolean().nullable().optional().default(null),
  leaveMaxDays: z.number().int().nullable().optional().default(null),
  leaveBuySellDays: z.boolean().nullable().optional().default(null),
  leaveCarryOverDays: z.number().int().nullable().optional().default(null),
  leaveBirthdayOff: z.boolean().nullable().optional().default(null),
  leaveVolunteerDays: z.number().int().nullable().optional().default(null),
  leaveChristmasClosureDays: z.number().int().nullable().optional().default(null),
  // Sick Pay
  sickPayFullPayWeeks: z.number().int().nullable().optional().default(null),
  sickPayHalfPayWeeks: z.number().int().nullable().optional().default(null),
  sickPayPartialPayPercent: z.number().min(0).max(100).nullable().optional().default(null),
  sickPayWaitingDays: z.number().int().nullable().optional().default(null),
  sickPayAboveStatutory: z.boolean().nullable().optional().default(null),
  // Maternity Pay
  maternityFullPayWeeks: z.number().int().nullable().optional().default(null),
  maternityPartialPayWeeks: z.number().int().nullable().optional().default(null),
  maternityPartialPayPercent: z.number().min(0).max(100).nullable().optional().default(null),
  maternityTotalLeaveWeeks: z.number().int().nullable().optional().default(null),
  maternityAboveStatutory: z.boolean().nullable().optional().default(null),
  maternityKitDays: z.number().int().nullable().optional().default(null),
  maternityGradualReturn: z.boolean().nullable().optional().default(null),
  // Paternity Pay
  paternityFullPayWeeks: z.number().int().nullable().optional().default(null),
  paternityPartialPayWeeks: z.number().int().nullable().optional().default(null),
  paternityPartialPayPercent: z.number().min(0).max(100).nullable().optional().default(null),
  paternityTotalLeaveWeeks: z.number().int().nullable().optional().default(null),
  paternityAboveStatutory: z.boolean().nullable().optional().default(null),
  paternitySharedParentalLeave: z.boolean().nullable().optional().default(null),
  // Broker
  brokerName: z.string().optional().default(""),
  brokerSatisfactionScore: z.number().int().min(1).max(10).nullable().optional().default(null),
  // Renewal / Satisfaction
  renewalDate: z.string().optional().default(""),
  benefitSatisfactionScore: z.number().int().min(1).max(10).nullable().optional().default(null),
});

const categoryDataSchema = z.object({
  notOffered: z.boolean(),
  benefits: z.array(benefitFormSchema),
});

const countryProfileSchema = z.object({
  country: z.string().length(2, "Country code is required"),
  employeeCountRange: z.string(),
  averageSalary: z.number().positive().nullable(),
  averageSalaryCurrency: z.string().min(1),
  averageBonusPercent: z.number().min(0).max(100).nullable(),
  financialYearEndMonth: z.number().int().min(1).max(12).nullable(),
});

const surveySubmitSchema = z.object({
  step1: z.object({
    industrySector: z.string().min(1, "Industry sector is required"),
    industryCode: z.string().min(1, "Industry code is required"),
    countries: z.array(countryProfileSchema).min(1, "At least one country is required"),
    benefitBudget: z.number().positive().nullable().optional().default(null),
    benefitBudgetCurrency: z.string().optional().default("EUR"),
    averageWorkforceAge: z.number().positive().nullable().optional().default(null),
    desiredNewBenefits: z.string().optional().default(""),
  }),
  step2: z.object({
    countriesData: z.record(
      z.string(),
      z.record(z.string(), categoryDataSchema)
    ),
  }),
  step3: z.object({
    countriesData: z.record(
      z.string(),
      z.record(z.string(), categoryDataSchema)
    ),
  }),
  step4: z.object({
    usesPlatform: z.boolean(),
    platformName: z.string(),
    platformType: z.string(),
    annualPlatformFee: z.number().positive().nullable(),
    feeCurrency: z.string(),
    feeModel: z.string(),
    platformSatisfactionScore: z.number().int().min(1).max(10).nullable(),
    usesTotalRewardPlatform: z.boolean(),
    totalRewardPlatformName: z.string(),
    otherHRTechPlatforms: z.string(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.companyRole === "VIEWER") {
      return NextResponse.json(
        { error: "Viewers cannot submit survey data" },
        { status: 403 }
      );
    }

    const { companyId } = session.user;

    if (!companyId) {
      return NextResponse.json(
        { error: "No company associated with this account" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const data = surveySubmitSchema.parse(body);

    // Ensure CountryConfig exists for all countries in submission
    const countryCodes = data.step1.countries.map((c) => c.country);
    await ensureCountryConfigs(countryCodes);

    const primaryCountry = data.step1.countries[0].country;

    await prisma.$transaction(async (tx) => {
      // 1. Update Company fields (industry + primary country)
      await tx.company.update({
        where: { id: companyId },
        data: {
          country: primaryCountry,
          industry: data.step1.industryCode,
          // Set primary country's profile data on Company for backward compat
          employeeCountRange: data.step1.countries[0].employeeCountRange || null,
          averageSalary: data.step1.countries[0].averageSalary,
          averageSalaryCurrency: data.step1.countries[0].averageSalaryCurrency,
          averageBonusPercent: data.step1.countries[0].averageBonusPercent,
          financialYearEndMonth: data.step1.countries[0].financialYearEndMonth,
          benefitBudget: data.step1.benefitBudget ?? null,
          benefitBudgetCurrency: data.step1.benefitBudgetCurrency || "EUR",
          averageWorkforceAge: data.step1.averageWorkforceAge ?? null,
          desiredNewBenefits: data.step1.desiredNewBenefits || null,
          surveyCompletedAt: new Date(),
        },
      });

      // 2. Delete + recreate CompanyCountryProfiles
      await tx.companyCountryProfile.deleteMany({ where: { companyId } });

      for (const cp of data.step1.countries) {
        await tx.companyCountryProfile.create({
          data: {
            companyId,
            country: cp.country,
            employeeCountRange: cp.employeeCountRange || null,
            averageSalary: cp.averageSalary,
            averageSalaryCurrency: cp.averageSalaryCurrency,
            averageBonusPercent: cp.averageBonusPercent,
            financialYearEndMonth: cp.financialYearEndMonth,
            salaryBand: cp.averageSalary ? classifySalaryBand(cp.averageSalary) as "UNDER_35K" | "BAND_35K_50K" | "BAND_50K_75K" | "BAND_75K_100K" | "OVER_100K" : null,
          },
        });
      }

      // 3. Delete existing survey-sourced BenefitEntries
      await tx.benefitEntry.deleteMany({
        where: { companyId, surveySource: true },
      });

      // 4. Create new BenefitEntries from Steps 2 (core) + 3 (flex/voluntary) with country
      const benefitEntries: { data: Parameters<typeof tx.benefitEntry.create>[0]["data"]; healthLimits: { limitType: string; hasLimit: boolean; limitAmount: number | null; limitCurrency: string }[] }[] = [];

      for (const [country, categories] of Object.entries(
        data.step2.countriesData
      )) {
        for (const [category, catData] of Object.entries(categories)) {
          if (catData.notOffered) continue;
          for (const benefit of catData.benefits) {
            if (!benefit.benefitName || !benefit.coverLevel) continue;
            // Backfill flat inpatient/outpatient fields from healthLimits for backward compat
            let backfilledInpatient = benefit.healthInpatientLimit ?? null;
            let backfilledOutpatient = benefit.healthOutpatientLimit ?? null;
            const hlArray = benefit.healthLimits ?? [];
            for (const hl of hlArray) {
              if (hl.limitType === "INPATIENT" && hl.hasLimit && hl.limitAmount !== null) {
                backfilledInpatient = hl.limitAmount;
              }
              if (hl.limitType === "OUTPATIENT" && hl.hasLimit && hl.limitAmount !== null) {
                backfilledOutpatient = hl.limitAmount;
              }
            }

            benefitEntries.push({
              data: {
              companyId,
              benefitCategory: category as BenefitCategory,
              country,
              benefitName: benefit.benefitName,
              coverLevel: benefit.coverLevel,
              employerFunded: benefit.employerFunded,
              employeeContributionPercent: benefit.employeeContributionPercent,
              coversSpouse: benefit.coversSpouse,
              coversDependents: benefit.coversDependents,
              maxDependents: benefit.maxDependents,
              isCore: true,
              isVoluntary: false,
              isFlexible: benefit.isFlexible,
              flexFundAmount: benefit.flexFundAmount,
              flexFundCurrency: benefit.flexFundCurrency || null,
              surveySource: true,
              provider: benefit.provider || null,
              annualCostPerEmployee: benefit.annualCostPerEmployee,
              costCurrency: benefit.costCurrency || "EUR",
              notes: benefit.notes || null,
              healthExcess: benefit.healthExcess ?? null,
              healthExcessCurrency: benefit.healthExcessCurrency || "EUR",
              healthCopayPercent: benefit.healthCopayPercent ?? null,
              healthInpatientLimit: backfilledInpatient,
              healthOutpatientLimit: backfilledOutpatient,
              healthLimitCurrency: benefit.healthLimitCurrency || "EUR",
              lifeCoverMultiple: benefit.lifeCoverMultiple ?? null,
              lifeFixedCoverAmount: benefit.lifeFixedCoverAmount ?? null,
              lifeCoverAmountCurrency: benefit.lifeCoverAmountCurrency || "EUR",
              lifeFreeCoverLimit: benefit.lifeFreeCoverLimit ?? null,
              ipBenefitPercent: benefit.ipBenefitPercent ?? null,
              ipWaitingPeriodWeeks: benefit.ipWaitingPeriodWeeks ?? null,
              ipMaxBenefitAge: benefit.ipMaxBenefitAge ?? null,
              ciCoverMultiple: benefit.ciCoverMultiple ?? null,
              ciFixedCoverAmount: benefit.ciFixedCoverAmount ?? null,
              ciCoverAmountCurrency: benefit.ciCoverAmountCurrency || "EUR",
              dentalAnnualLimit: benefit.dentalAnnualLimit ?? null,
              dentalAnnualLimitCurrency: benefit.dentalAnnualLimitCurrency || "EUR",
              dentalOrthoIncluded: benefit.dentalOrthoIncluded ?? null,
              pensionEmployerPct: benefit.pensionEmployerPct ?? null,
              pensionEmployeePct: benefit.pensionEmployeePct ?? null,
              pensionPlanType: benefit.pensionPlanType ? (benefit.pensionPlanType as "DC" | "DB" | "CASH_BALANCE" | "HYBRID") : null,
              pensionContributionRateEmployer: benefit.pensionContributionRateEmployer ?? null,
              pensionContributionRateEmployee: benefit.pensionContributionRateEmployee ?? null,
              pensionDeathBenefitMultiple: benefit.pensionDeathBenefitMultiple ?? null,
              pensionDeathBenefitType: benefit.pensionDeathBenefitType ? (benefit.pensionDeathBenefitType as "ACCUMULATED_RESERVES" | "FIXED_MULTIPLE" | "MIXED" | "NONE") : null,
              pensionFormulaType: benefit.pensionFormulaType ? (benefit.pensionFormulaType as "FLAT_RATE" | "STEP_RATE" | "SALARY_LINKED" | "OTHER") : null,
              leaveDaysEntitlement: benefit.leaveDaysEntitlement ?? null,
              leaveIncludesPublicHolidays: benefit.leaveIncludesPublicHolidays ?? null,
              leaveIncreasesWithTenure: benefit.leaveIncreasesWithTenure ?? null,
              leaveMaxDays: benefit.leaveMaxDays ?? null,
              leaveBuySellDays: benefit.leaveBuySellDays ?? null,
              leaveCarryOverDays: benefit.leaveCarryOverDays ?? null,
              leaveBirthdayOff: benefit.leaveBirthdayOff ?? null,
              leaveVolunteerDays: benefit.leaveVolunteerDays ?? null,
              leaveChristmasClosureDays: benefit.leaveChristmasClosureDays ?? null,
              sickPayFullPayWeeks: benefit.sickPayFullPayWeeks ?? null,
              sickPayHalfPayWeeks: benefit.sickPayHalfPayWeeks ?? null,
              sickPayPartialPayPercent: benefit.sickPayPartialPayPercent ?? null,
              sickPayWaitingDays: benefit.sickPayWaitingDays ?? null,
              sickPayAboveStatutory: benefit.sickPayAboveStatutory ?? null,
              maternityFullPayWeeks: benefit.maternityFullPayWeeks ?? null,
              maternityPartialPayWeeks: benefit.maternityPartialPayWeeks ?? null,
              maternityPartialPayPercent: benefit.maternityPartialPayPercent ?? null,
              maternityTotalLeaveWeeks: benefit.maternityTotalLeaveWeeks ?? null,
              maternityAboveStatutory: benefit.maternityAboveStatutory ?? null,
              maternityKitDays: benefit.maternityKitDays ?? null,
              maternityGradualReturn: benefit.maternityGradualReturn ?? null,
              paternityFullPayWeeks: benefit.paternityFullPayWeeks ?? null,
              paternityPartialPayWeeks: benefit.paternityPartialPayWeeks ?? null,
              paternityPartialPayPercent: benefit.paternityPartialPayPercent ?? null,
              paternityTotalLeaveWeeks: benefit.paternityTotalLeaveWeeks ?? null,
              paternityAboveStatutory: benefit.paternityAboveStatutory ?? null,
              paternitySharedParentalLeave: benefit.paternitySharedParentalLeave ?? null,
              brokerName: benefit.brokerName || null,
              brokerSatisfactionScore: benefit.brokerSatisfactionScore ?? null,
              renewalDate: benefit.renewalDate ? new Date(benefit.renewalDate) : null,
              benefitSatisfactionScore: benefit.benefitSatisfactionScore ?? null,
              },
              healthLimits: hlArray.map((hl) => ({
                limitType: hl.limitType === "CUSTOM" ? hl.customLimitName : hl.limitType,
                hasLimit: hl.hasLimit,
                limitAmount: hl.hasLimit ? hl.limitAmount : null,
                limitCurrency: hl.limitCurrency || "EUR",
              })),
            });
          }
        }
      }

      for (const [country, categories] of Object.entries(
        data.step3.countriesData
      )) {
        for (const [category, catData] of Object.entries(categories)) {
          if (catData.notOffered) continue;
          for (const benefit of catData.benefits) {
            if (!benefit.benefitName || !benefit.coverLevel) continue;

            let backfilledInpatient3 = benefit.healthInpatientLimit ?? null;
            let backfilledOutpatient3 = benefit.healthOutpatientLimit ?? null;
            const hlArray3 = benefit.healthLimits ?? [];
            for (const hl of hlArray3) {
              if (hl.limitType === "INPATIENT" && hl.hasLimit && hl.limitAmount !== null) {
                backfilledInpatient3 = hl.limitAmount;
              }
              if (hl.limitType === "OUTPATIENT" && hl.hasLimit && hl.limitAmount !== null) {
                backfilledOutpatient3 = hl.limitAmount;
              }
            }

            benefitEntries.push({
              data: {
              companyId,
              benefitCategory: category as BenefitCategory,
              country,
              benefitName: benefit.benefitName,
              coverLevel: benefit.coverLevel,
              employerFunded: benefit.employerFunded,
              employeeContributionPercent: benefit.employeeContributionPercent,
              coversSpouse: benefit.coversSpouse,
              coversDependents: benefit.coversDependents,
              maxDependents: benefit.maxDependents,
              isCore: false,
              isVoluntary: !benefit.isFlexible,
              isFlexible: benefit.isFlexible,
              flexFundAmount: benefit.flexFundAmount,
              flexFundCurrency: benefit.flexFundCurrency || null,
              surveySource: true,
              provider: benefit.provider || null,
              annualCostPerEmployee: benefit.annualCostPerEmployee,
              costCurrency: benefit.costCurrency || "EUR",
              notes: benefit.notes || null,
              healthExcess: benefit.healthExcess ?? null,
              healthExcessCurrency: benefit.healthExcessCurrency || "EUR",
              healthCopayPercent: benefit.healthCopayPercent ?? null,
              healthInpatientLimit: backfilledInpatient3,
              healthOutpatientLimit: backfilledOutpatient3,
              healthLimitCurrency: benefit.healthLimitCurrency || "EUR",
              lifeCoverMultiple: benefit.lifeCoverMultiple ?? null,
              lifeFixedCoverAmount: benefit.lifeFixedCoverAmount ?? null,
              lifeCoverAmountCurrency: benefit.lifeCoverAmountCurrency || "EUR",
              lifeFreeCoverLimit: benefit.lifeFreeCoverLimit ?? null,
              ipBenefitPercent: benefit.ipBenefitPercent ?? null,
              ipWaitingPeriodWeeks: benefit.ipWaitingPeriodWeeks ?? null,
              ipMaxBenefitAge: benefit.ipMaxBenefitAge ?? null,
              ciCoverMultiple: benefit.ciCoverMultiple ?? null,
              ciFixedCoverAmount: benefit.ciFixedCoverAmount ?? null,
              ciCoverAmountCurrency: benefit.ciCoverAmountCurrency || "EUR",
              dentalAnnualLimit: benefit.dentalAnnualLimit ?? null,
              dentalAnnualLimitCurrency: benefit.dentalAnnualLimitCurrency || "EUR",
              dentalOrthoIncluded: benefit.dentalOrthoIncluded ?? null,
              pensionEmployerPct: benefit.pensionEmployerPct ?? null,
              pensionEmployeePct: benefit.pensionEmployeePct ?? null,
              pensionPlanType: benefit.pensionPlanType ? (benefit.pensionPlanType as "DC" | "DB" | "CASH_BALANCE" | "HYBRID") : null,
              pensionContributionRateEmployer: benefit.pensionContributionRateEmployer ?? null,
              pensionContributionRateEmployee: benefit.pensionContributionRateEmployee ?? null,
              pensionDeathBenefitMultiple: benefit.pensionDeathBenefitMultiple ?? null,
              pensionDeathBenefitType: benefit.pensionDeathBenefitType ? (benefit.pensionDeathBenefitType as "ACCUMULATED_RESERVES" | "FIXED_MULTIPLE" | "MIXED" | "NONE") : null,
              pensionFormulaType: benefit.pensionFormulaType ? (benefit.pensionFormulaType as "FLAT_RATE" | "STEP_RATE" | "SALARY_LINKED" | "OTHER") : null,
              leaveDaysEntitlement: benefit.leaveDaysEntitlement ?? null,
              leaveIncludesPublicHolidays: benefit.leaveIncludesPublicHolidays ?? null,
              leaveIncreasesWithTenure: benefit.leaveIncreasesWithTenure ?? null,
              leaveMaxDays: benefit.leaveMaxDays ?? null,
              leaveBuySellDays: benefit.leaveBuySellDays ?? null,
              leaveCarryOverDays: benefit.leaveCarryOverDays ?? null,
              leaveBirthdayOff: benefit.leaveBirthdayOff ?? null,
              leaveVolunteerDays: benefit.leaveVolunteerDays ?? null,
              leaveChristmasClosureDays: benefit.leaveChristmasClosureDays ?? null,
              sickPayFullPayWeeks: benefit.sickPayFullPayWeeks ?? null,
              sickPayHalfPayWeeks: benefit.sickPayHalfPayWeeks ?? null,
              sickPayPartialPayPercent: benefit.sickPayPartialPayPercent ?? null,
              sickPayWaitingDays: benefit.sickPayWaitingDays ?? null,
              sickPayAboveStatutory: benefit.sickPayAboveStatutory ?? null,
              maternityFullPayWeeks: benefit.maternityFullPayWeeks ?? null,
              maternityPartialPayWeeks: benefit.maternityPartialPayWeeks ?? null,
              maternityPartialPayPercent: benefit.maternityPartialPayPercent ?? null,
              maternityTotalLeaveWeeks: benefit.maternityTotalLeaveWeeks ?? null,
              maternityAboveStatutory: benefit.maternityAboveStatutory ?? null,
              maternityKitDays: benefit.maternityKitDays ?? null,
              maternityGradualReturn: benefit.maternityGradualReturn ?? null,
              paternityFullPayWeeks: benefit.paternityFullPayWeeks ?? null,
              paternityPartialPayWeeks: benefit.paternityPartialPayWeeks ?? null,
              paternityPartialPayPercent: benefit.paternityPartialPayPercent ?? null,
              paternityTotalLeaveWeeks: benefit.paternityTotalLeaveWeeks ?? null,
              paternityAboveStatutory: benefit.paternityAboveStatutory ?? null,
              paternitySharedParentalLeave: benefit.paternitySharedParentalLeave ?? null,
              brokerName: benefit.brokerName || null,
              brokerSatisfactionScore: benefit.brokerSatisfactionScore ?? null,
              renewalDate: benefit.renewalDate ? new Date(benefit.renewalDate) : null,
              benefitSatisfactionScore: benefit.benefitSatisfactionScore ?? null,
              },
              healthLimits: hlArray3.map((hl) => ({
                limitType: hl.limitType === "CUSTOM" ? hl.customLimitName : hl.limitType,
                hasLimit: hl.hasLimit,
                limitAmount: hl.hasLimit ? hl.limitAmount : null,
                limitCurrency: hl.limitCurrency || "EUR",
              })),
            });
          }
        }
      }

      for (const entry of benefitEntries) {
        const created = await tx.benefitEntry.create({ data: entry.data });
        if (entry.healthLimits.length > 0) {
          for (const hl of entry.healthLimits) {
            await tx.healthLimit.create({
              data: {
                benefitEntryId: created.id,
                limitType: hl.limitType,
                hasLimit: hl.hasLimit,
                limitAmount: hl.limitAmount,
                limitCurrency: hl.limitCurrency,
              },
            });
          }
        }
      }

      // 5. Delete + recreate CategoryExclusions with country
      await tx.categoryExclusion.deleteMany({ where: { companyId } });

      const exclusions: Parameters<typeof tx.categoryExclusion.create>[0]["data"][] = [];

      for (const [country, categories] of Object.entries(
        data.step2.countriesData
      )) {
        for (const [category, catData] of Object.entries(categories)) {
          if (catData.notOffered) {
            exclusions.push({
              companyId,
              country,
              benefitCategory: category as BenefitCategory,
              isCore: true,
            });
          }
        }
      }

      for (const [country, categories] of Object.entries(
        data.step3.countriesData
      )) {
        for (const [category, catData] of Object.entries(categories)) {
          if (catData.notOffered) {
            exclusions.push({
              companyId,
              country,
              benefitCategory: category as BenefitCategory,
              isCore: false,
            });
          }
        }
      }

      for (const exclusion of exclusions) {
        await tx.categoryExclusion.create({ data: exclusion });
      }

      // 6. Upsert PlatformInfo from Step 4
      const existingPlatform = await tx.platformInfo.findFirst({
        where: { companyId },
      });

      const platformData = {
        usesPlatform: data.step4.usesPlatform,
        platformName: data.step4.platformName || null,
        platformType: data.step4.platformType
          ? (data.step4.platformType as "FLEX_BENEFITS" | "TOTAL_REWARD" | "VOLUNTARY" | "DISCOUNT" | "WELLBEING" | "OTHER")
          : null,
        annualPlatformFee: data.step4.annualPlatformFee,
        feeCurrency: data.step4.feeCurrency || "EUR",
        feeModel: data.step4.feeModel
          ? (data.step4.feeModel as "PER_EMPLOYEE_PER_MONTH" | "PER_EMPLOYEE_PER_YEAR" | "FLAT_FEE" | "PERCENTAGE" | "OTHER")
          : null,
        platformSatisfactionScore: data.step4.platformSatisfactionScore,
        usesTotalRewardPlatform: data.step4.usesTotalRewardPlatform,
        totalRewardPlatformName: data.step4.totalRewardPlatformName || null,
        otherHRTechPlatforms: data.step4.otherHRTechPlatforms || null,
      };

      if (existingPlatform) {
        await tx.platformInfo.update({
          where: { id: existingPlatform.id },
          data: platformData,
        });
      } else {
        await tx.platformInfo.create({
          data: { ...platformData, companyId },
        });
      }

      // 7. Mark SurveyDraft as SUBMITTED
      await tx.surveyDraft.upsert({
        where: { companyId },
        update: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          data: body,
        },
        create: {
          companyId,
          status: "SUBMITTED",
          submittedAt: new Date(),
          data: body,
          currentStep: 5,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error submitting survey:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
