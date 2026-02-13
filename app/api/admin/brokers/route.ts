import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createBrokerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  companyName: z.string().min(1, "Firm name is required"),
  licenseNumber: z.string().optional(),
  countriesActive: z
    .array(z.string().length(2, "Country codes must be 2 characters"))
    .min(1, "At least one country is required"),
});

const updateBrokerSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  companyName: z.string().min(1).optional(),
  licenseNumber: z.string().optional().nullable(),
  countriesActive: z
    .array(z.string().length(2))
    .min(1)
    .optional(),
});

async function verifyAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const brokers = await prisma.user.findMany({
      where: { role: "BROKER" },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        brokerProfile: {
          select: {
            id: true,
            companyName: true,
            licenseNumber: true,
            countriesActive: true,
          },
        },
        brokerClients: {
          select: {
            id: true,
            status: true,
            company: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(brokers);
  } catch (error) {
    console.error("Error fetching brokers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = createBrokerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

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
          companyName: data.companyName,
          licenseNumber: data.licenseNumber,
          countriesActive: data.countriesActive,
        },
      });

      return { user, brokerProfile };
    });

    return NextResponse.json(
      {
        message: "Broker created successfully",
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
        brokerProfile: {
          companyName: result.brokerProfile.companyName,
          countriesActive: result.brokerProfile.countriesActive,
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
    console.error("Error creating broker:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateBrokerSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { brokerProfile: true },
    });

    if (!user || user.role !== "BROKER") {
      return NextResponse.json(
        { error: "Broker not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (data.name || data.email) {
        await tx.user.update({
          where: { id: data.userId },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.email && { email: data.email }),
          },
        });
      }

      if (
        user.brokerProfile &&
        (data.companyName || data.licenseNumber !== undefined || data.countriesActive)
      ) {
        await tx.brokerProfile.update({
          where: { id: user.brokerProfile.id },
          data: {
            ...(data.companyName && { companyName: data.companyName }),
            ...(data.licenseNumber !== undefined && {
              licenseNumber: data.licenseNumber,
            }),
            ...(data.countriesActive && {
              countriesActive: data.countriesActive,
            }),
          },
        });
      }
    });

    return NextResponse.json({ message: "Broker updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating broker:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== "BROKER") {
      return NextResponse.json(
        { error: "Broker not found" },
        { status: 404 }
      );
    }

    // Cascade delete handles BrokerProfile and BrokerClientRelationships
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: "Broker deleted successfully" });
  } catch (error) {
    console.error("Error deleting broker:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
