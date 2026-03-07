import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let config = await prisma.reviewScheduleConfig.findUnique({
      where: { id: "default" },
    });

    if (!config) {
      config = await prisma.reviewScheduleConfig.create({
        data: {
          id: "default",
          priorityCountries: ["IE", "GB"],
          secondaryCountries: ["BE", "FR", "DE", "US"],
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Schedule config error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const config = await prisma.reviewScheduleConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        enabled: body.enabled ?? true,
        dayOfMonth: body.dayOfMonth ?? 1,
        priorityCountries: body.priorityCountries ?? ["IE", "GB"],
        secondaryCountries: body.secondaryCountries ?? ["BE", "FR", "DE", "US"],
        monthlyBudgetCap: body.monthlyBudgetCap ?? 50,
        nextRunAt: body.nextRunAt ? new Date(body.nextRunAt) : null,
      },
      update: {
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.dayOfMonth !== undefined ? { dayOfMonth: body.dayOfMonth } : {}),
        ...(body.priorityCountries ? { priorityCountries: body.priorityCountries } : {}),
        ...(body.secondaryCountries ? { secondaryCountries: body.secondaryCountries } : {}),
        ...(body.monthlyBudgetCap !== undefined ? { monthlyBudgetCap: body.monthlyBudgetCap } : {}),
        ...(body.nextRunAt !== undefined ? { nextRunAt: body.nextRunAt ? new Date(body.nextRunAt) : null } : {}),
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Schedule config error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
