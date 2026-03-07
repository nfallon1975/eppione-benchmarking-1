import { prisma } from "@/lib/db";

interface ConfidenceInput {
  linkedType: "BASELINE_BENCHMARK" | "COMPLIANCE_REQUIREMENT" | "STATUTORY_LIMIT" | "BROKER_CONTRIBUTION";
  linkedId: string;
  calculationMethod?: string;
}

interface ConfidenceResult {
  overallConfidence: number;
  recencyScore: number;
  sourceQualityScore: number;
  corroborationScore: number;
  consistencyScore: number;
  reasoning: string;
  flagged: boolean;
  flagReason: string | null;
}

const RELIABILITY_SCORES: Record<string, number> = {
  OFFICIAL: 1.0,
  HIGH: 0.85,
  MEDIUM: 0.65,
  LOW: 0.4,
  UNVERIFIED: 0.2,
};

function calculateRecencyScore(publicationDate: Date | null): number {
  if (!publicationDate) return 0.4;
  const yearsAgo = (Date.now() - publicationDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (yearsAgo < 1) return 1.0;
  if (yearsAgo < 2) return 0.8;
  if (yearsAgo < 3) return 0.6;
  if (yearsAgo < 5) return 0.4;
  return 0.2;
}

/**
 * Calculate confidence score for a data point based on its linked sources.
 */
export async function calculateConfidence(input: ConfidenceInput): Promise<ConfidenceResult> {
  const links = await prisma.dataPointSourceLink.findMany({
    where: { linkedType: input.linkedType, linkedId: input.linkedId },
    include: {
      source: {
        select: { reliability: true, publicationDate: true, isActive: true, title: true },
      },
    },
  });

  const activeSources = links.filter((l) => l.source.isActive);
  const primarySources = activeSources.filter((l) => l.relevance === "PRIMARY");
  const supportingSources = activeSources.filter((l) => l.relevance === "SUPPORTING");
  const independentSourceCount = new Set(activeSources.map((l) => l.sourceId)).size;

  // Recency: best recency across all sources
  let recencyScore = 0.2;
  for (const link of activeSources) {
    const score = calculateRecencyScore(link.source.publicationDate);
    if (score > recencyScore) recencyScore = score;
  }

  // Source quality: weighted by relevance
  let sourceQualityScore = 0.2;
  if (primarySources.length > 0) {
    const bestPrimary = Math.max(
      ...primarySources.map((l) => RELIABILITY_SCORES[l.source.reliability] ?? 0.2)
    );
    sourceQualityScore = bestPrimary;
  } else if (supportingSources.length > 0) {
    const bestSupporting = Math.max(
      ...supportingSources.map((l) => RELIABILITY_SCORES[l.source.reliability] ?? 0.2)
    );
    sourceQualityScore = bestSupporting * 0.9; // slight penalty for no primary
  }

  // Corroboration: how many independent sources
  let corroborationScore = 0.2;
  if (independentSourceCount >= 3) corroborationScore = 1.0;
  else if (independentSourceCount === 2) corroborationScore = 0.7;
  else if (independentSourceCount === 1) corroborationScore = 0.4;

  // Consistency: for now, default to 0.8 (would need cross-data-point analysis)
  const consistencyScore = 0.8;

  const overallConfidence =
    recencyScore * 0.3 +
    sourceQualityScore * 0.3 +
    corroborationScore * 0.2 +
    consistencyScore * 0.2;

  // Check for flagging
  let flagged = false;
  let flagReason: string | null = null;

  if (overallConfidence < 0.5) {
    flagged = true;
    flagReason = `Confidence score ${overallConfidence.toFixed(2)} is below 0.5 threshold`;
  }

  // Check if confidence dropped significantly from previous score
  const previousScore = await prisma.dataConfidenceScore.findUnique({
    where: { linkedType_linkedId: { linkedType: input.linkedType, linkedId: input.linkedId } },
  });

  if (previousScore && previousScore.overallConfidence - overallConfidence > 0.2) {
    flagged = true;
    flagReason = `Confidence dropped from ${previousScore.overallConfidence.toFixed(2)} to ${overallConfidence.toFixed(2)} (>${(previousScore.overallConfidence - overallConfidence).toFixed(2)} decrease)`;
  }

  const sourceNames = activeSources.map((l) => l.source.title).join(", ");
  const reasoning = activeSources.length === 0
    ? "No sources linked to this data point."
    : `Based on ${independentSourceCount} source(s): ${sourceNames}. Recency: ${recencyScore.toFixed(1)}, Quality: ${sourceQualityScore.toFixed(1)}, Corroboration: ${corroborationScore.toFixed(1)}, Consistency: ${consistencyScore.toFixed(1)}.`;

  return {
    overallConfidence: Math.round(overallConfidence * 100) / 100,
    recencyScore,
    sourceQualityScore,
    corroborationScore,
    consistencyScore,
    reasoning,
    flagged,
    flagReason,
  };
}

/**
 * Calculate and persist confidence score for a data point.
 */
export async function updateConfidenceScore(
  input: ConfidenceInput
): Promise<ConfidenceResult> {
  const result = await calculateConfidence(input);

  await prisma.dataConfidenceScore.upsert({
    where: {
      linkedType_linkedId: { linkedType: input.linkedType, linkedId: input.linkedId },
    },
    create: {
      linkedType: input.linkedType,
      linkedId: input.linkedId,
      overallConfidence: result.overallConfidence,
      recencyScore: result.recencyScore,
      sourceQualityScore: result.sourceQualityScore,
      corroborationScore: result.corroborationScore,
      consistencyScore: result.consistencyScore,
      calculationMethod: input.calculationMethod || "SYSTEM",
      reasoning: result.reasoning,
      flagged: result.flagged,
      flagReason: result.flagReason,
    },
    update: {
      overallConfidence: result.overallConfidence,
      recencyScore: result.recencyScore,
      sourceQualityScore: result.sourceQualityScore,
      corroborationScore: result.corroborationScore,
      consistencyScore: result.consistencyScore,
      calculatedAt: new Date(),
      calculationMethod: input.calculationMethod || "SYSTEM",
      reasoning: result.reasoning,
      flagged: result.flagged,
      flagReason: result.flagReason,
    },
  });

  return result;
}

/**
 * Get display label for confidence score (client-facing).
 */
export function getConfidenceLabel(score: number): { label: string; icon: string; color: string } {
  if (score >= 0.8) return { label: "Verified", icon: "check", color: "green" };
  if (score >= 0.5) return { label: "Indicative", icon: "warning", color: "amber" };
  return { label: "Limited data", icon: "info", color: "gray" };
}
