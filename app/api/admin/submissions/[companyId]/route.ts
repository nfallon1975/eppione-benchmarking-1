import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { companyId: string } }
) {
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

    const company = await prisma.company.findUnique({
      where: { id: params.companyId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
        benefitEntries: {
          orderBy: [{ country: "asc" }, { benefitCategory: "asc" }],
        },
        platformInfo: true,
        categoryExclusions: {
          orderBy: [{ country: "asc" }, { benefitCategory: "asc" }],
        },
        countryProfiles: {
          orderBy: { country: "asc" },
        },
      },
    });

    if (!company || !company.surveyCompletedAt) {
      return NextResponse.json(
        { error: "Company submission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
