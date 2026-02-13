import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = session.user;
    if (!companyId) {
      return NextResponse.json({ error: "No company associated" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { country: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Get primary country + any countries from country profiles
    const profiles = await prisma.companyCountryProfile.findMany({
      where: { companyId },
      select: { country: true },
    });

    const countriesSet = new Set<string>();
    if (company.country) countriesSet.add(company.country);
    for (const p of profiles) {
      countriesSet.add(p.country);
    }

    // Also check benefit entries for any extra countries
    const benefitCountries = await prisma.benefitEntry.findMany({
      where: { companyId, country: { not: "" } },
      select: { country: true },
      distinct: ["country"],
    });
    for (const b of benefitCountries) {
      countriesSet.add(b.country);
    }

    return NextResponse.json({ countries: Array.from(countriesSet) });
  } catch (error) {
    console.error("Error fetching company countries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
