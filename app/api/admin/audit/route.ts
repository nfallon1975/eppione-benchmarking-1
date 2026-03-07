import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const linkedType = searchParams.get("linkedType");
    const linkedId = searchParams.get("linkedId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: Record<string, unknown> = {};
    if (linkedType) where.linkedType = linkedType;
    if (linkedId) where.linkedId = linkedId;

    const history = await prisma.dataPointHistory.findMany({
      where,
      include: {
        changedBy: { select: { name: true, email: true } },
        reviewCycle: { select: { month: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Audit trail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
