import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");
    const industry = searchParams.get("industry");

    const where: Record<string, unknown> = {
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
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
