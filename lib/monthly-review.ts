import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { updateConfidenceScore } from "@/lib/confidence-scoring";
import { notifyReviewComplete } from "@/lib/notifications";

const MAX_API_CALLS_PER_HOUR = 30;
const DEFAULT_BUDGET_CAP = 50; // dollars
const ESTIMATED_COST_PER_CALL = 0.03; // approximate

interface AIFinding {
  data_point_id: string;
  finding_type: string;
  current_value?: string;
  suggested_value?: string;
  confidence: number;
  severity: string;
  reasoning: string;
  source_title?: string;
  source_url?: string;
  source_type?: string;
  source_reliability?: string;
  source_publication_date?: string;
}

interface AINewSource {
  title: string;
  url?: string;
  publisher: string;
  type: string;
  reliability: string;
  relevance: string;
  note?: string;
}

interface AIReviewResponse {
  country: string;
  review_date: string;
  findings: AIFinding[];
  new_sources_discovered: AINewSource[];
  country_summary: string;
}

const SYSTEM_PROMPT = `You are a benefits compliance and benchmarking data analyst for Eppione, a global employee benefits platform. Your role is to review existing benchmarking and compliance data for accuracy and currency.

For each data point provided, you should:
1. Assess whether the value is still likely to be accurate
2. Search for more recent data from public sources
3. Check for regulatory changes that might affect the data
4. Identify any new sources that could improve data quality
5. Provide a confidence score and reasoning

When searching, prioritise these source types (in order):
- Government/regulator publications (highest reliability)
- Major consultancy reports (Mercer, WTW, Aon, Gallagher)
- Insurance industry bodies and trade associations
- Large insurer published research (like AG Insurance, Aviva, Zurich)
- Reputable benefits industry publications
- Major news outlets reporting on regulatory changes

IMPORTANT:
- Only suggest value changes if you find specific, citable evidence
- Do not guess or estimate — flag as 'unable to verify' if unsure
- Always provide the URL of any new source you find
- Note if a source is behind a paywall
- Be specific about what changed and when
- For regulatory data, distinguish between enacted law, proposed legislation, and industry practice

Respond in valid JSON matching this schema:
{
  "country": "ISO code",
  "review_date": "YYYY-MM-DD",
  "findings": [
    {
      "data_point_id": "id of the data point",
      "finding_type": "VALUE_CHANGED | NEW_DATA_AVAILABLE | SOURCE_EXPIRED | DATA_CONFIRMED | NEW_REGULATION | CONFLICTING_DATA | NEW_SOURCE_DISCOVERED | SOURCE_UNAVAILABLE",
      "current_value": "optional current value",
      "suggested_value": "optional new value",
      "confidence": 0.0-1.0,
      "severity": "INFO | LOW | MEDIUM | HIGH | CRITICAL",
      "reasoning": "detailed explanation",
      "source_title": "name of source",
      "source_url": "URL if available",
      "source_type": "GOVERNMENT_REPORT | INDUSTRY_SURVEY | etc",
      "source_reliability": "OFFICIAL | HIGH | MEDIUM | LOW",
      "source_publication_date": "YYYY-MM-DD if known"
    }
  ],
  "new_sources_discovered": [
    {
      "title": "source title",
      "url": "URL",
      "publisher": "publisher name",
      "type": "source type",
      "reliability": "reliability level",
      "relevance": "why this source is useful",
      "note": "optional note"
    }
  ],
  "country_summary": "Brief overall assessment"
}`;

function buildCountryPrompt(
  country: string,
  dataPoints: { id: string; category: string; metric: string; label: string; value: number; unit: string }[],
  sources: { title: string; url: string | null; lastVerified: Date | null }[]
): string {
  const grouped = new Map<string, typeof dataPoints>();
  for (const dp of dataPoints) {
    const list = grouped.get(dp.category) || [];
    list.push(dp);
    grouped.set(dp.category, list);
  }

  let prompt = `Review the following benchmarking data for country: ${country}\n\n`;
  prompt += `Today's date: ${new Date().toISOString().split("T")[0]}\n\n`;

  prompt += `## Current Data Points\n\n`;
  for (const [category, points] of Array.from(grouped.entries())) {
    prompt += `### ${category}\n`;
    for (const p of points) {
      prompt += `- [${p.id}] ${p.label}: ${p.value} ${p.unit}\n`;
    }
    prompt += `\n`;
  }

  if (sources.length > 0) {
    prompt += `## Linked Sources\n\n`;
    for (const s of sources) {
      const verified = s.lastVerified
        ? `last verified ${s.lastVerified.toISOString().split("T")[0]}`
        : "never verified";
      prompt += `- ${s.title}${s.url ? ` (${s.url})` : ""} — ${verified}\n`;
    }
    prompt += `\n`;
  }

  prompt += `Please review each data point for accuracy, check for updates, and identify any new sources or regulatory changes.`;

  return prompt;
}

