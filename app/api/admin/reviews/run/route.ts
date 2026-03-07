import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runMonthlyReview, estimateReviewCost } from "@/lib/monthly-review";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { countries, budgetCap, estimate } = body;

    if (!countries || !Array.isArray(countries) || countries.length === 0) {
      return NextResponse.json({ error: "countries array is required" }, { status: 400 });
    }

    // If estimate flag is set, just return the cost estimate
    if (estimate) {
      const cost = await estimateReviewCost(countries);
      return NextResponse.json(cost);
    }

    const month = new Date().toISOString().slice(0, 7);

    // Don't await — let it run in the background
    runMonthlyReview(countries, session.user.id, budgetCap).catch((err) =>
      console.error("Review failed:", err)
    );

    return NextResponse.json({ cycleId: month, status: "started" });
  } catch (error) {
    console.error("Error triggering review:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get distinct countries that have baseline data
    const countriesRaw = await prisma.baselineBenchmark.findMany({
      where: { source: { isActive: true } },
      select: { country: true },
      distinct: ["country"],
    });

    const countries = countriesRaw.map((c) => c.country).filter(Boolean);

    if (countries.length === 0) {
      return NextResponse.json({
        countries: 0,
        dataPoints: 0,
        estimatedCost: 0,
        estimatedMinutes: 0,
        countryList: [],
      });
    }

    const cost = await estimateReviewCost(countries);

    return NextResponse.json({
      ...cost,
      countryList: countries,
    });
  } catch (error) {
    console.error("Error estimating review cost:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
