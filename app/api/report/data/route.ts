import { NextRequest, NextResponse } from "next/server";
import { getReportData } from "@/lib/pdf/report-token-store";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const data = getReportData(token);
  if (!data) {
    return NextResponse.json({ error: "Token expired or invalid" }, { status: 404 });
  }

  return NextResponse.json(data);
}
