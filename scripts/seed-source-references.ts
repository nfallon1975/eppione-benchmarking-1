/**
 * Seed DataSourceReference records and link them to existing baseline data.
 * Run: npx tsx scripts/seed-source-references.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SourceSeed {
  title: string;
  publisher: string;
  type: string;
  country: string | null;
  reliability: string;
  summary: string;
  isPubliclyAccessible: boolean;
  publicationDate?: string;
  url?: string;
}

const sources: SourceSeed[] = [
  // ── IRELAND ──
  {
    title: "Revenue Commissioners - Pension Tax Relief Guidance",
    publisher: "Irish Revenue Commissioners",
    type: "TAX_AUTHORITY",
    country: "IE",
    reliability: "OFFICIAL",
    summary: "Official guidance on pension contribution tax relief limits, age-related percentage limits, and approved retirement fund rules for Ireland.",
    isPubliclyAccessible: true,
    publicationDate: "2025-01-01",
  },
  {
    title: "Pensions Authority Annual Report 2024",
    publisher: "The Pensions Authority (Ireland)",
    type: "REGULATOR_PUBLICATION",
    country: "IE",
    reliability: "OFFICIAL",
    summary: "Annual regulatory overview of Irish pension schemes including DC/DB split, auto-enrolment preparations, and compliance statistics.",
    isPubliclyAccessible: true,
    publicationDate: "2024-06-15",
  },
  {
    title: "IAPF Annual Benefits Survey 2024",
    publisher: "Irish Association of Pension Funds",
    type: "INDUSTRY_SURVEY",
    country: "IE",
    reliability: "HIGH",
    summary: "Comprehensive survey of Irish employer-sponsored pension and risk benefits covering contribution rates, plan design, death-in-service, and income protection.",
    isPubliclyAccessible: false,
    publicationDate: "2024-09-01",
  },
  {
    title: "Irish Life Employer Benefits Review 2024",
    publisher: "Irish Life Group",
    type: "INSURER_REPORT",
    country: "IE",
    reliability: "HIGH",
    summary: "Market analysis of employer benefits trends in Ireland including pension, health insurance, and group risk benefits.",
    isPubliclyAccessible: true,
    publicationDate: "2024-03-01",
  },
  {
    title: "CSO Earnings and Labour Costs Data",
    publisher: "Central Statistics Office (Ireland)",
    type: "GOVERNMENT_REPORT",
    country: "IE",
    reliability: "OFFICIAL",
    summary: "Official statistics on earnings, labour costs, and employer-provided benefits in Ireland.",
    isPubliclyAccessible: true,
    publicationDate: "2024-12-01",
  },

  // ── UNITED KINGDOM ──
  {
    title: "The Pensions Regulator - DC Guidance",
    publisher: "The Pensions Regulator (UK)",
    type: "REGULATOR_PUBLICATION",
    country: "GB",
    reliability: "OFFICIAL",
    summary: "Regulatory guidance on defined contribution pension scheme management, auto-enrolment duties, and minimum contribution requirements.",
    isPubliclyAccessible: true,
    publicationDate: "2025-01-01",
  },
  {
    title: "HMRC Pension Annual Allowance Rules",
    publisher: "HM Revenue & Customs",
    type: "TAX_AUTHORITY",
    country: "GB",
    reliability: "OFFICIAL",
    summary: "Official guidance on pension annual allowance, lifetime allowance, and tax relief on employer/employee pension contributions.",
    isPubliclyAccessible: true,
    publicationDate: "2025-04-06",
  },
  {
    title: "Employee Benefits Annual Survey 2024",
    publisher: "Employee Benefits Magazine",
    type: "INDUSTRY_SURVEY",
    country: "GB",
    reliability: "MEDIUM",
    summary: "Annual survey of UK employee benefits provision covering health, risk, pension, and wellbeing benefits.",
    isPubliclyAccessible: true,
    publicationDate: "2024-05-01",
  },
  {
    title: "WTW Benefits Trends Survey UK 2024",
    publisher: "Willis Towers Watson",
    type: "CONSULTANCY_REPORT",
    country: "GB",
    reliability: "HIGH",
    summary: "Comprehensive review of UK employer benefits strategies, costs, and trends from a major global consultancy.",
    isPubliclyAccessible: false,
    publicationDate: "2024-07-01",
  },
  {
    title: "ONS Employee Earnings Data",
    publisher: "Office for National Statistics",
    type: "GOVERNMENT_REPORT",
    country: "GB",
    reliability: "OFFICIAL",
    summary: "Official UK statistics on earnings, hours worked, and employment costs including employer pension contributions.",
    isPubliclyAccessible: true,
    publicationDate: "2024-11-01",
  },

  // ── BELGIUM ──
  {
    title: "AG Insurance Employee Benefits Benchmark 2023",
    publisher: "AG Insurance",
    type: "INSURER_REPORT",
    country: "BE",
    reliability: "HIGH",
    summary: "Comprehensive benchmark study of Belgian employer-sponsored group insurance and pension benefits based on AG Insurance portfolio data.",
    isPubliclyAccessible: true,
    publicationDate: "2023-10-01",
  },
  {
    title: "Assuralia/PensioPlus Research on Second Pillar Pensions",
    publisher: "Assuralia / PensioPlus",
    type: "TRADE_BODY",
    country: "BE",
    reliability: "HIGH",
    summary: "Research on Belgian second pillar pension landscape including coverage rates, contribution levels, and plan type distribution.",
    isPubliclyAccessible: true,
    publicationDate: "2024-04-01",
  },
  {
    title: "Belgian Federal Government - Social Security Overview",
    publisher: "Federal Public Service Social Security (Belgium)",
    type: "GOVERNMENT_REPORT",
    country: "BE",
    reliability: "OFFICIAL",
    summary: "Official overview of Belgian social security system including mandatory and supplementary benefit requirements.",
    isPubliclyAccessible: true,
    publicationDate: "2024-01-01",
  },

  // ── FRANCE ──
  {
    title: "DREES Social Protection Report 2024",
    publisher: "Direction de la recherche, des etudes, de l'evaluation et des statistiques",
    type: "GOVERNMENT_REPORT",
    country: "FR",
    reliability: "OFFICIAL",
    summary: "Official French government report on social protection expenditure, coverage, and employer-sponsored benefit provision.",
    isPubliclyAccessible: true,
    publicationDate: "2024-06-01",
  },
  {
    title: "CTIP Prevoyance Data Report 2024",
    publisher: "Centre Technique des Institutions de Prevoyance",
    type: "TRADE_BODY",
    country: "FR",
    reliability: "HIGH",
    summary: "Annual report on French prevoyance (group risk benefits) market including death, disability, and health coverage data.",
    isPubliclyAccessible: true,
    publicationDate: "2024-05-01",
  },
  {
    title: "ANI Mutuelle Regulations",
    publisher: "French Government / Legifrance",
    type: "LEGISLATION",
    country: "FR",
    reliability: "OFFICIAL",
    summary: "Legal requirements for mandatory employer-provided complementary health coverage (mutuelle) under the ANI agreement.",
    isPubliclyAccessible: true,
    publicationDate: "2016-01-01",
  },

  // ── GERMANY ──
  {
    title: "aba bAV Research Report 2024",
    publisher: "Arbeitsgemeinschaft fur betriebliche Altersversorgung",
    type: "EMPLOYER_ASSOCIATION",
    country: "DE",
    reliability: "HIGH",
    summary: "Research on German occupational pension (bAV) coverage, contribution levels, and plan type distribution.",
    isPubliclyAccessible: false,
    publicationDate: "2024-03-01",
  },
  {
    title: "WTW German Benefits Survey 2024",
    publisher: "Willis Towers Watson",
    type: "CONSULTANCY_REPORT",
    country: "DE",
    reliability: "HIGH",
    summary: "Survey of German employer benefits including bAV, health supplements, and risk benefits.",
    isPubliclyAccessible: false,
    publicationDate: "2024-08-01",
  },

  // ── UNITED STATES ──
  {
    title: "BLS National Compensation Survey 2024",
    publisher: "Bureau of Labor Statistics",
    type: "GOVERNMENT_REPORT",
    country: "US",
    reliability: "OFFICIAL",
    summary: "Official US survey of employer-provided benefits including health insurance, retirement plans, and insurance benefits with prevalence and cost data.",
    isPubliclyAccessible: true,
    publicationDate: "2024-09-01",
  },
  {
    title: "SHRM Employee Benefits Survey 2024",
    publisher: "Society for Human Resource Management",
    type: "INDUSTRY_SURVEY",
    country: "US",
    reliability: "HIGH",
    summary: "Annual comprehensive survey of US employer benefits provision across health, retirement, leave, and wellness categories.",
    isPubliclyAccessible: true,
    publicationDate: "2024-06-01",
  },
];

// Mapping: baseline source name substring -> source reference titles to link
const BASELINE_TO_SOURCE_LINKS: Record<string, string[]> = {
  "Belgian Employee Benefits": [
    "AG Insurance Employee Benefits Benchmark",
    "Assuralia/PensioPlus Research",
    "Belgian Federal Government",
  ],
  "IAPF Benefits Survey": [
    "IAPF Annual Benefits Survey 2024",
    "Revenue Commissioners",
    "Pensions Authority Annual Report",
    "Irish Life Employer Benefits",
    "CSO Earnings",
  ],
  "UK Employee Benefits": [
    "The Pensions Regulator",
    "HMRC Pension Annual Allowance",
    "Employee Benefits Annual Survey",
    "WTW Benefits Trends Survey UK",
    "ONS Employee Earnings",
  ],
  "French Employee Benefits": [
    "DREES Social Protection",
    "CTIP Prevoyance",
    "ANI Mutuelle",
  ],
  "German bAV": [
    "aba bAV Research",
    "WTW German Benefits Survey",
  ],
  "US Employee Benefits": [
    "BLS National Compensation",
    "SHRM Employee Benefits",
  ],
};

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (!admin) {
    console.error("No admin user found. Create an admin user first.");
    process.exit(1);
  }

  console.log(`Using admin user ${admin.id}\n`);

  // Create DataSourceReference records
  const createdSources: Map<string, string> = new Map(); // title -> id

  for (const src of sources) {
    const existing = await prisma.dataSourceReference.findFirst({
      where: { title: src.title },
    });

    if (existing) {
      console.log(`  Skipping "${src.title}" — already exists`);
      createdSources.set(src.title, existing.id);
      continue;
    }

    const created = await prisma.dataSourceReference.create({
      data: {
        type: src.type as never,
        title: src.title,
        publisher: src.publisher,
        country: src.country,
        reliability: src.reliability as never,
        summary: src.summary,
        isPubliclyAccessible: src.isPubliclyAccessible,
        publicationDate: src.publicationDate ? new Date(src.publicationDate) : null,
        url: src.url || null,
        addedById: admin.id,
        lastVerifiedAt: new Date(),
        lastVerifiedById: admin.id,
      },
    });

    createdSources.set(src.title, created.id);
    console.log(`  Created source: "${src.title}" [${created.id}]`);
  }

  // Link sources to baseline benchmarks
  console.log("\nLinking sources to baseline data points...");

  const baselineSources = await prisma.baselineDataSource.findMany({
    include: { benchmarks: { select: { id: true } } },
  });

  let linkCount = 0;
  for (const bSrc of baselineSources) {
    // Find matching source references
    const matchKey = Object.keys(BASELINE_TO_SOURCE_LINKS).find((k) =>
      bSrc.name.includes(k)
    );
    if (!matchKey) continue;

    const sourceRefTitles = BASELINE_TO_SOURCE_LINKS[matchKey];
    const matchedSourceIds: { id: string; relevance: string }[] = [];

    for (const refTitle of sourceRefTitles) {
      const matchedTitle = Array.from(createdSources.keys()).find((t) =>
        t.includes(refTitle)
      );
      if (matchedTitle) {
        const isPrimary = sourceRefTitles.indexOf(refTitle) === 0;
        matchedSourceIds.push({
          id: createdSources.get(matchedTitle)!,
          relevance: isPrimary ? "PRIMARY" : "SUPPORTING",
        });
      }
    }

    // Link each benchmark to the sources
    for (const bm of bSrc.benchmarks) {
      for (const src of matchedSourceIds) {
        const exists = await prisma.dataPointSourceLink.findFirst({
          where: { sourceId: src.id, linkedType: "BASELINE_BENCHMARK", linkedId: bm.id },
        });
        if (!exists) {
          await prisma.dataPointSourceLink.create({
            data: {
              sourceId: src.id,
              linkedType: "BASELINE_BENCHMARK",
              linkedId: bm.id,
              relevance: src.relevance as never,
            },
          });
          linkCount++;
        }
      }
    }
  }

  console.log(`  Created ${linkCount} source links`);

  // Create sample confidence scores for baseline benchmarks
  console.log("\nCalculating confidence scores...");

  const allBenchmarks = await prisma.baselineBenchmark.findMany({
    select: { id: true },
  });

  for (const bm of allBenchmarks) {
    const links = await prisma.dataPointSourceLink.findMany({
      where: { linkedType: "BASELINE_BENCHMARK", linkedId: bm.id },
      include: { source: { select: { reliability: true, publicationDate: true } } },
    });

    if (links.length === 0) continue;

    const bestReliability = Math.max(
      ...links.map((l) => {
        const scores: Record<string, number> = { OFFICIAL: 1.0, HIGH: 0.85, MEDIUM: 0.65, LOW: 0.4, UNVERIFIED: 0.2 };
        return scores[l.source.reliability] ?? 0.2;
      })
    );

    const bestRecency = Math.max(
      ...links.map((l) => {
        if (!l.source.publicationDate) return 0.4;
        const years = (Date.now() - l.source.publicationDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (years < 1) return 1.0;
        if (years < 2) return 0.8;
        if (years < 3) return 0.6;
        return 0.4;
      })
    );

    const corroboration = links.length >= 3 ? 1.0 : links.length === 2 ? 0.7 : 0.4;
    const consistency = 0.8;
    const overall = bestRecency * 0.3 + bestReliability * 0.3 + corroboration * 0.2 + consistency * 0.2;

    await prisma.dataConfidenceScore.upsert({
      where: { linkedType_linkedId: { linkedType: "BASELINE_BENCHMARK", linkedId: bm.id } },
      create: {
        linkedType: "BASELINE_BENCHMARK",
        linkedId: bm.id,
        overallConfidence: Math.round(overall * 100) / 100,
        recencyScore: bestRecency,
        sourceQualityScore: bestReliability,
        corroborationScore: corroboration,
        consistencyScore: consistency,
        calculationMethod: "SYSTEM",
        reasoning: `Auto-calculated from ${links.length} linked source(s).`,
      },
      update: {
        overallConfidence: Math.round(overall * 100) / 100,
        recencyScore: bestRecency,
        sourceQualityScore: bestReliability,
        corroborationScore: corroboration,
        consistencyScore: consistency,
        calculatedAt: new Date(),
      },
    });
  }

  console.log(`  Scored ${allBenchmarks.length} data points`);

  // Create a sample completed MonthlyReviewCycle
  console.log("\nCreating sample review cycle...");

  const existingCycle = await prisma.monthlyReviewCycle.findFirst({
    where: { month: "2026-02" },
  });

  if (!existingCycle) {
    await prisma.monthlyReviewCycle.create({
      data: {
        month: "2026-02",
        status: "COMPLETED",
        startedAt: new Date("2026-02-01T09:00:00Z"),
        completedAt: new Date("2026-02-01T09:45:00Z"),
        countriesReviewed: ["IE", "GB", "BE", "FR", "DE", "US"],
        totalDataPointsReviewed: 85,
        totalUpdatesFound: 3,
        totalFlagsRaised: 2,
        totalSourcesChecked: 20,
        newSourcesDiscovered: 1,
        aiCostEstimate: 4.25,
        runById: admin.id,
        summary: "Monthly review completed for 6 countries. Found 3 data updates and 2 items flagged for attention. Irish pension contribution data confirmed current. UK auto-enrolment minimums unchanged. One new source discovered for French prevoyance data.",
        findings: {
          create: [
            {
              findingType: "DATA_CONFIRMED",
              country: "IE",
              benefitCategory: "PENSION",
              confidence: 0.95,
              severity: "INFO",
              aiReasoning: "Irish employer pension contribution median of 8% confirmed by IAPF 2024 survey data. No regulatory changes since last review.",
              status: "ACCEPTED",
              reviewedById: admin.id,
              reviewedAt: new Date("2026-02-01T10:00:00Z"),
            },
            {
              findingType: "DATA_CONFIRMED",
              country: "GB",
              benefitCategory: "PENSION",
              confidence: 0.90,
              severity: "INFO",
              aiReasoning: "UK auto-enrolment minimum contributions remain at 3% employer / 5% total. No changes announced for 2026.",
              status: "ACCEPTED",
              reviewedById: admin.id,
              reviewedAt: new Date("2026-02-01T10:05:00Z"),
            },
            {
              findingType: "VALUE_CHANGED",
              country: "US",
              benefitCategory: "HEALTH",
              currentValue: "$8,435",
              suggestedValue: "$8,951",
              confidence: 0.80,
              severity: "MEDIUM",
              aiReasoning: "KFF 2025 Employer Health Benefits Survey reports median single coverage employer contribution increased to $8,951, a 6.1% increase from prior year.",
              status: "PENDING_REVIEW",
            },
            {
              findingType: "NEW_SOURCE_DISCOVERED",
              country: "FR",
              benefitCategory: "HEALTH",
              confidence: 0.75,
              severity: "LOW",
              aiReasoning: "Found updated CTIP prevoyance report for 2025 with refreshed mutuelle cost data. Report covers 2.8 million workers.",
              newSourceUrl: "https://www.ctip.asso.fr/",
              status: "PENDING_REVIEW",
            },
            {
              findingType: "SOURCE_EXPIRED",
              country: "BE",
              benefitCategory: "HEALTH",
              confidence: 0.60,
              severity: "MEDIUM",
              aiReasoning: "AG Insurance Benchmark Study is from 2023, now over 2 years old. Recommend checking for 2024/2025 update.",
              status: "PENDING_REVIEW",
            },
            {
              findingType: "DATA_CONFIRMED",
              country: "DE",
              benefitCategory: "PENSION",
              confidence: 0.85,
              severity: "INFO",
              aiReasoning: "German bAV pension prevalence of 70% aligns with aba 2024 report. BMAS data supports similar coverage rates.",
              status: "ACCEPTED",
              reviewedById: admin.id,
              reviewedAt: new Date("2026-02-01T10:15:00Z"),
            },
            {
              findingType: "NEW_REGULATION",
              country: "IE",
              benefitCategory: "PENSION",
              confidence: 0.90,
              severity: "HIGH",
              aiReasoning: "Auto-enrolment in Ireland confirmed for Q1 2027 start. Employers will need to contribute minimum 1.5% initially, rising to 6% over 10 years. This will significantly impact pension prevalence and minimum contribution benchmarks.",
              status: "PENDING_REVIEW",
            },
            {
              findingType: "CONFLICTING_DATA",
              country: "GB",
              benefitCategory: "INCOME_PROTECTION",
              currentValue: "50%",
              suggestedValue: "45-55%",
              confidence: 0.65,
              severity: "LOW",
              aiReasoning: "Different surveys show varying IP prevalence in UK. REBA shows 50%, GRiD survey shows 45%, Mercer shows 55%. Current value is within range but flagging for awareness.",
              status: "DEFERRED",
              reviewedById: admin.id,
              reviewedAt: new Date("2026-02-02T09:00:00Z"),
              reviewNotes: "Values are all within reasonable range. Will monitor next quarter.",
            },
            {
              findingType: "DATA_CONFIRMED",
              country: "FR",
              benefitCategory: "HEALTH",
              confidence: 0.95,
              severity: "INFO",
              aiReasoning: "France mandatory mutuelle (ANI) requirement confirmed. 98% prevalence rate consistent with legal obligation for all private sector employers.",
              status: "ACCEPTED",
              reviewedById: admin.id,
              reviewedAt: new Date("2026-02-01T10:20:00Z"),
            },
            {
              findingType: "DATA_CONFIRMED",
              country: "US",
              benefitCategory: "PENSION",
              confidence: 0.88,
              severity: "INFO",
              aiReasoning: "401(k) plan prevalence at 73% and median employer match of 4% confirmed by BLS and SHRM data. SECURE 2.0 provisions continue to encourage broader adoption.",
              status: "ACCEPTED",
              reviewedById: admin.id,
              reviewedAt: new Date("2026-02-01T10:25:00Z"),
            },
          ],
        },
      },
    });
    console.log("  Created sample review cycle for 2026-02 with 10 findings");
  } else {
    console.log("  Sample review cycle already exists");
  }

  console.log("\nSource reference seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
