import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { clientBenefitRowSchema, type ClientBenefitUploadRow } from "@/lib/upload-schemas";
import { BenefitCategory, PlanType } from "@prisma/client";
import { ensureCountryConfigs } from "@/lib/country-config";

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const requestSchema = z.object({
  companyId: z.string().optional(),
  rows: z.array(clientBenefitRowSchema),
  replaceExisting: z.boolean(),
});

// ---------------------------------------------------------------------------
// Column mapping template (returned by GET)
// ---------------------------------------------------------------------------

const COLUMN_TEMPLATE = {
  required: [
    { column: "country", type: "string", description: "2-character ISO country code (e.g. GB, IE, DE)" },
    { column: "benefitCategory", type: "string", description: "Benefit category enum: HEALTH, LIFE, INCOME_PROTECTION, CRITICAL_ILLNESS, DENTAL, VISION, PENSION, ANNUAL_LEAVE, SICK_PAY, MATERNITY_PAY, PATERNITY_PAY, OTHER" },
    { column: "benefitName", type: "string", description: "Name of the benefit (e.g. Private Medical Insurance)" },
    { column: "coverLevel", type: "string", description: "Cover level description (e.g. 2x salary, 75% of salary)" },
    { column: "isCore", type: "boolean", description: "Whether this is a core (non-optional) benefit" },
  ],
  optional: [
    { column: "employerFunded", type: "boolean", description: "Whether the employer funds this benefit (default: true)" },
    { column: "isVoluntary", type: "boolean", description: "Whether this is a voluntary/opt-in benefit" },
    { column: "isFlexible", type: "boolean", description: "Whether this is part of a flex plan" },
    { column: "coversSpouse", type: "boolean", description: "Whether spouse is covered" },
    { column: "coversDependents", type: "boolean", description: "Whether dependents are covered" },
    { column: "provider", type: "string", description: "Insurance provider / carrier name" },
    { column: "annualCostPerEmployee", type: "number", description: "Annual cost per employee" },
    { column: "costCurrency", type: "string", description: "Currency code for costs (default: EUR)" },
    { column: "employeeContributionPercent", type: "number", description: "Employee contribution percentage (0-100)" },
    { column: "notes", type: "string", description: "Free text notes" },
    // Plan Design
    { column: "deductibleAmount", type: "number", description: "Deductible / excess amount" },
    { column: "deductibleCurrency", type: "string", description: "Currency for deductible" },
    { column: "coPayPercent", type: "number", description: "Co-pay percentage (0-100)" },
    { column: "coPayMaxAmount", type: "number", description: "Maximum co-pay cap" },
    { column: "sumInsured", type: "number", description: "Total sum insured" },
    { column: "sumInsuredCurrency", type: "string", description: "Currency for sum insured" },
    { column: "coverMultiple", type: "number", description: "Cover multiple (e.g. 2.0 for 2x salary)" },
    { column: "coverMultipleBase", type: "string", description: "Base for cover multiple: BASIC_SALARY, ANNUAL_CTC, FIXED_AMOUNT" },
    { column: "roomCategory", type: "string", description: "Room category: PRIVATE, SEMI_PRIVATE, STANDARD" },
    { column: "waitingPeriodDays", type: "number", description: "Waiting period in days" },
    { column: "benefitMaxAnnual", type: "number", description: "Annual maximum benefit amount" },
    { column: "benefitMaxCurrency", type: "string", description: "Currency for annual max" },
    { column: "reimbursementPercent", type: "number", description: "Reimbursement percentage (0-100)" },
    { column: "benefitDurationDays", type: "number", description: "Maximum benefit duration in days" },
    { column: "eliminationPeriodDays", type: "number", description: "Elimination/qualifying period in days" },
    // Coverage Scope
    { column: "insuredLives", type: "number", description: "Total insured lives" },
    { column: "dependentCoverageType", type: "string", description: "NONE, SPOUSE_ONLY, FAMILY, CHILDREN_ONLY" },
    { column: "maxDependentsPerEmployee", type: "number", description: "Max dependents per employee" },
    { column: "coverageScope", type: "string", description: "LOCAL, NATIONAL, REGIONAL, WORLDWIDE" },
    { column: "networkType", type: "string", description: "PANEL, NON_PANEL, BOTH, OPEN_ACCESS" },
    { column: "hospitalLevel", type: "string", description: "EXECUTIVE, PRIVATE, SEMI_PRIVATE, STANDARD, ANY" },
    // Regulatory & Tax
    { column: "mandatoryClassification", type: "string", description: "MANDATORY, SUPPLEMENTAL, HYBRID" },
    { column: "taxTreatment", type: "string", description: "INCLUDES_TAX, EXCLUDES_TAX, TAX_EXEMPT" },
    { column: "taxRatePercent", type: "number", description: "Local tax rate on premiums (0-100)" },
    { column: "employeeEligibility", type: "string", description: "ALL_EMPLOYEES, MANAGERS_ONLY, DIRECTORS_ONLY, CUSTOM" },
    { column: "eligibilityNotes", type: "string", description: "Free text eligibility notes" },
    // Carrier & Broker
    { column: "carrierTerminationNoticeDays", type: "number", description: "Notice period in days to switch carrier" },
    { column: "brokerCommissionPercent", type: "number", description: "Broker commission rate (0-100)" },
    { column: "brokerFee", type: "number", description: "Broker fee amount" },
    { column: "brokerFeeCurrency", type: "string", description: "Currency for broker fee" },
    // Pooling
    { column: "inMultinationalPool", type: "boolean", description: "Whether benefit is in a multinational pool" },
    { column: "poolProviderName", type: "string", description: "Pool provider name (e.g. Swiss Re Network)" },
    // Bundling / Riders
    { column: "isRider", type: "boolean", description: "Whether this is a rider on another benefit" },
    { column: "riderDescription", type: "string", description: "Description of the rider" },
    // Health-specific
    { column: "healthExcess", type: "number", description: "Health insurance excess/deductible" },
    { column: "healthCopayPercent", type: "number", description: "Health co-pay percentage (0-100)" },
    { column: "healthInpatientLimit", type: "number", description: "Health inpatient limit amount" },
    { column: "healthOutpatientLimit", type: "number", description: "Health outpatient limit amount" },
    // Life-specific
    { column: "lifeCoverMultiple", type: "number", description: "Life cover multiple (e.g. 4.0)" },
    { column: "lifeFixedCoverAmount", type: "number", description: "Life fixed cover amount" },
    { column: "lifeFreeCoverLimit", type: "number", description: "Free cover limit" },
    // Income Protection
    { column: "ipBenefitPercent", type: "number", description: "IP benefit as % of salary (0-100)" },
    { column: "ipWaitingPeriodWeeks", type: "number", description: "IP waiting period in weeks" },
    { column: "ipMaxBenefitAge", type: "number", description: "Maximum age for IP benefit" },
    // Critical Illness
    { column: "ciCoverMultiple", type: "number", description: "CI cover multiple" },
    { column: "ciFixedCoverAmount", type: "number", description: "CI fixed cover amount" },
    // Dental
    { column: "dentalAnnualLimit", type: "number", description: "Dental annual limit" },
    { column: "dentalOrthoIncluded", type: "boolean", description: "Whether orthodontics is included" },
    { column: "dentalAnnualMax", type: "number", description: "Dental annual maximum" },
    { column: "dentalPreventiveCoverage", type: "boolean", description: "Preventive coverage included" },
    { column: "dentalMajorCoverage", type: "boolean", description: "Major dental coverage included" },
    // Vision
    { column: "visionAnnualMax", type: "number", description: "Vision annual maximum" },
    { column: "visionExamCovered", type: "boolean", description: "Vision exam covered" },
    // Pension
    { column: "pensionEmployerPct", type: "number", description: "Pension employer contribution % (0-100)" },
    { column: "pensionEmployeePct", type: "number", description: "Pension employee contribution % (0-100)" },
    { column: "pensionPlanType", type: "string", description: "Pension plan type" },
    { column: "pensionContributionRateEmployer", type: "number", description: "Employer contribution rate %" },
    { column: "pensionContributionRateEmployee", type: "number", description: "Employee contribution rate %" },
    { column: "pensionDeathBenefitMultiple", type: "number", description: "Death benefit multiple" },
    // Annual Leave
    { column: "leaveDaysEntitlement", type: "number", description: "Leave days entitlement" },
    { column: "leaveIncludesPublicHolidays", type: "boolean", description: "Includes public holidays" },
    { column: "leaveIncreasesWithTenure", type: "boolean", description: "Leave increases with tenure" },
    { column: "leaveMaxDays", type: "number", description: "Maximum leave days" },
    { column: "leaveBuySellDays", type: "boolean", description: "Buy/sell days available" },
    { column: "leaveCarryOverDays", type: "number", description: "Carry-over days allowed" },
    { column: "leaveBirthdayOff", type: "boolean", description: "Birthday off benefit" },
    { column: "leaveVolunteerDays", type: "number", description: "Volunteer days per year" },
    { column: "leaveChristmasClosureDays", type: "number", description: "Christmas closure days" },
    // Sick Pay
    { column: "sickPayFullPayWeeks", type: "number", description: "Sick pay full pay weeks" },
    { column: "sickPayHalfPayWeeks", type: "number", description: "Sick pay half pay weeks" },
    { column: "sickPayPartialPayPercent", type: "number", description: "Partial pay rate if not 50%" },
    { column: "sickPayWaitingDays", type: "number", description: "Waiting days before sick pay" },
    { column: "sickPayAboveStatutory", type: "boolean", description: "Above statutory minimum" },
    // Maternity
    { column: "maternityFullPayWeeks", type: "number", description: "Maternity full pay weeks" },
    { column: "maternityPartialPayWeeks", type: "number", description: "Maternity partial pay weeks" },
    { column: "maternityPartialPayPercent", type: "number", description: "Maternity partial pay %" },
    { column: "maternityTotalLeaveWeeks", type: "number", description: "Total maternity leave weeks" },
    { column: "maternityAboveStatutory", type: "boolean", description: "Above statutory minimum" },
    { column: "maternityKitDays", type: "number", description: "Keeping In Touch days" },
    { column: "maternityGradualReturn", type: "boolean", description: "Phased return option" },
    { column: "maternityNormalDelivery", type: "number", description: "Cover amount for normal delivery" },
    { column: "maternityCSection", type: "number", description: "Cover amount for C-section" },
    { column: "maternityCurrency", type: "string", description: "Currency for maternity amounts" },
    // Paternity
    { column: "paternityFullPayWeeks", type: "number", description: "Paternity full pay weeks" },
    { column: "paternityPartialPayWeeks", type: "number", description: "Paternity partial pay weeks" },
    { column: "paternityPartialPayPercent", type: "number", description: "Paternity partial pay %" },
    { column: "paternityTotalLeaveWeeks", type: "number", description: "Total paternity leave weeks" },
    { column: "paternityAboveStatutory", type: "boolean", description: "Above statutory minimum" },
    { column: "paternitySharedParentalLeave", type: "boolean", description: "Shared parental leave available" },
    // Policy Metadata
    { column: "policyContractLength", type: "number", description: "Contract length in years" },
    { column: "lastRenewalOutcome", type: "string", description: "RENEWED_AS_IS, RENEWED_WITH_CHANGES, REMARKET, NEW_PLACEMENT" },
  ],
};

