import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 1 export per user per day
    const rateLimited = checkRateLimit(`data-export:${session.user.id}`, 24 * 60 * 60 * 1000, 1);
    if (rateLimited) return rateLimited;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        companyRole: true,
        createdAt: true,
      },
    });

    let companyData = null;
    let benefits = null;
    let platformInfo = null;
    let surveyDraft = null;
    let countryProfiles = null;

    if (session.user.companyId) {
      companyData = await prisma.company.findUnique({
        where: { id: session.user.companyId },
        select: {
          id: true,
          name: true,
          country: true,
          industry: true,
          employeeCount: true,
          averageSalary: true,
          averageSalaryCurrency: true,
          benefitBudget: true,
          benefitBudgetCurrency: true,
          createdAt: true,
        },
      });

      benefits = await prisma.benefitEntry.findMany({
        where: { companyId: session.user.companyId },
        include: { healthLimits: true },
      });

      platformInfo = await prisma.platformInfo.findMany({
        where: { companyId: session.user.companyId },
      });

      surveyDraft = await prisma.surveyDraft.findUnique({
        where: { companyId: session.user.companyId },
        select: {
          status: true,
          currentStep: true,
          submittedAt: true,
          createdAt: true,
        },
      });

      countryProfiles = await prisma.companyCountryProfile.findMany({
        where: { companyId: session.user.companyId },
      });
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      company: companyData,
      benefits,
      platformInfo,
      surveyDraft,
      countryProfiles,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="eppione-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
