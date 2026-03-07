import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const cycles = await prisma.monthlyReviewCycle.findMany({
      orderBy: { month: "desc" },
      include: {
        _count: { select: { findings: true } },
        findings: {
          select: { severity: true, status: true },
        },
      },
    });

    const result = cycles.map((cycle) => {
      const severityCounts: Record<string, number> = {};
      const statusCounts: Record<string, number> = {};
      for (const f of cycle.findings) {
        severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
        statusCounts[f.status] = (statusCounts[f.status] || 0) + 1;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { findings, ...rest } = cycle;
      return {
        ...rest,
        severityCounts,
        statusCounts,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error listing review cycles:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
