import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const relationship = await prisma.brokerClientRelationship.findUnique({
      where: { inviteToken: token },
      include: {
        broker: {
          include: { brokerProfile: true },
        },
      },
    });

    if (!relationship || relationship.status !== "INVITED") {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
    }

    return NextResponse.json({
      brokerName: relationship.broker.name || relationship.broker.brokerProfile?.companyName || "A broker",
      inviteEmail: relationship.inviteEmail,
    });
  } catch (error) {
    console.error("Error fetching invite info:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
