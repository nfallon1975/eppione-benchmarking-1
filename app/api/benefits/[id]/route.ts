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
  annualCostPerEmployee: z.number().positive().nullable().optional(),
  costCurrency: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
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

    const { companyId } = session.user;

    if (!companyId) {
      return NextResponse.json(
        { error: "No company associated with this account" },
        { status: 404 }
      );
    }

    const { id } = params;

    // Verify the benefit belongs to the user's company
    const existingBenefit = await prisma.benefitEntry.findUnique({
      where: { id },
    });

    if (!existingBenefit) {
      return NextResponse.json(
        { error: "Benefit not found" },
        { status: 404 }
      );
    }

    if (existingBenefit.companyId !== companyId) {
      return NextResponse.json(
        { error: "You do not have permission to update this benefit" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = updateBenefitSchema.parse(body);

    const benefit = await prisma.benefitEntry.update({
      where: { id },
      data,
    });

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

    const { companyId } = session.user;

    if (!companyId) {
      return NextResponse.json(
        { error: "No company associated with this account" },
        { status: 404 }
      );
    }

    const { id } = params;

    // Verify the benefit belongs to the user's company
    const existingBenefit = await prisma.benefitEntry.findUnique({
      where: { id },
    });

    if (!existingBenefit) {
      return NextResponse.json(
        { error: "Benefit not found" },
        { status: 404 }
      );
    }

    if (existingBenefit.companyId !== companyId) {
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