/**
 * Check if a URL is accessible.
 */
async function checkUrlAccessible(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Run a monthly review for specified countries.
 */
export async function runMonthlyReview(
  countries: string[],
  runById: string | null,
  budgetCap: number = DEFAULT_BUDGET_CAP
): Promise<string> {
  const month = new Date().toISOString().slice(0, 7); // "2026-03"

  // Create or update the review cycle
  const cycle = await prisma.monthlyReviewCycle.upsert({
    where: { month },
    create: {
      month,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      countriesReviewed: countries,
      runById,
    },
    update: {
      status: "IN_PROGRESS",
      startedAt: new Date(),
      countriesReviewed: countries,
      runById,
    },
  });

  let totalDataPoints = 0;
  let totalUpdates = 0;
  let totalFlags = 0;
  let totalSourcesChecked = 0;
  let newSourcesFound = 0;
  let estimatedCost = 0;
  let apiCallCount = 0;
  const summaries: string[] = [];

  try {
    const client = new Anthropic();

    for (const country of countries) {
      // Budget check
      if (estimatedCost >= budgetCap) {
        summaries.push(`Budget cap of $${budgetCap} reached. Skipping remaining countries.`);
        break;
      }

      // Rate limit check
      if (apiCallCount >= MAX_API_CALLS_PER_HOUR) {
        summaries.push(`Rate limit of ${MAX_API_CALLS_PER_HOUR} API calls reached. Skipping remaining countries.`);
        break;
      }

      // Step 1: Gather current data
      const benchmarks = await prisma.baselineBenchmark.findMany({
        where: {
          country,
          source: { isActive: true },
        },
        include: {
          source: { select: { name: true } },
        },
      });

      if (benchmarks.length === 0) continue;

      const dataPoints = benchmarks.map((b) => ({
        id: b.id,
        category: b.benefitCategory,
        metric: b.metricType,
        label: b.metricLabel,
        value: b.value,
        unit: b.unit,
      }));

      totalDataPoints += dataPoints.length;

      // Get linked sources
      const benchmarkIds = benchmarks.map((b) => b.id);
      const sourceLinks = await prisma.dataPointSourceLink.findMany({
        where: {
          linkedType: "BASELINE_BENCHMARK",
          linkedId: { in: benchmarkIds },
        },
        include: {
          source: {
            select: { id: true, title: true, url: true, lastVerifiedAt: true, isActive: true },
          },
        },
      });

      const uniqueSources = new Map<string, { title: string; url: string | null; lastVerified: Date | null }>();
      for (const sl of sourceLinks) {
        if (!uniqueSources.has(sl.source.id)) {
          uniqueSources.set(sl.source.id, {
            title: sl.source.title,
            url: sl.source.url,
            lastVerified: sl.source.lastVerifiedAt,
          });
        }
      }

      // Step 2: Check existing source URLs
      for (const [sourceId, src] of Array.from(uniqueSources.entries())) {
        totalSourcesChecked++;
        if (src.url) {
          const accessible = await checkUrlAccessible(src.url);
          if (!accessible) {
            await prisma.monthlyReviewFinding.create({
              data: {
                reviewCycleId: cycle.id,
                findingType: "SOURCE_UNAVAILABLE",
                country,
                confidence: 0.9,
                severity: "MEDIUM",
                aiReasoning: `Source URL is no longer accessible: ${src.url}`,
                linkedType: "BASELINE_BENCHMARK",
                linkedId: benchmarkIds[0],
                sourceReferenceId: sourceId,
              },
            });
            totalFlags++;
          }
        }
      }

      // Step 3: AI review
      const prompt = buildCountryPrompt(
        country,
        dataPoints,
        Array.from(uniqueSources.values())
      );

      apiCallCount++;
      estimatedCost += ESTIMATED_COST_PER_CALL;

      let aiResponse: AIReviewResponse | null = null;

      try {
        const message = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        });

        const textContent = message.content.find((c) => c.type === "text");
        if (textContent && textContent.type === "text") {
          // Extract JSON from response (may be wrapped in code block)
          let jsonStr = textContent.text;
          const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) jsonStr = jsonMatch[1];
          aiResponse = JSON.parse(jsonStr.trim());
        }
      } catch (err) {
        console.error(`AI review failed for ${country}:`, err);
        summaries.push(`${country}: AI review failed — ${err instanceof Error ? err.message : "unknown error"}`);
        continue;
      }

      if (!aiResponse) continue;

      // Step 4: Process findings
      for (const finding of aiResponse.findings) {
        const validTypes = [
          "VALUE_CHANGED", "NEW_DATA_AVAILABLE", "SOURCE_EXPIRED",
          "SOURCE_UPDATED", "CONFLICTING_DATA", "NEW_REGULATION",
          "DATA_CONFIRMED", "SOURCE_UNAVAILABLE", "NEW_SOURCE_DISCOVERED",
        ];
        const validSeverities = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

        const findingType = validTypes.includes(finding.finding_type)
          ? finding.finding_type
          : "DATA_CONFIRMED";
        const severity = validSeverities.includes(finding.severity)
          ? finding.severity
          : "INFO";

        // Create source reference if AI found a new source
        let sourceRefId: string | undefined;
        if (finding.source_title && finding.source_url) {
          const existingSource = await prisma.dataSourceReference.findFirst({
            where: { title: finding.source_title },
          });
          if (existingSource) {
            sourceRefId = existingSource.id;
          }
        }

        await prisma.monthlyReviewFinding.create({
          data: {
            reviewCycleId: cycle.id,
            findingType: findingType as never,
            country,
            linkedType: "BASELINE_BENCHMARK",
            linkedId: finding.data_point_id || null,
            currentValue: finding.current_value || null,
            suggestedValue: finding.suggested_value || null,
            confidence: Math.max(0, Math.min(1, finding.confidence)),
            severity: severity as never,
            aiReasoning: finding.reasoning,
            sourceReferenceId: sourceRefId || null,
            newSourceUrl: finding.source_url || null,
          },
        });

        if (findingType !== "DATA_CONFIRMED" && findingType !== "SOURCE_UPDATED") {
          totalUpdates++;
        }
        if (severity === "HIGH" || severity === "CRITICAL") {
          totalFlags++;
        }
      }

      // Process new sources discovered
      for (const newSource of aiResponse.new_sources_discovered) {
        newSourcesFound++;
        await prisma.monthlyReviewFinding.create({
          data: {
            reviewCycleId: cycle.id,
            findingType: "NEW_SOURCE_DISCOVERED",
            country,
            confidence: 0.7,
            severity: "LOW",
            aiReasoning: `New source discovered: ${newSource.title} by ${newSource.publisher}. ${newSource.relevance}${newSource.note ? ` Note: ${newSource.note}` : ""}`,
            newSourceUrl: newSource.url || null,
          },
        });
      }

      summaries.push(`${country}: ${aiResponse.country_summary}`);

      // Step 5: Recalculate confidence scores for reviewed data points
      for (const dp of dataPoints) {
        try {
          await updateConfidenceScore({
            linkedType: "BASELINE_BENCHMARK",
            linkedId: dp.id,
            calculationMethod: "AI_REVIEW",
          });
        } catch {
          // Non-critical
        }
      }
    }

    // Update cycle as completed
    await prisma.monthlyReviewCycle.update({
      where: { id: cycle.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        totalDataPointsReviewed: totalDataPoints,
        totalUpdatesFound: totalUpdates,
        totalFlagsRaised: totalFlags,
        totalSourcesChecked: totalSourcesChecked,
        newSourcesDiscovered: newSourcesFound,
        aiCostEstimate: Math.round(estimatedCost * 100) / 100,
        summary: summaries.join("\n"),
      },
    });

    // Send notifications
    await notifyReviewComplete(cycle.id).catch((err) =>
      console.error("Failed to send review notifications:", err)
    );

    return cycle.id;
  } catch (error) {
    await prisma.monthlyReviewCycle.update({
      where: { id: cycle.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        summary: `Review failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    });
    throw error;
  }
}

/**
 * Accept a review finding — apply the suggested change.
 */
export async function acceptFinding(
  findingId: string,
  reviewedById: string,
  notes?: string
): Promise<void> {
  const finding = await prisma.monthlyReviewFinding.findUnique({
    where: { id: findingId },
  });
  if (!finding) throw new Error("Finding not found");

  await prisma.$transaction(async (tx) => {
    // Mark finding as accepted
    await tx.monthlyReviewFinding.update({
      where: { id: findingId },
      data: {
        status: "ACCEPTED",
        reviewedById,
        reviewedAt: new Date(),
        reviewNotes: notes || null,
      },
    });

    // Apply changes based on finding type
    if (finding.findingType === "VALUE_CHANGED" && finding.linkedId && finding.suggestedValue) {
      const numericValue = parseFloat(finding.suggestedValue.replace(/[^0-9.-]/g, ""));
      if (!isNaN(numericValue)) {
        // Record history
        await tx.dataPointHistory.create({
          data: {
            linkedType: finding.linkedType || "BASELINE_BENCHMARK",
            linkedId: finding.linkedId,
            changeType: "UPDATED",
            previousValue: finding.currentValue,
            newValue: finding.suggestedValue,
            changedById: reviewedById,
            changeSource: "MONTHLY_REVIEW",
            reviewCycleId: finding.reviewCycleId,
            notes: finding.aiReasoning,
          },
        });

        // Update the baseline benchmark value
        if (finding.linkedType === "BASELINE_BENCHMARK") {
          await tx.baselineBenchmark.update({
            where: { id: finding.linkedId },
            data: { value: numericValue },
          });
        }
      }
    }

    if (finding.findingType === "NEW_SOURCE_DISCOVERED" && finding.newSourceUrl) {
      // Create a new source reference (will need admin to fill in details)
      await tx.dataSourceReference.create({
        data: {
          type: "OTHER",
          title: `New source from review — ${finding.country}`,
          publisher: "Discovered by AI review",
          country: finding.country,
          url: finding.newSourceUrl,
          summary: finding.aiReasoning,
          reliability: "UNVERIFIED",
          addedById: reviewedById,
        },
      });
    }

    if (finding.findingType === "SOURCE_UNAVAILABLE" && finding.sourceReferenceId) {
      await tx.dataSourceReference.update({
        where: { id: finding.sourceReferenceId },
        data: { isActive: false },
      });

      await tx.dataPointHistory.create({
        data: {
          linkedType: finding.linkedType || "BASELINE_BENCHMARK",
          linkedId: finding.linkedId || "",
          changeType: "DEACTIVATED",
          changedById: reviewedById,
          changeSource: "MONTHLY_REVIEW",
          reviewCycleId: finding.reviewCycleId,
          notes: `Source deactivated: ${finding.aiReasoning}`,
        },
      });
    }
  });
}

/**
 * Reject a review finding.
 */
export async function rejectFinding(
  findingId: string,
  reviewedById: string,
  notes: string
): Promise<void> {
  await prisma.monthlyReviewFinding.update({
    where: { id: findingId },
    data: {
      status: "REJECTED",
      reviewedById,
      reviewedAt: new Date(),
      reviewNotes: notes,
    },
  });
}

/**
 * Defer a review finding to next month.
 */
export async function deferFinding(
  findingId: string,
  reviewedById: string,
  notes?: string
): Promise<void> {
  await prisma.monthlyReviewFinding.update({
    where: { id: findingId },
    data: {
      status: "DEFERRED",
      reviewedById,
      reviewedAt: new Date(),
      reviewNotes: notes || "Deferred to next review cycle",
    },
  });
}

/**
 * Estimate the cost of running a review for given countries.
 */
export async function estimateReviewCost(
  countries: string[]
): Promise<{ countries: number; dataPoints: number; estimatedCost: number; estimatedMinutes: number }> {
  let totalDataPoints = 0;
  for (const country of countries) {
    const count = await prisma.baselineBenchmark.count({
      where: { country, source: { isActive: true } },
    });
    totalDataPoints += count;
  }

  // One API call per country (batched by country)
  const apiCalls = countries.length;
  const estimatedCost = Math.round(apiCalls * ESTIMATED_COST_PER_CALL * 100) / 100;
  const estimatedMinutes = Math.ceil(apiCalls * 0.5); // ~30 seconds per country

  return {
    countries: countries.length,
    dataPoints: totalDataPoints,
    estimatedCost,
    estimatedMinutes,
  };
}
