import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  parseNaturalLanguageQuery,
  executeQuerySpec,
  summarizeResults,
} from "@/lib/data-explorer";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";

    if (!question) {
      return NextResponse.json(
        { error: "Please enter a question." },
        { status: 400 }
      );
    }

    if (question.length > 500) {
      return NextResponse.json(
        { error: "Question must be 500 characters or less." },
        { status: 400 }
      );
    }

    // Role-based company scoping
    let scopedCompanyIds: string[] | null = null;

    if (session.user.role === "ADMIN") {
      // Admin sees all
      scopedCompanyIds = null;
    } else if (session.user.role === "BROKER") {
      const relationships = await prisma.brokerClientRelationship.findMany({
        where: {
          brokerId: session.user.id,
          status: "ACTIVE",
          companyId: { not: null },
        },
        select: {
          companyId: true,
        },
      });

      scopedCompanyIds = relationships
        .map((r) => r.companyId)
        .filter((id): id is string => !!id);

      if (scopedCompanyIds.length === 0) {
        return NextResponse.json({
          query: null,
          results: [],
          summary: "You don't have any active clients yet. Once you have active client relationships, you can explore their data here.",
          totalCount: 0,
        });
      }
    } else {
      // CLIENT
      if (!session.user.companyId) {
        return NextResponse.json({
          query: null,
          results: [],
          summary: "No company is associated with your account. Please complete your company profile first.",
          totalCount: 0,
        });
      }
      scopedCompanyIds = [session.user.companyId];
    }

    // Parse → Execute → Summarize
    const spec = await parseNaturalLanguageQuery(question, session.user.role);
    const { results, totalCount } = await executeQuerySpec(spec, scopedCompanyIds);
    const summary = await summarizeResults(question, results, totalCount);

    return NextResponse.json({
      query: spec,
      results,
      summary,
      totalCount,
    });
  } catch (error) {
    console.error("Data explorer error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try a different question.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
