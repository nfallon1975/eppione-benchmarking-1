import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);
      return NextResponse.json({ accessible: res.ok, status: res.status });
    } catch (err: unknown) {
      clearTimeout(timeout);
      const message = err instanceof Error ? err.message : "Request failed";
      return NextResponse.json({ accessible: false, error: message });
    }
  } catch (error) {
    console.error("POST /api/admin/sources/check-url error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
