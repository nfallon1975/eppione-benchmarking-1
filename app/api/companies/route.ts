import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  country: z.string().length(2).optional(),
  industry: z.string().min(1).optional(),
  employeeCount: z.number().int().positive().optional(),
  averageSalary: z.number().positive().nullable().optional(),
  averageSalaryCurrency: z.string().min(1).nullable().optional(),
  averageBonus: z.number().positive().nullable().optional(),
  averageBonusCurrency: z.string().min(1).nullable().optional(),
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

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        benefitEntries: true,
        platformInfo: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
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

    const body = await req.json();
    const data = updateCompanySchema.parse(body);

    const company = await prisma.company.update({
      where: { id: companyId },
      data,
    });

    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
