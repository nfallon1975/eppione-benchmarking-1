import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rejectFinding } from "@/lib/monthly-review";

export async function POST(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { findingId, notes } = body;

    if (!findingId) {
      return NextResponse.json({ error: "findingId is required" }, { status: 400 });
    }

    if (!notes) {
      return NextResponse.json({ error: "notes is required when rejecting a finding" }, { status: 400 });
    }

    await rejectFinding(findingId, session.user.id, notes);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error rejecting finding:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
