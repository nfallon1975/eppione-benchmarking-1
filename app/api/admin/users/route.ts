import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyUserApproved, notifyUserRejected } from "@/lib/email";
import { z } from "zod";

const updateUserStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        companyRole: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            country: true,
            industry: true,
            employeeCount: true,
          },
        },
        brokerProfile: {
          select: {
            companyName: true,
            licenseNumber: true,
            countriesActive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, status } = updateUserStatusSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Fire-and-forget user notification
    const notifyPayload = {
      name: updatedUser.name || "User",
      email: updatedUser.email,
    };
    if (status === "APPROVED") {
      notifyUserApproved(notifyPayload).catch((err) =>
        console.error("Failed to send approval notification:", err)
      );
    } else if (status === "REJECTED") {
      notifyUserRejected(notifyPayload).catch((err) =>
        console.error("Failed to send rejection notification:", err)
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating user status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
