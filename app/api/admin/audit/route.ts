import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const linkedType = searchParams.get("linkedType");
    const linkedId = searchParams.get("linkedId");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!linkedType || !linkedId) {
      return NextResponse.json({ error: "linkedType and linkedId are required" }, { status: 400 });
    }

    const entries = await prisma.dataPointHistory.findMany({
      where: { linkedType: linkedType as never, linkedId },
      include: {
        changedBy: { select: { id: true, name: true, email: true } },
        reviewCycle: { select: { month: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("GET /api/admin/audit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
