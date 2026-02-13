import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rerunComplianceForCountry } from "@/lib/compliance";
import { z } from "zod";
import type { BenefitCategory } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const view = req.nextUrl.searchParams.get("view");

    // Coverage report view
    if (view === "coverage") {
      const countries = await prisma.countryConfig.findMany({
        select: { countryCode: true, countryName: true },
        orderBy: { countryName: "asc" },
      });

      const coverage = await Promise.all(
        countries.map(async (c) => {
          const [reqCount, reqVerified, limitCount, limitVerified] = await Promise.all([
            prisma.countryBenefitRequirement.count({ where: { country: c.countryCode } }),
            prisma.countryBenefitRequirement.count({ where: { country: c.countryCode, verifiedByAdmin: true } }),
            prisma.countryStatutoryLimit.count({ where: { country: c.countryCode } }),
            prisma.countryStatutoryLimit.count({ where: { country: c.countryCode, verifiedByAdmin: true } }),
          ]);
          return {
            country: c.countryCode,
            countryName: c.countryName,
            requirements: reqCount,
            requirementsVerified: reqVerified,
            limits: limitCount,
            limitsVerified: limitVerified,
          };
        })
      );

      return NextResponse.json(coverage);
    }

    // All items view (for full management)
    if (view === "all") {
      const country = req.nextUrl.searchParams.get("country");
      const where = country ? { country } : {};

      const [requirements, limits] = await Promise.all([
        prisma.countryBenefitRequirement.findMany({
          where,
          include: {
            contributedBy: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.countryStatutoryLimit.findMany({
          where,
          include: {
            contributedBy: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      return NextResponse.json({ requirements, limits });
    }

    // Default: unverified items only
    const [requirements, limits] = await Promise.all([
      prisma.countryBenefitRequirement.findMany({
        where: { verifiedByAdmin: false },
        include: {
          contributedBy: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.countryStatutoryLimit.findMany({
        where: { verifiedByAdmin: false },
        include: {
          contributedBy: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const items = [
      ...requirements.map((r) => ({
        type: "requirement" as const,
        id: r.id,
        country: r.country,
        category: r.benefitCategory,
        description: r.description,
        contributedBy: r.contributedBy.name || r.contributedBy.email,
        createdAt: r.createdAt,
      })),
      ...limits.map((l) => ({
        type: "limit" as const,
        id: l.id,
        country: l.country,
        category: l.benefitCategory || "General",
        description: l.description,
        contributedBy: l.contributedBy.name || l.contributedBy.email,
        createdAt: l.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching compliance items:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const verifySchema = z.object({
  type: z.enum(["requirement", "limit"]),
  id: z.string().min(1),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();

    // Handle re-run compliance action
    if (body.action === "rerun") {
      const country = body.country;
      if (!country) {
        return NextResponse.json({ error: "Country required" }, { status: 400 });
      }
      const count = await rerunComplianceForCountry(country);
      return NextResponse.json({ message: `Re-ran compliance for ${count} companies` });
    }

    const { type, id } = verifySchema.parse(body);

    if (type === "requirement") {
      await prisma.countryBenefitRequirement.update({
        where: { id },
        data: { verifiedByAdmin: true },
      });
    } else {
      await prisma.countryStatutoryLimit.update({
        where: { id },
        data: { verifiedByAdmin: true },
      });
    }

    return NextResponse.json({ message: "Verified" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    console.error("Error verifying item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Admin direct add — auto-verified
const addRequirementSchema = z.object({
  type: z.literal("requirement"),
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

const addLimitSchema = z.object({
  type: z.literal("limit"),
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();

    if (body.type === "requirement") {
      const data = addRequirementSchema.parse(body);
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
          verifiedByAdmin: true, // Admin-added = auto-verified
        },
      });
      return NextResponse.json(requirement, { status: 201 });
    } else if (body.type === "limit") {
      const data = addLimitSchema.parse(body);
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
          verifiedByAdmin: true, // Admin-added = auto-verified
        },
      });
      return NextResponse.json(limit, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    console.error("Error adding compliance item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const type = req.nextUrl.searchParams.get("type");
    const id = req.nextUrl.searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ error: "Type and ID required" }, { status: 400 });
    }

    if (type === "requirement") {
      await prisma.countryBenefitRequirement.delete({ where: { id } });
    } else if (type === "limit") {
      await prisma.countryStatutoryLimit.delete({ where: { id } });
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ message: "Rejected and removed" });
  } catch (error) {
    console.error("Error rejecting item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
