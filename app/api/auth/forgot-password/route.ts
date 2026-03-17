import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 requests per IP per 15 minutes
    const ip = getClientIp(req);
    const rateLimited = checkRateLimit(`forgot-password:${ip}`, 15 * 60 * 1000, 3);
    if (rateLimited) return rateLimited;

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Always return 200 to prevent email enumeration
    const successResponse = NextResponse.json({
      message: "If an account exists with that email, a reset link has been sent.",
    });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) return successResponse;

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: `reset:${user.email}` },
    });

    // Store token
    await prisma.verificationToken.create({
      data: {
        identifier: `reset:${user.email}`,
        token,
        expires,
      },
    });

    // Send email
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    await sendEmail({
      to: user.email,
      subject: "Reset Your Password — Eppione Benchmarking",
      body: [
        `Hi ${user.name || "there"},`,
        ``,
        `We received a request to reset your password. Click the link below to set a new password:`,
        ``,
        resetUrl,
        ``,
        `This link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
        ``,
        `— The Eppione Team`,
      ].join("\n"),
    });

    return successResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
