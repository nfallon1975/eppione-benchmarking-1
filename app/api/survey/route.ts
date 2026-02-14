import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  SurveyData,
  createEmptySurveyData,
  createEmptyCategory,
  BenefitFormData,
} from "@/lib/survey-types";
import { BenefitCategory } from "@prisma/client";
import { ensureCountryConfigs } from "@/lib/country-config";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = session.user;

    if (!companyId) {
      return NextResponse.json(
        { error: "No company associated with this account" },
        { status: 404 }
      );
    }

    // Load existing draft
    const draft = await prisma.surveyDraft.findUnique({
      where: { companyId },
    });

    // Load country configs
    const countryConfigs = await prisma.countryConfig.findMany({
      orderBy: { countryName: "asc" },
    });

    if (draft) {
      // Check if the draft is in old format and migrate if needed
      const draftData = draft.data as Record<string, unknown>;
      if (
        draftData?.step1 &&
        typeof draftData.step1 === "object" &&
        "country" in (draftData.step1 as Record<string, unknown>) &&
        !("countries" in (draftData.step1 as Record<string, unknown>))
      ) {
        // Old format — migrate on the fly (client will also handle this)
        const oldStep1 = draftData.step1 as {
          country: string;
          industrySector: string;
          industryCode: string;
          employeeCountRange: string;
          averageSalary: number | null;
          averageSalaryCurrency: string;
          averageBonusPercent: number | null;
          financialYearEndMonth: number | null;
        };

        const country = oldStep1.country;
        const migratedData: SurveyData = {
          step1: {
            industrySector: oldStep1.industrySector,
            industryCode: oldStep1.industryCode,
            countries: country
              ? [
                  {
                    country,
                    employeeCountRange: oldStep1.employeeCountRange,
                    averageSalary: oldStep1.averageSalary,
                    averageSalaryCurrency: oldStep1.averageSalaryCurrency,
                    averageBonusPercent: oldStep1.averageBonusPercent,
                    financialYearEndMonth: oldStep1.financialYearEndMonth,
                  },
                ]
              : [],
            benefitBudget: null,
            benefitBudgetCurrency: "EUR",
            averageWorkforceAge: null,
            desiredNewBenefits: "",
          },
          step2: {
            countriesData: country
              ? {
                  [country]: (draftData.step2 as { categories: Record<string, unknown> })
                    ?.categories || {},
                }
              : {},
          },
          step3: {
            countriesData: country
              ? {
                  [country]: (draftData.step3 as { categories: Record<string, unknown> })
                    ?.categories || {},
                }
              : {},
          },
          step4: draftData.step4 as SurveyData["step4"],
        };

        return NextResponse.json({
          draft: { ...draft, data: migratedData },
          countryConfigs,
        });
      }

      return NextResponse.json({ draft, countryConfigs });
    }

    // No draft — construct initial state from existing data
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        benefitEntries: { include: { healthLimits: true } },
        platformInfo: { take: 1, orderBy: { createdAt: "desc" } },
        countryProfiles: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const surveyData: SurveyData = createEmptySurveyData();

    // Pre-populate step 1 from company
    const industrySector = company.industry ? company.industry.charAt(0) : "";
    surveyData.step1.industrySector = industrySector;
    surveyData.step1.industryCode = company.industry || "";
    surveyData.step1.benefitBudget = company.benefitBudget ?? null;
    surveyData.step1.benefitBudgetCurrency = company.benefitBudgetCurrency || "EUR";
    surveyData.step1.averageWorkforceAge = company.averageWorkforceAge ?? null;
    surveyData.step1.desiredNewBenefits = company.desiredNewBenefits || "";

    // Build countries from CompanyCountryProfile records
    if (company.countryProfiles.length > 0) {
      surveyData.step1.countries = company.countryProfiles.map((cp) => ({
        country: cp.country,
        employeeCountRange: cp.employeeCountRange || "",
        averageSalary: cp.averageSalary ?? null,
        averageSalaryCurrency: cp.averageSalaryCurrency || "EUR",
        averageBonusPercent: cp.averageBonusPercent ?? null,
        financialYearEndMonth: cp.financialYearEndMonth ?? null,
      }));
    } else if (company.country) {
      // Fallback to single company fields
      surveyData.step1.countries = [
        {
          country: company.country,
          employeeCountRange: company.employeeCountRange || "",
          averageSalary: company.averageSalary ?? null,
          averageSalaryCurrency: company.averageSalaryCurrency || "EUR",
          averageBonusPercent: company.averageBonusPercent ?? null,
          financialYearEndMonth: company.financialYearEndMonth ?? null,
        },
      ];
    }

    // Pre-populate step 2 (core benefits) grouped by country
    for (const entry of company.benefitEntries.filter((b) => b.isCore)) {
      const cat = entry.benefitCategory as BenefitCategory;
      const entryCountry = entry.country || company.country || "";

      if (!surveyData.step2.countriesData[entryCountry]) {
        surveyData.step2.countriesData[entryCountry] = {};
      }
      if (!surveyData.step2.countriesData[entryCountry]![cat]) {
        surveyData.step2.countriesData[entryCountry]![cat] = createEmptyCategory();
      }
      surveyData.step2.countriesData[entryCountry]![cat]!.benefits.push(
        benefitEntryToFormData(entry)
      );
    }

    // Pre-populate step 3 (flex/voluntary benefits) grouped by country
    for (const entry of company.benefitEntries.filter(
      (b) => !b.isCore || b.isVoluntary
    )) {
      const cat = entry.benefitCategory as BenefitCategory;
      const entryCountry = entry.country || company.country || "";

      if (!surveyData.step3.countriesData[entryCountry]) {
        surveyData.step3.countriesData[entryCountry] = {};
      }
      if (!surveyData.step3.countriesData[entryCountry]![cat]) {
        surveyData.step3.countriesData[entryCountry]![cat] = createEmptyCategory();
      }
      surveyData.step3.countriesData[entryCountry]![cat]!.benefits.push(
        benefitEntryToFormData(entry)
      );
    }

    // Pre-populate step 4 from platform info
    const platform = company.platformInfo[0];
    if (platform) {
      surveyData.step4 = {
        usesPlatform: platform.usesPlatform,
        platformName: platform.platformName || "",
        platformType: platform.platformType || "",
        annualPlatformFee: platform.annualPlatformFee ?? null,
        feeCurrency: platform.feeCurrency || "EUR",
        feeModel: platform.feeModel || "",
        platformSatisfactionScore: platform.platformSatisfactionScore ?? null,
        usesTotalRewardPlatform: platform.usesTotalRewardPlatform,
        totalRewardPlatformName: platform.totalRewardPlatformName || "",
        otherHRTechPlatforms: platform.otherHRTechPlatforms || "",
      };
    }

    return NextResponse.json({
      draft: null,
      initialData: surveyData,
      countryConfigs,
    });
  } catch (error) {
    console.error("Error fetching survey:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.companyRole === "VIEWER") {
      return NextResponse.json(
        { error: "Viewers cannot edit survey data" },
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
    const { currentStep, data } = body;

    // Auto-create CountryConfig for any new countries in the draft
    if (data?.step1?.countries && Array.isArray(data.step1.countries)) {
      const countryCodes = data.step1.countries
        .map((c: { country: string }) => c.country)
        .filter(Boolean);
      if (countryCodes.length > 0) {
        await ensureCountryConfigs(countryCodes);
      }
    }

    const draft = await prisma.surveyDraft.upsert({
      where: { companyId },
      update: {
        currentStep: currentStep ?? 1,
        data: data ?? {},
        status: "DRAFT",
      },
      create: {
        companyId,
        currentStep: currentStep ?? 1,
        data: data ?? {},
        status: "DRAFT",
      },
    });

    return NextResponse.json(draft);
  } catch (error) {
    console.error("Error saving survey draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function benefitEntryToFormData(entry: {
  id: string;
  benefitName: string;
  coverLevel: string;
  employerFunded: boolean;
  employeeContributionPercent: number | null;
  coversSpouse: boolean;
  coversDependents: boolean;
  maxDependents: number | null;
  isFlexible: boolean;
  flexFundAmount: number | null;
  flexFundCurrency: string | null;
  provider: string | null;
  annualCostPerEmployee: number | null;
  costCurrency: string;
  notes: string | null;
  healthExcess?: number | null;
  healthExcessCurrency?: string;
  healthCopayPercent?: number | null;
  healthInpatientLimit?: number | null;
  healthOutpatientLimit?: number | null;
  healthLimitCurrency?: string;
  healthLimits?: { id: string; limitType: string; hasLimit: boolean; limitAmount: number | null; limitCurrency: string }[];
  lifeCoverMultiple?: number | null;
  lifeFixedCoverAmount?: number | null;
  lifeCoverAmountCurrency?: string;
  lifeFreeCoverLimit?: number | null;
  ipBenefitPercent?: number | null;
  ipWaitingPeriodWeeks?: number | null;
  ipMaxBenefitAge?: number | null;
  ciCoverMultiple?: number | null;
  ciFixedCoverAmount?: number | null;
  ciCoverAmountCurrency?: string;
  dentalAnnualLimit?: number | null;
  dentalAnnualLimitCurrency?: string;
  dentalOrthoIncluded?: boolean | null;
  pensionEmployerPct?: number | null;
  pensionEmployeePct?: number | null;
  brokerName?: string | null;
  brokerSatisfactionScore?: number | null;
  renewalDate?: Date | null;
  benefitSatisfactionScore?: number | null;
}): BenefitFormData {
  return {
    tempId: entry.id,
    benefitName: entry.benefitName,
    coverLevel: entry.coverLevel,
    employerFunded: entry.employerFunded,
    employeeContributionPercent: entry.employeeContributionPercent,
    coversSpouse: entry.coversSpouse,
    coversDependents: entry.coversDependents,
    maxDependents: entry.maxDependents,
    isFlexible: entry.isFlexible,
    flexFundAmount: entry.flexFundAmount,
    flexFundCurrency: entry.flexFundCurrency || "EUR",
    provider: entry.provider || "",
    annualCostPerEmployee: entry.annualCostPerEmployee,
    costCurrency: entry.costCurrency,
    notes: entry.notes || "",
    healthExcess: entry.healthExcess ?? null,
    healthExcessCurrency: entry.healthExcessCurrency || "EUR",
    healthCopayPercent: entry.healthCopayPercent ?? null,
    healthInpatientLimit: entry.healthInpatientLimit ?? null,
    healthOutpatientLimit: entry.healthOutpatientLimit ?? null,
    healthLimitCurrency: entry.healthLimitCurrency || "EUR",
    healthLimits: (entry.healthLimits ?? []).map((hl) => ({
      tempId: hl.id,
      limitType: hl.limitType,
      customLimitName: "",
      hasLimit: hl.hasLimit,
      limitAmount: hl.limitAmount,
      limitCurrency: hl.limitCurrency,
    })),
    lifeCoverMultiple: entry.lifeCoverMultiple ?? null,
    lifeFixedCoverAmount: entry.lifeFixedCoverAmount ?? null,
    lifeCoverAmountCurrency: entry.lifeCoverAmountCurrency || "EUR",
    lifeFreeCoverLimit: entry.lifeFreeCoverLimit ?? null,
    ipBenefitPercent: entry.ipBenefitPercent ?? null,
    ipWaitingPeriodWeeks: entry.ipWaitingPeriodWeeks ?? null,
    ipMaxBenefitAge: entry.ipMaxBenefitAge ?? null,
    ciCoverMultiple: entry.ciCoverMultiple ?? null,
    ciFixedCoverAmount: entry.ciFixedCoverAmount ?? null,
    ciCoverAmountCurrency: entry.ciCoverAmountCurrency || "EUR",
    dentalAnnualLimit: entry.dentalAnnualLimit ?? null,
    dentalAnnualLimitCurrency: entry.dentalAnnualLimitCurrency || "EUR",
    dentalOrthoIncluded: entry.dentalOrthoIncluded ?? null,
    pensionEmployerPct: entry.pensionEmployerPct ?? null,
    pensionEmployeePct: entry.pensionEmployeePct ?? null,
    brokerName: entry.brokerName || "",
    brokerSatisfactionScore: entry.brokerSatisfactionScore ?? null,
    renewalDate: entry.renewalDate ? entry.renewalDate.toISOString().split("T")[0] : "",
    benefitSatisfactionScore: entry.benefitSatisfactionScore ?? null,
  };
}
