import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { randomBytes } from "crypto";
import { adminClientRowSchema } from "@/lib/upload-schemas";

const requestSchema = z.object({
  rows: z.array(adminClientRowSchema),
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

    let clientsCreated = 0;
    let brokerLinked = 0;
    const skipped: string[] = [];

    for (const row of rows) {
      const existing = await prisma.user.findUnique({
        where: { email: row.email },
      });

      if (existing) {
        skipped.push(`${row.email} — account already exists`);
        continue;
      }

      // Create Company
      const company = await prisma.company.create({
        data: {
          name: row.companyName,
          country: row.country.toUpperCase(),
          industry: row.industry,
          employeeCount: row.employeeCount,
        },
      });

      // Create User
      await prisma.user.create({
        data: {
          email: row.email,
          name: row.name,
          role: "CLIENT",
          status: "APPROVED",
          passwordHash: null,
          company: { connect: { id: company.id } },
          companyRole: "OWNER",
        },
      });

      clientsCreated++;

      // If brokerEmail provided, link to broker
      if (row.brokerEmail) {
        const broker = await prisma.user.findFirst({
          where: { email: row.brokerEmail, role: "BROKER" },
        });

        if (broker) {
          const inviteToken = randomBytes(32).toString("hex");
          await prisma.brokerClientRelationship.create({
            data: {
              brokerId: broker.id,
              companyId: company.id,
              inviteEmail: row.email,
              inviteToken,
              status: "ACTIVE",
              acceptedAt: new Date(),
            },
          });
          brokerLinked++;
        } else {
          skipped.push(`${row.email} — broker ${row.brokerEmail} not found`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      clientsCreated,
      brokerLinked,
      skipped,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error uploading admin clients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
