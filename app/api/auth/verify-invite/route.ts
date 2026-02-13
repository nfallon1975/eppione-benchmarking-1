import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encode } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const { token, email } = await req.json();
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    if (!token || !email) {
      return NextResponse.json({ error: "Missing token or email" }, { status: 400 });
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Look up the verification token
    const stored = await prisma.verificationToken.findFirst({
      where: { identifier: email, token },
    });

    if (!stored) {
      return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
    }

    // Delete the token (single use)
    await prisma.verificationToken.deleteMany({
      where: { identifier: email, token },
    });

    if (stored.expires < new Date()) {
      return NextResponse.json({ error: "Invite link has expired" }, { status: 400 });
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    // Set the session cookie on the response
    const cookieName = baseUrl.startsWith("https")
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const response = NextResponse.json({ redirectTo });

    response.cookies.set(cookieName, jwt, {
      httpOnly: true,
      secure: baseUrl.startsWith("https"),
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err) {
    console.error("verify-invite error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
