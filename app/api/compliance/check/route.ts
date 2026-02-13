import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { brokerHasCountryAccess } from "@/lib/broker-access";
import { runFullComplianceCheck } from "@/lib/compliance";
import { z } from "zod";

const checkSchema = z.object({
  country: z.string().length(2),
  companyId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = checkSchema.parse(body);

    let targetCompanyId: string;

    if (session.user.role === "CLIENT") {
      if (!session.user.companyId) {
        return NextResponse.json({ error: "No company associated" }, { status: 400 });
      }
      targetCompanyId = session.user.companyId;
    } else if (session.user.role === "BROKER") {
      if (!data.companyId) {
        return NextResponse.json({ error: "companyId required for brokers" }, { status: 400 });
      }

      // Verify broker has ACTIVE relationship with this company
      const relationship = await prisma.brokerClientRelationship.findFirst({
        where: {
          brokerId: session.user.id,
          companyId: data.companyId,
          status: "ACTIVE",
        },
      });

      if (!relationship) {
        return NextResponse.json({ error: "No active relationship" }, { status: 403 });
      }

      if (!brokerHasCountryAccess(relationship.countries, data.country)) {
        return NextResponse.json({ error: "You do not have access to this country's data" }, { status: 403 });
      }

      targetCompanyId = data.companyId;
    } else if (session.user.role === "ADMIN") {
      if (!data.companyId) {
        return NextResponse.json({ error: "companyId required for admins" }, { status: 400 });
      }
      targetCompanyId = data.companyId;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const results = await runFullComplianceCheck(targetCompanyId, data.country);

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    console.error("Error running compliance check:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
