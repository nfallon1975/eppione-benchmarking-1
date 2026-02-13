import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { triggerComplianceCheckForCompany } from "@/lib/compliance";
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

const createBenefitSchema = z.object({
  benefitCategory: benefitCategoryEnum,
  benefitName: z.string().min(1),
  coverLevel: z.string().min(1),
  employerFunded: z.boolean().optional(),
  employeeContributionPercent: z.number().min(0).max(100).nullable().optional(),
  coversSpouse: z.boolean().optional(),
  coversDependents: z.boolean().optional(),
  maxDependents: z.number().int().positive().nullable().optional(),
  isCore: z.boolean().optional(),
  isVoluntary: z.boolean().optional(),
  provider: z.string().nullable().optional(),
  annualCostPerEmployee: z.number().positive().nullable().optional(),
  costCurrency: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  healthExcess: z.number().nullable().optional(),
  healthExcessCurrency: z.string().optional(),
  healthCopayPercent: z.number().min(0).max(100).nullable().optional(),
  healthInpatientLimit: z.number().nullable().optional(),
  healthOutpatientLimit: z.number().nullable().optional(),
  healthLimitCurrency: z.string().optional(),
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { companyId } = session.user;

    if (!companyId) {
      return NextResponse.json(
        { error: "No company associated with this account" },
        { status: 404 }
      );
    }

    const benefits = await prisma.benefitEntry.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(benefits);
  } catch (error) {
    console.error("Error fetching benefits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { companyId } = session.user;

    if (!companyId) {
      return NextResponse.json(
        { error: "No company associated with this account" },
        { status: 404 }
      );
    }

    // Verify the user belongs to the company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user || user.companyId !== companyId) {
      return NextResponse.json(
        { error: "You do not belong to this company" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = createBenefitSchema.parse(body);

    const { renewalDate, ...restData } = data;
    const benefit = await prisma.benefitEntry.create({
      data: {
        ...restData,
        renewalDate: renewalDate ? new Date(renewalDate) : null,
        companyId,
      },
    });

    // Auto-run compliance check (fire-and-forget)
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { country: true },
    });
    if (company) {
      triggerComplianceCheckForCompany(companyId, company.country).catch(() => {});
    }

    return NextResponse.json(benefit, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating benefit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
