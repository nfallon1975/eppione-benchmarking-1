import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { brokerHasCountryAccess } from "@/lib/broker-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "BROKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify broker has an active relationship with this company
    const relationship = await prisma.brokerClientRelationship.findFirst({
      where: {
        brokerId: session.user.id,
        status: "ACTIVE",
        companyId: params.companyId,
      },
      select: { countries: true },
    });

    if (!relationship) {
      return NextResponse.json(
        { error: "No active relationship with this client" },
        { status: 403 }
      );
    }

    const allowedCountries = relationship.countries;

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

    // If broker has country restrictions, filter data to allowed countries only
    if (allowedCountries.length > 0) {
      company.benefitEntries = company.benefitEntries.filter(
        (e) => !e.country || brokerHasCountryAccess(allowedCountries, e.country)
      );
      company.categoryExclusions = company.categoryExclusions.filter(
        (e) => !e.country || brokerHasCountryAccess(allowedCountries, e.country)
      );
      company.countryProfiles = company.countryProfiles.filter(
        (cp) => brokerHasCountryAccess(allowedCountries, cp.country)
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching broker client submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