// ---------------------------------------------------------------------------
// GET - Return the column mapping template
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      template: COLUMN_TEMPLATE,
    });
  } catch (error) {
    console.error("Error fetching platform import template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST - Import pre-parsed benefit rows for a company
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = session.user;
    if (!["ADMIN", "BROKER", "CLIENT"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = requestSchema.parse(body);
    const { rows, replaceExisting } = parsed;

    // Resolve companyId based on role
    let companyId: string;
    if (role === "CLIENT") {
      if (!session.user.companyId) {
        return NextResponse.json(
          { error: "No company associated with this account" },
          { status: 404 }
        );
      }
      companyId = session.user.companyId;
    } else {
      // ADMIN or BROKER — companyId must be provided
      if (!parsed.companyId) {
        return NextResponse.json(
          { error: "companyId is required for admin/broker imports" },
          { status: 400 }
        );
      }
      companyId = parsed.companyId;
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No benefit rows provided" },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      return NextResponse.json(
        { error: `Company not found: ${companyId}` },
        { status: 404 }
      );
    }

    // Ensure CountryConfig exists for all countries in the import
    const allCountries = Array.from(
      new Set(rows.map((r) => r.country.toUpperCase()))
    );
    await ensureCountryConfigs(allCountries);

    // Group rows by country for processing
    const byCountry = new Map<string, ClientBenefitUploadRow[]>();
    for (const row of rows) {
      const country = row.country.toUpperCase();
      if (!byCountry.has(country)) byCountry.set(country, []);
      byCountry.get(country)!.push(row);
    }

    const countries = Array.from(byCountry.keys());
    const categoriesSet = new Set<string>();
    const warnings: string[] = [];
    const errors: { row: number; message: string }[] = [];
    let entriesCreated = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Create/update CompanyCountryProfile per country
      for (const country of countries) {
        await tx.companyCountryProfile.upsert({
          where: { companyId_country: { companyId, country } },
          create: { companyId, country },
          update: {},
        });
      }

      // 2. If replaceExisting, delete existing BenefitEntries for overlapping countries
      if (replaceExisting) {
        const deleted = await tx.benefitEntry.deleteMany({
          where: { companyId, country: { in: countries } },
        });
        if (deleted.count > 0) {
          warnings.push(
            `Replaced ${deleted.count} existing benefit entries for countries: ${countries.join(", ")}`
          );
        }
      }

      // 3. Create BenefitEntry records
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const category = row.benefitCategory as BenefitCategory;
          categoriesSet.add(category);

          const createdEntry = await tx.benefitEntry.create({
            data: {
              companyId,
              benefitCategory: category,
              country: row.country.toUpperCase(),
              benefitName: row.benefitName,
              coverLevel: row.coverLevel,
              employerFunded: row.employerFunded,
              employeeContributionPercent: row.employeeContributionPercent,
              coversSpouse: row.coversSpouse,
              coversDependents: row.coversDependents,
              isCore: row.isCore,
              isVoluntary: row.isVoluntary,
              isFlexible: row.isFlexible,
              surveySource: false,
              provider: row.provider || null,
              annualCostPerEmployee: row.annualCostPerEmployee,
              costCurrency: row.costCurrency || "EUR",
              notes: row.notes || null,
              // Health-specific
              healthExcess: row.healthExcess,
              healthCopayPercent: row.healthCopayPercent,
              healthInpatientLimit: row.healthInpatientLimit,
              healthOutpatientLimit: row.healthOutpatientLimit,
              // Life-specific
              lifeCoverMultiple: row.lifeCoverMultiple,
              lifeFixedCoverAmount: row.lifeFixedCoverAmount,
              lifeFreeCoverLimit: row.lifeFreeCoverLimit,
              // Income Protection
              ipBenefitPercent: row.ipBenefitPercent,
              ipWaitingPeriodWeeks: row.ipWaitingPeriodWeeks,
              ipMaxBenefitAge: row.ipMaxBenefitAge,
              // Critical Illness
              ciCoverMultiple: row.ciCoverMultiple,
              ciFixedCoverAmount: row.ciFixedCoverAmount,
              // Dental
              dentalAnnualLimit: row.dentalAnnualLimit,
              dentalOrthoIncluded: row.dentalOrthoIncluded,
              dentalAnnualMax: row.dentalAnnualMax,
              dentalPreventiveCoverage: row.dentalPreventiveCoverage,
              dentalMajorCoverage: row.dentalMajorCoverage,
              // Vision
              visionAnnualMax: row.visionAnnualMax,
              visionExamCovered: row.visionExamCovered,
              // Pension
              pensionEmployerPct: row.pensionEmployerPct,
              pensionEmployeePct: row.pensionEmployeePct,
              pensionPlanType: row.pensionPlanType && Object.values(PlanType).includes(row.pensionPlanType as PlanType) ? (row.pensionPlanType as PlanType) : null,
              pensionContributionRateEmployer: row.pensionContributionRateEmployer,
              pensionContributionRateEmployee: row.pensionContributionRateEmployee,
              pensionDeathBenefitMultiple: row.pensionDeathBenefitMultiple,
              // Annual Leave
              leaveDaysEntitlement: row.leaveDaysEntitlement,
              leaveIncludesPublicHolidays: row.leaveIncludesPublicHolidays,
              leaveIncreasesWithTenure: row.leaveIncreasesWithTenure,
              leaveMaxDays: row.leaveMaxDays,
              leaveBuySellDays: row.leaveBuySellDays,
              leaveCarryOverDays: row.leaveCarryOverDays,
              leaveBirthdayOff: row.leaveBirthdayOff,
              leaveVolunteerDays: row.leaveVolunteerDays,
              leaveChristmasClosureDays: row.leaveChristmasClosureDays,
              // Sick Pay
              sickPayFullPayWeeks: row.sickPayFullPayWeeks,
              sickPayHalfPayWeeks: row.sickPayHalfPayWeeks,
              sickPayPartialPayPercent: row.sickPayPartialPayPercent,
              sickPayWaitingDays: row.sickPayWaitingDays,
              sickPayAboveStatutory: row.sickPayAboveStatutory,
              // Maternity Pay
              maternityFullPayWeeks: row.maternityFullPayWeeks,
              maternityPartialPayWeeks: row.maternityPartialPayWeeks,
              maternityPartialPayPercent: row.maternityPartialPayPercent,
              maternityTotalLeaveWeeks: row.maternityTotalLeaveWeeks,
              maternityAboveStatutory: row.maternityAboveStatutory,
              maternityKitDays: row.maternityKitDays,
              maternityGradualReturn: row.maternityGradualReturn,
              maternityNormalDelivery: row.maternityNormalDelivery,
              maternityCSection: row.maternityCSection,
              maternityCurrency: row.maternityCurrency,
              // Paternity Pay
              paternityFullPayWeeks: row.paternityFullPayWeeks,
              paternityPartialPayWeeks: row.paternityPartialPayWeeks,
              paternityPartialPayPercent: row.paternityPartialPayPercent,
              paternityTotalLeaveWeeks: row.paternityTotalLeaveWeeks,
              paternityAboveStatutory: row.paternityAboveStatutory,
              paternitySharedParentalLeave: row.paternitySharedParentalLeave,
              // Plan Design
              deductibleAmount: row.deductibleAmount,
              deductibleCurrency: row.deductibleCurrency,
              coPayPercent: row.coPayPercent,
              coPayMaxAmount: row.coPayMaxAmount,
              sumInsured: row.sumInsured,
              sumInsuredCurrency: row.sumInsuredCurrency,
              coverMultiple: row.coverMultiple,
              coverMultipleBase: row.coverMultipleBase,
              roomCategory: row.roomCategory,
              waitingPeriodDays: row.waitingPeriodDays,
              benefitMaxAnnual: row.benefitMaxAnnual,
              benefitMaxCurrency: row.benefitMaxCurrency,
              reimbursementPercent: row.reimbursementPercent,
              benefitDurationDays: row.benefitDurationDays,
              eliminationPeriodDays: row.eliminationPeriodDays,
              // Coverage Scope
              insuredLives: row.insuredLives,
              dependentCoverageType: row.dependentCoverageType,
              maxDependentsPerEmployee: row.maxDependentsPerEmployee,
              coverageScope: row.coverageScope,
              networkType: row.networkType,
              hospitalLevel: row.hospitalLevel,
              // Regulatory & Tax
              mandatoryClassification: row.mandatoryClassification,
              taxTreatment: row.taxTreatment,
              taxRatePercent: row.taxRatePercent,
              employeeEligibility: row.employeeEligibility,
              eligibilityNotes: row.eligibilityNotes,
              // Carrier & Broker
              carrierTerminationNoticeDays: row.carrierTerminationNoticeDays,
              brokerCommissionPercent: row.brokerCommissionPercent,
              brokerFee: row.brokerFee,
              brokerFeeCurrency: row.brokerFeeCurrency,
              // Pooling
              inMultinationalPool: row.inMultinationalPool,
              poolProviderName: row.poolProviderName,
              // Bundling / Riders
              isRider: row.isRider,
              parentBenefitEntryId: row.parentBenefitEntryId,
              riderDescription: row.riderDescription,
              // Policy Metadata
              policyContractLength: row.policyContractLength,
              lastRenewalOutcome: row.lastRenewalOutcome,
            },
          });

          // Create HealthLimit records for HEALTH category
          if (row.benefitCategory === "HEALTH") {
            if (row.healthInpatientLimit != null) {
              await tx.healthLimit.create({
                data: {
                  benefitEntryId: createdEntry.id,
                  limitType: "INPATIENT",
                  hasLimit: true,
                  limitAmount: row.healthInpatientLimit,
                  limitCurrency: row.costCurrency || "EUR",
                },
              });
            }
            if (row.healthOutpatientLimit != null) {
              await tx.healthLimit.create({
                data: {
                  benefitEntryId: createdEntry.id,
                  limitType: "OUTPATIENT",
                  hasLimit: true,
                  limitAmount: row.healthOutpatientLimit,
                  limitCurrency: row.costCurrency || "EUR",
                },
              });
            }
          }

          entriesCreated++;
        } catch (rowError) {
          errors.push({
            row: i + 1,
            message:
              rowError instanceof Error
                ? rowError.message
                : "Unknown error creating benefit entry",
          });
        }
      }

      // 4. Update Company.surveyCompletedAt
      await tx.company.update({
        where: { id: companyId },
        data: { surveyCompletedAt: new Date() },
      });
    });

    return NextResponse.json({
      success: true,
      summary: {
        entriesCreated,
        countriesProcessed: countries,
        categoriesProcessed: Array.from(categoriesSet),
        warnings,
        errors,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error in platform import:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
