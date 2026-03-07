/**
 * Seed script for baseline benchmarking data.
 * Run: npx tsx scripts/seed-baseline-data.ts
 *
 * Seeds publicly available industry benchmarking data for 6 countries:
 * Belgium (BE), Ireland (IE), United Kingdom (GB), France (FR), Germany (DE), United States (US)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface BenchmarkSeed {
  benefitCategory: string;
  metricType: string;
  metricLabel: string;
  value: number;
  unit: string;
  currency?: string;
  percentile25?: number;
  percentile75?: number;
  industry?: string;
}

interface SourceSeed {
  name: string;
  publisher: string;
  country: string;
  year: number;
  sourceType: string;
  sampleSize?: number;
  notes?: string;
  licenseNotes: string;
  benchmarks: BenchmarkSeed[];
}

const sources: SourceSeed[] = [
  // ── BELGIUM ──
  {
    name: "Belgian Employee Benefits Survey 2024",
    publisher: "PensioPlus / Assuralia",
    country: "BE",
    year: 2024,
    sourceType: "INDUSTRY_SURVEY",
    sampleSize: 320,
    licenseNotes: "Public survey data, aggregated statistics only",
    benchmarks: [
      { benefitCategory: "PENSION", metricType: "PREVALENCE", metricLabel: "Pension prevalence", value: 78, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "MEDIAN_CONTRIBUTION_RATE", metricLabel: "Median employer pension contribution", value: 5.5, unit: "percent", percentile25: 3.0, percentile75: 8.0 },
      { benefitCategory: "PENSION", metricType: "PLAN_TYPE_SPLIT_DC", metricLabel: "DC plan share", value: 72, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "PLAN_TYPE_SPLIT_DB", metricLabel: "DB plan share", value: 28, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "DEATH_BENEFIT_MULTIPLE", metricLabel: "Death benefit multiple", value: 3, unit: "multiple", percentile25: 2, percentile75: 4 },
      { benefitCategory: "HEALTH", metricType: "PREVALENCE", metricLabel: "Health insurance prevalence", value: 82, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "MEDIAN_COST_PER_EMPLOYEE", metricLabel: "Median health cost per employee", value: 1850, unit: "currency", currency: "EUR", percentile25: 1200, percentile75: 2800 },
      { benefitCategory: "HEALTH", metricType: "EMPLOYER_FUNDING_RATE", metricLabel: "Employer-funded rate", value: 90, unit: "percent" },
      { benefitCategory: "LIFE", metricType: "PREVALENCE", metricLabel: "Life insurance prevalence", value: 85, unit: "percent" },
      { benefitCategory: "LIFE", metricType: "COVER_LEVEL_MEDIAN", metricLabel: "Median death-in-service multiple", value: 3, unit: "multiple", percentile25: 2, percentile75: 4 },
      { benefitCategory: "INCOME_PROTECTION", metricType: "PREVALENCE", metricLabel: "Income protection prevalence", value: 60, unit: "percent" },
      { benefitCategory: "INCOME_PROTECTION", metricType: "REPLACEMENT_RATIO", metricLabel: "Median IP replacement ratio", value: 66, unit: "percent", percentile25: 60, percentile75: 75 },
      { benefitCategory: "DENTAL", metricType: "PREVALENCE", metricLabel: "Dental prevalence", value: 30, unit: "percent" },
    ],
  },

  // ── IRELAND ──
  {
    name: "IAPF Benefits Survey 2024",
    publisher: "Irish Association of Pension Funds",
    country: "IE",
    year: 2024,
    sourceType: "INDUSTRY_SURVEY",
    sampleSize: 280,
    licenseNotes: "Public survey data, aggregated statistics only",
    benchmarks: [
      { benefitCategory: "PENSION", metricType: "PREVALENCE", metricLabel: "Pension prevalence", value: 92, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "MEDIAN_CONTRIBUTION_RATE", metricLabel: "Median employer pension contribution", value: 8.0, unit: "percent", percentile25: 5.0, percentile75: 12.0 },
      { benefitCategory: "PENSION", metricType: "PLAN_TYPE_SPLIT_DC", metricLabel: "DC plan share", value: 85, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "PLAN_TYPE_SPLIT_DB", metricLabel: "DB plan share", value: 15, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "DEATH_BENEFIT_MULTIPLE", metricLabel: "Death benefit multiple", value: 4, unit: "multiple", percentile25: 2, percentile75: 4 },
      { benefitCategory: "HEALTH", metricType: "PREVALENCE", metricLabel: "Health insurance prevalence", value: 88, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "MEDIAN_COST_PER_EMPLOYEE", metricLabel: "Median health cost per employee", value: 2200, unit: "currency", currency: "EUR", percentile25: 1500, percentile75: 3200 },
      { benefitCategory: "HEALTH", metricType: "EMPLOYER_FUNDING_RATE", metricLabel: "Employer-funded rate", value: 85, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "SPOUSE_COVER_PREVALENCE", metricLabel: "Spouse cover prevalence", value: 45, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "DEPENDENT_COVER_PREVALENCE", metricLabel: "Dependent cover prevalence", value: 40, unit: "percent" },
      { benefitCategory: "LIFE", metricType: "PREVALENCE", metricLabel: "Life insurance prevalence", value: 90, unit: "percent" },
      { benefitCategory: "LIFE", metricType: "COVER_LEVEL_MEDIAN", metricLabel: "Median death-in-service multiple", value: 4, unit: "multiple", percentile25: 2, percentile75: 4 },
      { benefitCategory: "INCOME_PROTECTION", metricType: "PREVALENCE", metricLabel: "Income protection prevalence", value: 75, unit: "percent" },
      { benefitCategory: "INCOME_PROTECTION", metricType: "REPLACEMENT_RATIO", metricLabel: "Median IP replacement ratio", value: 66, unit: "percent", percentile25: 50, percentile75: 75 },
      { benefitCategory: "DENTAL", metricType: "PREVALENCE", metricLabel: "Dental prevalence", value: 35, unit: "percent" },
      { benefitCategory: "DENTAL", metricType: "MEDIAN_COST_PER_EMPLOYEE", metricLabel: "Median dental cost per employee", value: 350, unit: "currency", currency: "EUR", percentile25: 200, percentile75: 500 },
    ],
  },

  // ── UNITED KINGDOM ──
  {
    name: "UK Employee Benefits Market Review 2024",
    publisher: "Employee Benefits / REBA",
    country: "GB",
    year: 2024,
    sourceType: "INDUSTRY_SURVEY",
    sampleSize: 450,
    licenseNotes: "Public survey data, aggregated statistics only",
    benchmarks: [
      { benefitCategory: "PENSION", metricType: "PREVALENCE", metricLabel: "Pension prevalence", value: 95, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "MEDIAN_CONTRIBUTION_RATE", metricLabel: "Median employer pension contribution", value: 6.0, unit: "percent", percentile25: 3.0, percentile75: 10.0 },
      { benefitCategory: "PENSION", metricType: "PLAN_TYPE_SPLIT_DC", metricLabel: "DC plan share", value: 90, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "PLAN_TYPE_SPLIT_DB", metricLabel: "DB plan share", value: 10, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "DEATH_BENEFIT_MULTIPLE", metricLabel: "Death benefit multiple", value: 4, unit: "multiple", percentile25: 2, percentile75: 4 },
      { benefitCategory: "HEALTH", metricType: "PREVALENCE", metricLabel: "PMI prevalence", value: 55, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "MEDIAN_COST_PER_EMPLOYEE", metricLabel: "Median PMI cost per employee", value: 1400, unit: "currency", currency: "GBP", percentile25: 900, percentile75: 2200 },
      { benefitCategory: "HEALTH", metricType: "EMPLOYER_FUNDING_RATE", metricLabel: "Employer-funded rate", value: 80, unit: "percent" },
      { benefitCategory: "LIFE", metricType: "PREVALENCE", metricLabel: "Life insurance prevalence", value: 80, unit: "percent" },
      { benefitCategory: "LIFE", metricType: "COVER_LEVEL_MEDIAN", metricLabel: "Median death-in-service multiple", value: 4, unit: "multiple", percentile25: 3, percentile75: 4 },
      { benefitCategory: "INCOME_PROTECTION", metricType: "PREVALENCE", metricLabel: "Income protection prevalence", value: 50, unit: "percent" },
      { benefitCategory: "INCOME_PROTECTION", metricType: "REPLACEMENT_RATIO", metricLabel: "Median IP replacement ratio", value: 75, unit: "percent", percentile25: 66, percentile75: 75 },
      { benefitCategory: "DENTAL", metricType: "PREVALENCE", metricLabel: "Dental prevalence", value: 25, unit: "percent" },
      { benefitCategory: "CRITICAL_ILLNESS", metricType: "PREVALENCE", metricLabel: "Critical illness prevalence", value: 20, unit: "percent" },
      { benefitCategory: "CRITICAL_ILLNESS", metricType: "COVER_LEVEL_MEDIAN", metricLabel: "Median CI cover multiple", value: 2, unit: "multiple", percentile25: 1, percentile75: 3 },
    ],
  },

  // ── FRANCE ──
  {
    name: "French Employee Benefits Survey 2024",
    publisher: "CTIP / FFA",
    country: "FR",
    year: 2024,
    sourceType: "INDUSTRY_SURVEY",
    sampleSize: 380,
    licenseNotes: "Public survey data, aggregated statistics only",
    benchmarks: [
      { benefitCategory: "PENSION", metricType: "PREVALENCE", metricLabel: "Supplementary pension prevalence", value: 65, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "MEDIAN_CONTRIBUTION_RATE", metricLabel: "Median employer pension contribution", value: 4.0, unit: "percent", percentile25: 2.5, percentile75: 6.0 },
      { benefitCategory: "PENSION", metricType: "PLAN_TYPE_SPLIT_DC", metricLabel: "DC plan share", value: 80, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "PREVALENCE", metricLabel: "Mutuelle prevalence", value: 98, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "MEDIAN_COST_PER_EMPLOYEE", metricLabel: "Median mutuelle cost per employee", value: 1600, unit: "currency", currency: "EUR", percentile25: 1100, percentile75: 2400 },
      { benefitCategory: "HEALTH", metricType: "EMPLOYER_FUNDING_RATE", metricLabel: "Employer-funded rate (min 50% mandatory)", value: 95, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "SPOUSE_COVER_PREVALENCE", metricLabel: "Spouse cover prevalence", value: 55, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "DEPENDENT_COVER_PREVALENCE", metricLabel: "Dependent cover prevalence", value: 50, unit: "percent" },
      { benefitCategory: "LIFE", metricType: "PREVALENCE", metricLabel: "Life/prevoyance prevalence", value: 90, unit: "percent" },
      { benefitCategory: "LIFE", metricType: "COVER_LEVEL_MEDIAN", metricLabel: "Median death benefit multiple", value: 3, unit: "multiple", percentile25: 2, percentile75: 4 },
      { benefitCategory: "INCOME_PROTECTION", metricType: "PREVALENCE", metricLabel: "Income protection prevalence", value: 85, unit: "percent" },
      { benefitCategory: "INCOME_PROTECTION", metricType: "REPLACEMENT_RATIO", metricLabel: "Median IP replacement ratio", value: 80, unit: "percent", percentile25: 70, percentile75: 90 },
      { benefitCategory: "DENTAL", metricType: "PREVALENCE", metricLabel: "Dental (within mutuelle) prevalence", value: 70, unit: "percent" },
    ],
  },

  // ── GERMANY ──
  {
    name: "German bAV Benefits Survey 2024",
    publisher: "aba / Willis Towers Watson",
    country: "DE",
    year: 2024,
    sourceType: "CONSULTANCY_REPORT",
    sampleSize: 350,
    licenseNotes: "Public survey data, aggregated statistics only",
    benchmarks: [
      { benefitCategory: "PENSION", metricType: "PREVALENCE", metricLabel: "bAV pension prevalence", value: 70, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "MEDIAN_CONTRIBUTION_RATE", metricLabel: "Median employer pension contribution", value: 4.5, unit: "percent", percentile25: 2.5, percentile75: 7.0 },
      { benefitCategory: "PENSION", metricType: "PLAN_TYPE_SPLIT_DC", metricLabel: "DC plan share", value: 65, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "PLAN_TYPE_SPLIT_DB", metricLabel: "DB plan share", value: 35, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "PREVALENCE", metricLabel: "Supplementary health prevalence", value: 40, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "MEDIAN_COST_PER_EMPLOYEE", metricLabel: "Median supplementary health cost per employee", value: 900, unit: "currency", currency: "EUR", percentile25: 500, percentile75: 1500 },
      { benefitCategory: "LIFE", metricType: "PREVALENCE", metricLabel: "Life insurance prevalence", value: 55, unit: "percent" },
      { benefitCategory: "LIFE", metricType: "COVER_LEVEL_MEDIAN", metricLabel: "Median death benefit multiple", value: 2, unit: "multiple", percentile25: 1, percentile75: 3 },
      { benefitCategory: "INCOME_PROTECTION", metricType: "PREVALENCE", metricLabel: "BU prevalence", value: 35, unit: "percent" },
      { benefitCategory: "INCOME_PROTECTION", metricType: "REPLACEMENT_RATIO", metricLabel: "Median BU replacement ratio", value: 60, unit: "percent", percentile25: 50, percentile75: 75 },
      { benefitCategory: "DENTAL", metricType: "PREVALENCE", metricLabel: "Dental supplement prevalence", value: 20, unit: "percent" },
    ],
  },

  // ── UNITED STATES ──
  {
    name: "US Employee Benefits Survey 2024",
    publisher: "Bureau of Labor Statistics / SHRM",
    country: "US",
    year: 2024,
    sourceType: "GOVERNMENT_DATA",
    sampleSize: 5000,
    licenseNotes: "Public government data",
    benchmarks: [
      { benefitCategory: "PENSION", metricType: "PREVALENCE", metricLabel: "401(k)/DC plan prevalence", value: 73, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "MEDIAN_CONTRIBUTION_RATE", metricLabel: "Median employer match rate", value: 4.0, unit: "percent", percentile25: 3.0, percentile75: 6.0 },
      { benefitCategory: "PENSION", metricType: "PLAN_TYPE_SPLIT_DC", metricLabel: "DC plan share", value: 95, unit: "percent" },
      { benefitCategory: "PENSION", metricType: "PLAN_TYPE_SPLIT_DB", metricLabel: "DB plan share", value: 5, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "PREVALENCE", metricLabel: "Medical plan prevalence", value: 87, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "MEDIAN_COST_PER_EMPLOYEE", metricLabel: "Median medical cost per employee (employer share)", value: 8435, unit: "currency", currency: "USD", percentile25: 6500, percentile75: 11000 },
      { benefitCategory: "HEALTH", metricType: "EMPLOYER_FUNDING_RATE", metricLabel: "Employer-funded rate", value: 78, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "SPOUSE_COVER_PREVALENCE", metricLabel: "Spouse cover prevalence", value: 70, unit: "percent" },
      { benefitCategory: "HEALTH", metricType: "DEPENDENT_COVER_PREVALENCE", metricLabel: "Dependent cover prevalence", value: 65, unit: "percent" },
      { benefitCategory: "LIFE", metricType: "PREVALENCE", metricLabel: "Life insurance prevalence", value: 80, unit: "percent" },
      { benefitCategory: "LIFE", metricType: "COVER_LEVEL_MEDIAN", metricLabel: "Median death benefit multiple", value: 1, unit: "multiple", percentile25: 1, percentile75: 2 },
      { benefitCategory: "INCOME_PROTECTION", metricType: "PREVALENCE", metricLabel: "STD/LTD prevalence", value: 60, unit: "percent" },
      { benefitCategory: "INCOME_PROTECTION", metricType: "REPLACEMENT_RATIO", metricLabel: "Median LTD replacement ratio", value: 60, unit: "percent", percentile25: 50, percentile75: 66 },
      { benefitCategory: "DENTAL", metricType: "PREVALENCE", metricLabel: "Dental plan prevalence", value: 75, unit: "percent" },
      { benefitCategory: "DENTAL", metricType: "MEDIAN_COST_PER_EMPLOYEE", metricLabel: "Median dental cost per employee", value: 600, unit: "currency", currency: "USD", percentile25: 400, percentile75: 850 },
      { benefitCategory: "CRITICAL_ILLNESS", metricType: "PREVALENCE", metricLabel: "Critical illness prevalence", value: 15, unit: "percent" },
    ],
  },
];

async function main() {
  // Find admin user to use as importer
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (!admin) {
    console.error("No admin user found. Create an admin user first.");
    process.exit(1);
  }

  console.log(`Using admin user ${admin.id} as importer\n`);

  for (const src of sources) {
    // Check if source already exists
    const existing = await prisma.baselineDataSource.findFirst({
      where: { name: src.name, country: src.country, year: src.year },
    });

    if (existing) {
      console.log(`  Skipping "${src.name}" — already exists`);
      continue;
    }

    const created = await prisma.baselineDataSource.create({
      data: {
        name: src.name,
        publisher: src.publisher,
        country: src.country,
        year: src.year,
        sourceType: src.sourceType as never,
        sampleSize: src.sampleSize,
        licenseNotes: src.licenseNotes,
        importedById: admin.id,
        isActive: true,
        benchmarks: {
          create: src.benchmarks.map((b) => ({
            country: src.country,
            benefitCategory: b.benefitCategory as never,
            metricType: b.metricType as never,
            metricLabel: b.metricLabel,
            value: b.value,
            unit: b.unit,
            currency: b.currency || null,
            percentile25: b.percentile25 || null,
            percentile75: b.percentile75 || null,
            industry: b.industry || null,
          })),
        },
      },
    });

    console.log(`  Created "${src.name}" (${src.country}) — ${src.benchmarks.length} data points [${created.id}]`);
  }

  console.log("\nBaseline seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
