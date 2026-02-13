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
  benefitBudget: z.number().positive().nullable().optional(),
  benefitBudgetCurrency: z.string().min(1).optional(),
  averageWorkforceAge: z.number().positive().nullable().optional(),
  desiredNewBenefits: z.string().nullable().optional(),
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
      // Return an empty shell so the company profile page can render the form
      return NextResponse.json({
        id: null,
        name: "",
        country: "",
        industry: "",
        employeeCount: 0,
        averageSalary: null,
        averageSalaryCurrency: null,
        averageBonus: null,
        averageBonusCurrency: null,
        benefitBudget: null,
        benefitBudgetCurrency: "EUR",
        averageWorkforceAge: null,
        desiredNewBenefits: null,
        benefitEntries: [],
        platformInfo: [],
      });
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

    const body = await req.json();
    const data = updateCompanySchema.parse(body);

    // If user has no company yet, create one and link it
    if (!companyId) {
      if (!data.name || !data.country || !data.industry || !data.employeeCount) {
        return NextResponse.json(
          { error: "Name, country, industry and employee count are required to create a company profile" },
          { status: 400 }
        );
      }

      const company = await prisma.company.create({
        data: {
          name: data.name,
          country: data.country,
          industry: data.industry,
          employeeCount: data.employeeCount,
          averageSalary: data.averageSalary ?? null,
          averageSalaryCurrency: data.averageSalaryCurrency ?? null,
          averageBonus: data.averageBonus ?? null,
          averageBonusCurrency: data.averageBonusCurrency ?? null,
          benefitBudget: data.benefitBudget ?? null,
          benefitBudgetCurrency: data.benefitBudgetCurrency ?? "EUR",
          averageWorkforceAge: data.averageWorkforceAge ?? null,
          desiredNewBenefits: data.desiredNewBenefits ?? null,
          users: { connect: { id: session.user.id } },
        },
      });

      return NextResponse.json(company);
    }

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
