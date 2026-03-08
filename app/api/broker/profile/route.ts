import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "BROKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.brokerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "No broker profile found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("GET /api/broker/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
