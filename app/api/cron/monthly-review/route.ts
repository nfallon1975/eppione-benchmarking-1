import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runMonthlyReview } from "@/lib/monthly-review";

/**
 * Cron endpoint for scheduled monthly reviews.
 * Protected by CRON_SECRET environment variable.
 * Configure in vercel.json or call externally on a schedule.
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check schedule config
    const config = await prisma.reviewScheduleConfig.findUnique({
      where: { id: "default" },
    });

    if (!config || !config.enabled) {
      return NextResponse.json({ message: "Reviews disabled" });
    }

    // Check if today matches the scheduled day
    const today = new Date();
    if (today.getDate() !== config.dayOfMonth) {
      return NextResponse.json({ message: "Not scheduled for today" });
    }

    // Check if already ran this month
    const currentMonth = today.toISOString().slice(0, 7);
    const existingCycle = await prisma.monthlyReviewCycle.findUnique({
      where: { month: currentMonth },
    });
    if (existingCycle && existingCycle.status !== "SCHEDULED") {
      return NextResponse.json({ message: "Already ran this month" });
    }

    // Determine which countries to review
    const isQuarterlyMonth = [0, 3, 6, 9].includes(today.getMonth()); // Jan, Apr, Jul, Oct
    const countries = isQuarterlyMonth
      ? [...config.priorityCountries, ...config.secondaryCountries]
      : config.priorityCountries;

    if (countries.length === 0) {
      return NextResponse.json({ message: "No countries configured" });
    }

    // Fire and forget
    runMonthlyReview(countries, null, config.monthlyBudgetCap).catch((err) =>
      console.error("Scheduled review failed:", err)
    );

    // Update last run
    await prisma.reviewScheduleConfig.update({
      where: { id: "default" },
      data: {
        lastRunAt: new Date(),
        nextRunAt: new Date(today.getFullYear(), today.getMonth() + 1, config.dayOfMonth),
      },
    });

    return NextResponse.json({
      message: "Review started",
      countries,
      month: currentMonth,
    });
  } catch (error) {
    console.error("Cron review error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
