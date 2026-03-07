import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "summary") {
      // Dashboard summary stats
      const allScores = await prisma.dataConfidenceScore.findMany({
        select: { overallConfidence: true, flagged: true },
      });

      const avgConfidence = allScores.length > 0
        ? Math.round((allScores.reduce((s, c) => s + c.overallConfidence, 0) / allScores.length) * 100) / 100
        : 0;

      const flaggedCount = allScores.filter((s) => s.flagged).length;

      // Stale sources (not verified in >12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const staleCount = await prisma.dataSourceReference.count({
        where: {
          isActive: true,
          OR: [
            { lastVerifiedAt: null },
            { lastVerifiedAt: { lt: twelveMonthsAgo } },
          ],
        },
      });

      // Pending findings
      const pendingCount = await prisma.monthlyReviewFinding.count({
        where: { status: "PENDING_REVIEW" },
      });

      return NextResponse.json({
        avgConfidence,
        flaggedCount,
        staleCount,
        pendingCount,
        totalScored: allScores.length,
      });
    }

    // Default: list all confidence scores
    const linkedType = searchParams.get("linkedType") || undefined;
    const flagged = searchParams.get("flagged");

    const scores = await prisma.dataConfidenceScore.findMany({
      where: {
        ...(linkedType ? { linkedType: linkedType as never } : {}),
        ...(flagged === "true" ? { flagged: true } : {}),
      },
      orderBy: { overallConfidence: "asc" },
    });

    return NextResponse.json(scores);
  } catch (error) {
    console.error("Confidence API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
