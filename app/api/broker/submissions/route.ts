import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "BROKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all active client relationships for this broker
    const relationships = await prisma.brokerClientRelationship.findMany({
      where: {
        brokerId: session.user.id,
        status: "ACTIVE",
        companyId: { not: null },
      },
      select: {
        companyId: true,
        countries: true,
      },
    });

    // Collect unique company IDs from active relationships
    const companyIds = relationships
      .map((r) => r.companyId)
      .filter((id): id is string => !!id);

    if (companyIds.length === 0) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");
    const industry = searchParams.get("industry");

    const where: Record<string, unknown> = {
      id: { in: companyIds },
      surveyCompletedAt: { not: null },
    };
    if (country) {
      where.country = country;
    }
    if (industry) {
      where.industry = industry;
    }

    const companies = await prisma.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        country: true,
        industry: true,
        employeeCount: true,
        employeeCountRange: true,
        surveyCompletedAt: true,
        users: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            benefitEntries: true,
          },
        },
      },
      orderBy: { surveyCompletedAt: "desc" },
    });

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching broker submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
