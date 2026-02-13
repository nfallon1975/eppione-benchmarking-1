import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rates = await prisma.currencyRate.findMany({
      orderBy: [{ fromCurrency: "asc" }, { toCurrency: "asc" }],
    });

    return NextResponse.json({ rates });
  } catch (error) {
    console.error("Error fetching currency rates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { fromCurrency, toCurrency, rate } = body;

    if (!fromCurrency || !toCurrency || typeof rate !== "number" || rate <= 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const result = await prisma.currencyRate.upsert({
      where: {
        fromCurrency_toCurrency: { fromCurrency, toCurrency },
      },
      update: { rate },
      create: { fromCurrency, toCurrency, rate },
    });

    return NextResponse.json({ rate: result });
  } catch (error) {
    console.error("Error upserting currency rate:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
