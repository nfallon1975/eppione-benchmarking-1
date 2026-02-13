import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { adminBrokerRowSchema } from "@/lib/upload-schemas";

const requestSchema = z.object({
  rows: z.array(adminBrokerRowSchema),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { rows } = requestSchema.parse(body);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided" },
        { status: 400 }
      );
    }

    let brokersCreated = 0;
    const skipped: string[] = [];

    for (const row of rows) {
      const existing = await prisma.user.findUnique({
        where: { email: row.email },
      });

      if (existing) {
        skipped.push(`${row.email} — account already exists`);
        continue;
      }

      await prisma.user.create({
        data: {
          email: row.email,
          name: row.name,
          role: "BROKER",
          status: "APPROVED",
          passwordHash: null,
          brokerProfile: {
            create: {
              companyName: row.companyName,
              licenseNumber: row.licenseNumber || null,
              countriesActive: row.countriesActive,
            },
          },
        },
      });
      brokersCreated++;
    }

    return NextResponse.json({
      success: true,
      brokersCreated,
      skipped,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error uploading admin brokers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
