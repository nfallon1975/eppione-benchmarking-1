import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateCountryConfig } from "@/lib/country-config";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const country = req.nextUrl.searchParams.get("country");
  if (!country) {
    return NextResponse.json({ error: "country parameter required" }, { status: 400 });
  }

  const config = await getOrCreateCountryConfig(country);
  return NextResponse.json(config);
}
