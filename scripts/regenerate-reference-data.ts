/**
 * Regenerate reference data for specified countries.
 * Usage: DATABASE_URL="..." npx tsx scripts/regenerate-reference-data.ts GB IE
 */
import { PrismaClient } from "@prisma/client";
import { generateReferenceBenchmarks } from "../lib/reference-data-generator";
import { getCountryName, getCurrencyForCountry } from "../lib/countries";

const prisma = new PrismaClient();

async function main() {
  const countries = process.argv.slice(2);
  if (countries.length === 0) {
    console.error("Usage: npx tsx scripts/regenerate-reference-data.ts GB IE");
    process.exit(1);
  }

  for (const country of countries) {
    const countryName = getCountryName(country);
    const localCurrency = getCurrencyForCountry(country);
    console.log(`\nGenerating reference data for ${countryName} (${country}, ${localCurrency})...`);

    const generated = await generateReferenceBenchmarks(country, countryName, localCurrency);
    console.log(`  Got ${generated.length} categories from AI`);

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
          confidenceLevel: item.confidenceLevel,
          coverageNotes: item.coverageNotes,
          sourceDescription: item.sourceDescription,
          sourceUrls: item.sourceUrls || [],
          generatedAt: new Date(),
          verifiedByAdmin: true,
          publishedAt: new Date(),
          lastReviewedAt: new Date(),
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
          confidenceLevel: item.confidenceLevel,
          coverageNotes: item.coverageNotes,
          sourceDescription: item.sourceDescription,
          sourceUrls: item.sourceUrls || [],
          generatedAt: new Date(),
          verifiedByAdmin: true,
          publishedAt: new Date(),
          lastReviewedAt: new Date(),
        },
      });
      count++;
      const conf = item.confidenceLevel || "—";
      console.log(`  [${count}/${generated.length}] ${item.benefitCategory} (${conf})`);
    }

    console.log(`  Done: ${count} entries upserted for ${countryName}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
