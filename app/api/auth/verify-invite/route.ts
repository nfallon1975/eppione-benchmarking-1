import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";
import { encode } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!token || !email) {
    return NextResponse.redirect(`${baseUrl}/login?error=MissingParams`);
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(`${baseUrl}/login?error=Configuration`);
  }

  // Hash the token the same way we stored it
  const hashedToken = createHash("sha256")
    .update(`${token}${secret}`)
    .digest("hex");

  // Look up and consume the verification token
  const stored = await prisma.verificationToken.findFirst({
    where: { identifier: email, token: hashedToken },
  });

  if (!stored) {
    return NextResponse.redirect(`${baseUrl}/login?error=InvalidToken`);
  }

  // Delete the token (single use)
  await prisma.verificationToken.deleteMany({
    where: { identifier: email, token: hashedToken },
  });

  if (stored.expires < new Date()) {
    return NextResponse.redirect(`${baseUrl}/login?error=TokenExpired`);
  }

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      companyId: true,
      companyRole: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return NextResponse.redirect(`${baseUrl}/login?error=UserNotFound`);
  }

  // Create a NextAuth JWT token
  const jwt = await encode({
    token: {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      companyId: user.companyId,
      companyRole: user.companyRole,
    },
    secret,
  });

  // Determine where to redirect
  // If user has no password, send them to set one
  const needsPassword = !user.passwordHash;
  const redirectTo = needsPassword
    ? `${baseUrl}/set-password`
    : `${baseUrl}/dashboard`;

  const response = NextResponse.redirect(redirectTo);

  // Set the NextAuth session cookie
  const cookieName =
    baseUrl.startsWith("https") ?
      "__Secure-next-auth.session-token" :
      "next-auth.session-token";

  response.cookies.set(cookieName, jwt, {
    httpOnly: true,
    secure: baseUrl.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return response;
}
