import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { BenefitCategory } from "@prisma/client";

const createSchema = z.object({
  country: z.string().length(2),
  limitType: z.enum([
    "TAX_RELIEF_CAP",
    "CONTRIBUTION_LIMIT",
    "INSURABLE_EARNINGS_CEILING",
    "SOCIAL_SECURITY_CAP",
    "BENEFIT_IN_KIND_THRESHOLD",
    "OTHER",
  ]),
  benefitCategory: z.string().nullable().optional(),
  description: z.string().min(1),
  limitValue: z.string().min(1),
  currency: z.string().nullable().optional(),
  taxYear: z.string().min(1),
  legalReference: z.string().nullable().optional(),
});

const updateSchema = createSchema.extend({
  id: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const country = req.nextUrl.searchParams.get("country");
    const taxYear = req.nextUrl.searchParams.get("taxYear");

    if (!country) {
      return NextResponse.json({ error: "Country parameter required" }, { status: 400 });
    }

    const where: Record<string, unknown> = { country };
    if (taxYear) where.taxYear = taxYear;

    const limits = await prisma.countryStatutoryLimit.findMany({
      where,
      include: {
        contributedBy: { select: { name: true, email: true } },
      },
      orderBy: [{ taxYear: "desc" }, { limitType: "asc" }],
    });

    return NextResponse.json(limits);
  } catch (error) {
    console.error("Error fetching limits:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "BROKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    const profile = await prisma.brokerProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!profile?.countriesActive.includes(data.country)) {
      return NextResponse.json(
        { error: "You are not active in this country" },
        { status: 403 }
      );
    }

    const limit = await prisma.countryStatutoryLimit.create({
      data: {
        country: data.country,
        limitType: data.limitType,
        benefitCategory: (data.benefitCategory as BenefitCategory) || null,
        description: data.description,
        limitValue: data.limitValue,
        currency: data.currency || null,
        taxYear: data.taxYear,
        legalReference: data.legalReference || null,
        contributedById: session.user.id,
      },
    });

    return NextResponse.json(limit, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    console.error("Error creating limit:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "BROKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.countryStatutoryLimit.findUnique({
      where: { id: data.id },
    });

    if (!existing || existing.contributedById !== session.user.id) {
      return NextResponse.json({ error: "Not found or not your contribution" }, { status: 403 });
    }

    const updated = await prisma.countryStatutoryLimit.update({
      where: { id: data.id },
      data: {
        limitType: data.limitType,
        benefitCategory: (data.benefitCategory as BenefitCategory) || null,
        description: data.description,
        limitValue: data.limitValue,
        currency: data.currency || null,
        taxYear: data.taxYear,
        legalReference: data.legalReference || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    console.error("Error updating limit:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "BROKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const existing = await prisma.countryStatutoryLimit.findUnique({
      where: { id },
    });

    if (!existing || existing.contributedById !== session.user.id) {
      return NextResponse.json({ error: "Not found or not your contribution" }, { status: 403 });
    }

    if (existing.verifiedByAdmin) {
      return NextResponse.json({ error: "Cannot delete verified items" }, { status: 403 });
    }

    await prisma.countryStatutoryLimit.delete({ where: { id } });

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting limit:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
