import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { brokerHasCountryAccess } from "@/lib/broker-access";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const country = req.nextUrl.searchParams.get("country");
    const companyId = req.nextUrl.searchParams.get("companyId");

    if (!country) {
      return NextResponse.json({ error: "Country parameter required" }, { status: 400 });
    }

    let targetCompanyId: string;

    if (session.user.role === "CLIENT") {
      if (!session.user.companyId) {
        return NextResponse.json({ error: "No company associated" }, { status: 400 });
      }
      targetCompanyId = session.user.companyId;
    } else if (session.user.role === "BROKER") {
      if (!companyId) {
        return NextResponse.json({ error: "companyId required for brokers" }, { status: 400 });
      }

      const relationship = await prisma.brokerClientRelationship.findFirst({
        where: {
          brokerId: session.user.id,
          companyId,
          status: "ACTIVE",
        },
      });

      if (!relationship) {
        return NextResponse.json({ error: "No active relationship" }, { status: 403 });
      }

      if (!brokerHasCountryAccess(relationship.countries, country)) {
        return NextResponse.json({ error: "You do not have access to this country's data" }, { status: 403 });
      }

      targetCompanyId = companyId;
    } else if (session.user.role === "ADMIN") {
      if (!companyId) {
        return NextResponse.json({ error: "companyId required" }, { status: 400 });
      }
      targetCompanyId = companyId;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch compliance check results
    const results = await prisma.complianceCheckResult.findMany({
      where: {
        companyId: targetCompanyId,
        country,
      },
      include: {
        requirement: {
          select: {
            benefitCategory: true,
            requirementType: true,
            description: true,
            minimumLevel: true,
            legalReference: true,
            penaltyForNonCompliance: true,
            verifiedByAdmin: true,
          },
        },
      },
      orderBy: { checkedAt: "desc" },
    });

    // Fetch statutory limits for the country
    const limits = await prisma.countryStatutoryLimit.findMany({
      where: { country },
      orderBy: [{ taxYear: "desc" }, { limitType: "asc" }],
    });

    // Fetch requirement counts by country for summary
    const requirementCounts = await prisma.countryBenefitRequirement.count({
      where: {
        country,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gt: new Date() } },
        ],
      },
    });

    return NextResponse.json({
      results,
      limits,
      totalRequirements: requirementCounts,
    });
  } catch (error) {
    console.error("Error fetching compliance results:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
