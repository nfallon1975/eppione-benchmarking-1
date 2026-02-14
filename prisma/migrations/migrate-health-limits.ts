/**
 * Data migration: Convert existing healthInpatientLimit / healthOutpatientLimit
 * flat fields on BenefitEntry into HealthLimit child records.
 *
 * Run with: npx tsx prisma/migrations/migrate-health-limits.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const healthEntries = await prisma.benefitEntry.findMany({
    where: {
      benefitCategory: "HEALTH",
      OR: [
        { healthInpatientLimit: { not: null } },
        { healthOutpatientLimit: { not: null } },
      ],
    },
    select: {
      id: true,
      healthInpatientLimit: true,
      healthOutpatientLimit: true,
      healthLimitCurrency: true,
    },
  });

  console.log(`Found ${healthEntries.length} HEALTH entries with limit data`);

  let created = 0;
  let skipped = 0;

  for (const entry of healthEntries) {
    if (entry.healthInpatientLimit !== null) {
      try {
        await prisma.healthLimit.upsert({
          where: {
            benefitEntryId_limitType: {
              benefitEntryId: entry.id,
              limitType: "INPATIENT",
            },
          },
          update: {},
          create: {
            benefitEntryId: entry.id,
            limitType: "INPATIENT",
            hasLimit: true,
            limitAmount: entry.healthInpatientLimit,
            limitCurrency: entry.healthLimitCurrency || "EUR",
          },
        });
        created++;
      } catch {
        skipped++;
      }
    }

    if (entry.healthOutpatientLimit !== null) {
      try {
        await prisma.healthLimit.upsert({
          where: {
            benefitEntryId_limitType: {
              benefitEntryId: entry.id,
              limitType: "OUTPATIENT",
            },
          },
          update: {},
          create: {
            benefitEntryId: entry.id,
            limitType: "OUTPATIENT",
            hasLimit: true,
            limitAmount: entry.healthOutpatientLimit,
            limitCurrency: entry.healthLimitCurrency || "EUR",
          },
        });
        created++;
      } catch {
        skipped++;
      }
    }
  }

  console.log(`Created ${created} HealthLimit records, skipped ${skipped} (already existed)`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
