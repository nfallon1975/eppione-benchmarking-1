import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const platformTypeEnum = z.enum([
  "FLEX_BENEFITS",
  "TOTAL_REWARD",
  "VOLUNTARY",
  "DISCOUNT",
  "WELLBEING",
  "OTHER",
]);

const feeModelEnum = z.enum([
  "PER_EMPLOYEE_PER_MONTH",
  "PER_EMPLOYEE_PER_YEAR",
  "FLAT_FEE",
  "PERCENTAGE",
  "OTHER",
]);

const platformSchema = z.object({
  usesPlatform: z.boolean(),
  platformName: z.string().nullable().optional(),
  platformType: platformTypeEnum.nullable().optional(),
  annualPlatformFee: z.number().positive().nullable().optional(),
  feeCurrency: z.string().min(1).optional(),
  feeModel: feeModelEnum.nullable().optional(),
  platformSatisfactionScore: z.number().int().min(1).max(10).nullable().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { companyId } = session.user;

    if (!companyId) {
      return NextResponse.json(
        { error: "No company associated with this account" },
        { status: 404 }
      );
    }

    const platformInfo = await prisma.platformInfo.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(platformInfo);
  } catch (error) {
    console.error("Error fetching platform info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { companyId } = session.user;

    if (!companyId) {
      return NextResponse.json(
        { error: "No company associated with this account" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const data = platformSchema.parse(body);

    // Check if platform info already exists for this company
    const existing = await prisma.platformInfo.findFirst({
      where: { companyId },
    });

    let platformInfo;

    if (existing) {
      // Update existing platform info
      platformInfo = await prisma.platformInfo.update({
        where: { id: existing.id },
        data,
      });
    } else {
      // Create new platform info
      platformInfo = await prisma.platformInfo.create({
        data: {
          ...data,
          companyId,
        },
      });
    }

    return NextResponse.json(platformInfo, { status: existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error saving platform info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
