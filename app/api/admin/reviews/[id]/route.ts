import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const cycle = await prisma.monthlyReviewCycle.findUnique({
      where: { id: params.id },
      include: {
        findings: {
          include: {
            sourceReference: true,
          },
        },
        runBy: {
          select: { name: true },
        },
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Review cycle not found" }, { status: 404 });
    }

    return NextResponse.json(cycle);
  } catch (error) {
    console.error("Error fetching review cycle:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
