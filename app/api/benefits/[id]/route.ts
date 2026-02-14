import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const benefitCategoryEnum = z.enum([
  "HEALTH",
  "LIFE",
  "DISABILITY",
  "PENSION",
  "DENTAL",
  "VISION",
  "EAP",
  "WELLNESS",
  "INCOME_PROTECTION",
  "CRITICAL_ILLNESS",
  "TRAVEL",
  "MEAL_VOUCHERS",
  "TRANSPORT",
  "CHILDCARE",
  "EDUCATION",
  "OTHER",
]);

const updateBenefitSchema = z.object({
  benefitCategory: benefitCategoryEnum.optional(),
  country: z.string().optional(),
  benefitName: z.string().min(1).optional(),
  coverLevel: z.string().min(1).optional(),
  employerFunded: z.boolean().optional(),
  employeeContributionPercent: z.number().min(0).max(100).nullable().optional(),
  coversSpouse: z.boolean().optional(),
  coversDependents: z.boolean().optional(),
  maxDependents: z.number().int().positive().nullable().optional(),
  isCore: z.boolean().optional(),
  isVoluntary: z.boolean().optional(),
  provider: z.string().nullable().optional(),
  annualCostPerEmployee: z.number().min(0).nullable().optional(),
  costCurrency: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  healthExcess: z.number().nullable().optional(),
  healthExcessCurrency: z.string().optional(),
  healthCopayPercent: z.number().min(0).max(100).nullable().optional(),
  healthInpatientLimit: z.number().nullable().optional(),
  healthOutpatientLimit: z.number().nullable().optional(),
  healthLimitCurrency: z.string().optional(),
  healthLimits: z.array(z.object({
    limitType: z.string().min(1),
    hasLimit: z.boolean(),
    limitAmount: z.number().nullable(),
    limitCurrency: z.string().optional().default("EUR"),
  })).optional(),
  lifeCoverMultiple: z.number().nullable().optional(),
  lifeFixedCoverAmount: z.number().nullable().optional(),
  lifeCoverAmountCurrency: z.string().optional(),
  lifeFreeCoverLimit: z.number().nullable().optional(),
  ipBenefitPercent: z.number().min(0).max(100).nullable().optional(),
  ipWaitingPeriodWeeks: z.number().int().nullable().optional(),
  ipMaxBenefitAge: z.number().int().nullable().optional(),
  ciCoverMultiple: z.number().nullable().optional(),
  ciFixedCoverAmount: z.number().nullable().optional(),
  ciCoverAmountCurrency: z.string().optional(),
  dentalAnnualLimit: z.number().nullable().optional(),
  dentalAnnualLimitCurrency: z.string().optional(),
  dentalOrthoIncluded: z.boolean().nullable().optional(),
  pensionEmployerPct: z.number().min(0).max(100).nullable().optional(),
  pensionEmployeePct: z.number().min(0).max(100).nullable().optional(),
  brokerName: z.string().nullable().optional(),
  brokerSatisfactionScore: z.number().int().min(1).max(10).nullable().optional(),
  renewalDate: z.string().nullable().optional(),
  benefitSatisfactionScore: z.number().int().min(1).max(10).nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const { companyId } = session.user;

    if (!isAdmin && !companyId) {
      return NextResponse.json(
        { error: "No company associated with this account" },
        { status: 404 }
      );
    }

    const { id } = params;

    // Verify the benefit belongs to the user's company (admins can edit any)
    const existingBenefit = await prisma.benefitEntry.findUnique({
      where: { id },
    });

    if (!existingBenefit) {
      return NextResponse.json(
        { error: "Benefit not found" },
        { status: 404 }
      );
    }

    if (!isAdmin && existingBenefit.companyId !== companyId) {
      return NextResponse.json(
        { error: "You do not have permission to update this benefit" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = updateBenefitSchema.parse(body);

    const { renewalDate, healthLimits: healthLimitsData, ...restData } = data;
    const benefit = await prisma.benefitEntry.update({
      where: { id },
      data: {
        ...restData,
        ...(renewalDate !== undefined
          ? { renewalDate: renewalDate ? new Date(renewalDate) : null }
          : {}),
      },
    });

    // Delete-and-recreate HealthLimit records if provided
    if (healthLimitsData !== undefined) {
      await prisma.healthLimit.deleteMany({ where: { benefitEntryId: id } });
      for (const hl of healthLimitsData) {
        await prisma.healthLimit.create({
          data: {
            benefitEntryId: id,
            limitType: hl.limitType,
            hasLimit: hl.hasLimit,
            limitAmount: hl.hasLimit ? hl.limitAmount : null,
            limitCurrency: hl.limitCurrency,
          },
        });
      }
    }

    return NextResponse.json(benefit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating benefit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const { companyId } = session.user;

    if (!isAdmin && !companyId) {
      return NextResponse.json(
        { error: "No company associated with this account" },
        { status: 404 }
      );
    }

    const { id } = params;

    // Verify the benefit belongs to the user's company (admins can delete any)
    const existingBenefit = await prisma.benefitEntry.findUnique({
      where: { id },
    });

    if (!existingBenefit) {
      return NextResponse.json(
        { error: "Benefit not found" },
        { status: 404 }
      );
    }

    if (!isAdmin && existingBenefit.companyId !== companyId) {
      return NextResponse.json(
        { error: "You do not have permission to delete this benefit" },
        { status: 403 }
      );
    }

    await prisma.benefitEntry.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Benefit deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting benefit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
