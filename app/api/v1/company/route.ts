import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-key";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
  }

  if (!auth.scopes.includes("company:read")) {
    return NextResponse.json({ error: "Insufficient scope. Required: company:read" }, { status: 403 });
  }

  if (!auth.companyId) {
    return NextResponse.json({ error: "No company associated with this account" }, { status: 404 });
  }

  const company = await prisma.company.findUnique({
    where: { id: auth.companyId },
    include: {
      countryProfiles: {
        orderBy: { country: "asc" },
      },
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ company });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  country: z.string().length(2).optional(),
  industry: z.string().min(1).optional(),
  employeeCount: z.number().int().positive().optional(),
  employeeCountRange: z.string().optional(),
  averageSalary: z.number().positive().nullable().optional(),
  averageSalaryCurrency: z.string().optional(),
  benefitBudget: z.number().positive().nullable().optional(),
  benefitBudgetCurrency: z.string().optional(),
  averageWorkforceAge: z.number().positive().nullable().optional(),
});

export async function PUT(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
  }

  if (!auth.scopes.includes("company:write")) {
    return NextResponse.json({ error: "Insufficient scope. Required: company:write" }, { status: 403 });
  }

  if (!auth.companyId) {
    return NextResponse.json({ error: "No company associated with this account" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const updates = updateSchema.parse(body);

    const company = await prisma.company.update({
      where: { id: auth.companyId },
      data: updates,
    });

    return NextResponse.json({ company });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating company via API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
