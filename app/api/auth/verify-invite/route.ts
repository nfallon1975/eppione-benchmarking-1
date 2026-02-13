import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encode } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const debug = searchParams.get("debug") === "1";
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!token || !email) {
    if (debug) return NextResponse.json({ error: "MissingParams", token: !!token, email: !!email });
    return NextResponse.redirect(`${baseUrl}/login?error=MissingParams`);
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (debug) return NextResponse.json({ error: "Configuration", hasSecret: false });
    return NextResponse.redirect(`${baseUrl}/login?error=Configuration`);
  }

  try {
    // Look up the verification token directly
    const allTokens = debug
      ? await prisma.verificationToken.findMany({ where: { identifier: email } })
      : [];

    const stored = await prisma.verificationToken.findFirst({
      where: { identifier: email, token },
    });

    if (!stored) {
      if (debug) {
        return NextResponse.json({
          error: "InvalidToken",
          emailFromUrl: email,
          tokenFromUrl: token.substring(0, 10) + "...",
          tokensForEmail: allTokens.map((t: { token: string; expires: Date }) => ({
            tokenPrefix: t.token.substring(0, 10) + "...",
            expires: t.expires,
            matches: t.token === token,
          })),
        });
      }
      return NextResponse.redirect(`${baseUrl}/login?error=InvalidToken`);
    }

    // Delete the token (single use)
    await prisma.verificationToken.deleteMany({
      where: { identifier: email, token },
    });

    if (stored.expires < new Date()) {
      if (debug) return NextResponse.json({ error: "TokenExpired", expires: stored.expires });
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
      if (debug) return NextResponse.json({ error: "UserNotFound", email });
      return NextResponse.redirect(`${baseUrl}/login?error=UserNotFound`);
    }

    if (debug) {
      return NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, role: user.role },
        needsPassword: !user.passwordHash,
        redirectTo: !user.passwordHash ? "/set-password" : "/dashboard",
      });
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
    const needsPassword = !user.passwordHash;
    const redirectTo = needsPassword
      ? `${baseUrl}/set-password`
      : `${baseUrl}/dashboard`;

    const response = NextResponse.redirect(redirectTo);

    // Set the NextAuth session cookie
    const cookieName = baseUrl.startsWith("https")
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    response.cookies.set(cookieName, jwt, {
      httpOnly: true,
      secure: baseUrl.startsWith("https"),
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err) {
    if (debug) return NextResponse.json({ error: "Exception", message: String(err) });
    return NextResponse.redirect(`${baseUrl}/login?error=ServerError`);
  }
}
