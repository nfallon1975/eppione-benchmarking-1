import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const addBrokerUserSchema = z.object({
  brokerId: z.string().min(1, "Broker ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = addBrokerUserSchema.parse(body);

    // Look up the existing broker and their profile
    const existingBroker = await prisma.user.findUnique({
      where: { id: data.brokerId },
      include: { brokerProfile: true },
    });

    if (!existingBroker || existingBroker.role !== "BROKER" || !existingBroker.brokerProfile) {
      return NextResponse.json(
        { error: "Broker not found" },
        { status: 404 }
      );
    }

    // Check email not already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const profile = existingBroker.brokerProfile;

    // Create new user + broker profile with the same firm details
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          role: "BROKER",
          status: "APPROVED",
        },
      });

      const brokerProfile = await tx.brokerProfile.create({
        data: {
          user: { connect: { id: user.id } },
          companyName: profile.companyName,
          licenseNumber: profile.licenseNumber,
          countriesActive: profile.countriesActive,
        },
      });

      return { user, brokerProfile };
    });

    return NextResponse.json(
      {
        message: "Broker user added successfully",
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error adding broker user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
