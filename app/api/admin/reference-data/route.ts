import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");

    const where: Record<string, unknown> = {};
    if (country) where.country = country;

    const data = await prisma.referenceBenchmark.findMany({
      where,
      orderBy: [{ country: "asc" }, { benefitCategory: "asc" }],
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching reference data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Remove fields that shouldn't be updated directly
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.generatedAt;

    const updated = await prisma.referenceBenchmark.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating reference data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, id, country } = body;

    if (action === "verify" && id) {
      const updated = await prisma.referenceBenchmark.update({
        where: { id },
        data: { verifiedByAdmin: true, lastReviewedAt: new Date() },
      });
      return NextResponse.json(updated);
    }

    if (action === "publish" && id) {
      const updated = await prisma.referenceBenchmark.update({
        where: { id },
        data: {
          verifiedByAdmin: true,
          publishedAt: new Date(),
          lastReviewedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "publish_all" && country) {
      const result = await prisma.referenceBenchmark.updateMany({
        where: { country },
        data: {
          verifiedByAdmin: true,
          publishedAt: new Date(),
          lastReviewedAt: new Date(),
        },
      });
      return NextResponse.json({ updated: result.count });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error patching reference data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
