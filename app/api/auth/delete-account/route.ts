import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { compare } from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 3 attempts per user per hour
    const rateLimited = checkRateLimit(`delete-account:${session.user.id}`, 60 * 60 * 1000, 3);
    if (rateLimited) return rateLimited;

    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: "Password confirmation required" }, { status: 400 });
    }

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, passwordHash: true, companyId: true, companyRole: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
    }

    // If user is the company OWNER, delete the company and all its data (cascade)
    // Otherwise just delete the user
    await prisma.$transaction(async (tx) => {
      if (user.companyId && user.companyRole === "OWNER") {
        // Check if there are other users in the company
        const otherUsers = await tx.user.count({
          where: { companyId: user.companyId, id: { not: user.id } },
        });

        if (otherUsers > 0) {
          // Transfer ownership concept: just remove this user, don't delete company
          await tx.user.delete({ where: { id: user.id } });
        } else {
          // Delete user first (to avoid FK issues), then company (cascades benefit entries etc)
          await tx.user.delete({ where: { id: user.id } });
          await tx.company.delete({ where: { id: user.companyId } });
        }
      } else {
        await tx.user.delete({ where: { id: user.id } });
      }
    });

    // Send confirmation email (best-effort)
    sendEmail({
      to: user.email,
      subject: "Your Eppione Account Has Been Deleted",
      body: [
        `Hi ${user.name || "there"},`,
        ``,
        `Your Eppione Benchmarking account and associated data have been permanently deleted as requested.`,
        ``,
        `If you did not request this, please contact us immediately at support@eppione.com.`,
        ``,
        `— The Eppione Team`,
      ].join("\n"),
    }).catch(() => {});

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
