import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateReferenceBenchmarks } from "@/lib/reference-data-generator";
import { getCountryName, getCurrencyForCountry } from "@/lib/countries";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { country } = await req.json();
    if (!country || typeof country !== "string" || country.length !== 2) {
      return NextResponse.json(
        { error: "Valid 2-letter country code is required" },
        { status: 400 }
      );
    }

    const countryName = getCountryName(country);
    const localCurrency = getCurrencyForCountry(country);

    const generated = await generateReferenceBenchmarks(
      country,
      countryName,
      localCurrency
    );

    // Upsert each generated entry
    let count = 0;
    for (const item of generated) {
      await prisma.referenceBenchmark.upsert({
        where: {
          country_benefitCategory: {
            country,
            benefitCategory: item.benefitCategory,
          },
        },
        create: {
          country,
          benefitCategory: item.benefitCategory,
          prevalencePercent: item.prevalencePercent,
          costAvg: item.costAvg,
          costMedian: item.costMedian,
          costP25: item.costP25,
          costP75: item.costP75,
          costCurrency: item.costCurrency || localCurrency,
          typicalEmployerContribPct: item.typicalEmployerContribPct,
          typicalEmployeeContribPct: item.typicalEmployeeContribPct,
          pctEmployerFunded: item.pctEmployerFunded,
          pctCoversSpouse: item.pctCoversSpouse,
          pctCoversDependents: item.pctCoversDependents,
          healthExcess: item.healthExcess,
          healthCopayPercent: item.healthCopayPercent,
          healthInpatientLimit: item.healthInpatientLimit,
          healthOutpatientLimit: item.healthOutpatientLimit,
          lifeCoverMultiple: item.lifeCoverMultiple,
          ipBenefitPercent: item.ipBenefitPercent,
          ipWaitingPeriodWeeks: item.ipWaitingPeriodWeeks,
          pensionEmployerPct: item.pensionEmployerPct,
          pensionEmployeePct: item.pensionEmployeePct,
          coverageNotes: item.coverageNotes,
          sourceDescription: item.sourceDescription,
          sourceUrls: item.sourceUrls || [],
          generatedAt: new Date(),
          verifiedByAdmin: false,
          publishedAt: null,
        },
        update: {
          prevalencePercent: item.prevalencePercent,
          costAvg: item.costAvg,
          costMedian: item.costMedian,
          costP25: item.costP25,
          costP75: item.costP75,
          costCurrency: item.costCurrency || localCurrency,
          typicalEmployerContribPct: item.typicalEmployerContribPct,
          typicalEmployeeContribPct: item.typicalEmployeeContribPct,
          pctEmployerFunded: item.pctEmployerFunded,
          pctCoversSpouse: item.pctCoversSpouse,
          pctCoversDependents: item.pctCoversDependents,
          healthExcess: item.healthExcess,
          healthCopayPercent: item.healthCopayPercent,
          healthInpatientLimit: item.healthInpatientLimit,
          healthOutpatientLimit: item.healthOutpatientLimit,
          lifeCoverMultiple: item.lifeCoverMultiple,
          ipBenefitPercent: item.ipBenefitPercent,
          ipWaitingPeriodWeeks: item.ipWaitingPeriodWeeks,
          pensionEmployerPct: item.pensionEmployerPct,
          pensionEmployeePct: item.pensionEmployeePct,
          coverageNotes: item.coverageNotes,
          sourceDescription: item.sourceDescription,
          sourceUrls: item.sourceUrls || [],
          generatedAt: new Date(),
          verifiedByAdmin: false,
          publishedAt: null,
        },
      });
      count++;
    }

    return NextResponse.json({ count, country });
  } catch (error) {
    console.error("Error generating reference data:", error);
    return NextResponse.json(
      { error: "Failed to generate reference data" },
      { status: 500 }
    );
  }
}
