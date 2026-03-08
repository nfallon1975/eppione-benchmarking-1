import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { BenefitCategory } from "@prisma/client";

const createSchema = z.object({
  country: z.string().length(2),
  benefitCategory: z.string().min(1),
  requirementType: z.enum(["MANDATORY", "QUASI_MANDATORY", "RECOMMENDED", "COMMON_PRACTICE"]),
  description: z.string().min(1),
  minimumLevel: z.string().nullable().optional(),
  legalReference: z.string().nullable().optional(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().nullable().optional(),
  penaltyForNonCompliance: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
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
    if (!country) {
      return NextResponse.json({ error: "Country parameter required" }, { status: 400 });
    }

    const requirements = await prisma.countryBenefitRequirement.findMany({
      where: { country },
      include: {
        contributedBy: { select: { name: true, email: true } },
      },
      orderBy: [{ benefitCategory: "asc" }, { requirementType: "asc" }],
    });

    return NextResponse.json(requirements);
  } catch (error) {
    console.error("Error fetching requirements:", error);
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

    const requirement = await prisma.countryBenefitRequirement.create({
      data: {
        country: data.country,
        benefitCategory: data.benefitCategory as BenefitCategory,
        requirementType: data.requirementType,
        description: data.description,
        minimumLevel: data.minimumLevel || null,
        legalReference: data.legalReference || null,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
        penaltyForNonCompliance: data.penaltyForNonCompliance || null,
        notes: data.notes || null,
        contributedById: session.user.id,
      },
    });

    return NextResponse.json(requirement, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    console.error("Error creating requirement:", error);
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

    const existing = await prisma.countryBenefitRequirement.findUnique({
      where: { id: data.id },
    });

    if (!existing || existing.contributedById !== session.user.id) {
      return NextResponse.json({ error: "Not found or not your contribution" }, { status: 403 });
    }

    const updated = await prisma.countryBenefitRequirement.update({
      where: { id: data.id },
      data: {
        benefitCategory: data.benefitCategory as BenefitCategory,
        requirementType: data.requirementType,
        description: data.description,
        minimumLevel: data.minimumLevel || null,
        legalReference: data.legalReference || null,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
        penaltyForNonCompliance: data.penaltyForNonCompliance || null,
        notes: data.notes || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    console.error("Error updating requirement:", error);
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

    const existing = await prisma.countryBenefitRequirement.findUnique({
      where: { id },
    });

    if (!existing || existing.contributedById !== session.user.id) {
      return NextResponse.json({ error: "Not found or not your contribution" }, { status: 403 });
    }

    if (existing.verifiedByAdmin) {
      return NextResponse.json({ error: "Cannot delete verified items" }, { status: 403 });
    }

    await prisma.countryBenefitRequirement.delete({ where: { id } });

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting requirement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
