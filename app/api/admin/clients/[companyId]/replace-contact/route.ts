import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const replaceContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email } = replaceContactSchema.parse(body);

    // Validate email not already taken
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: params.companyId },
      include: { users: { select: { id: true } } },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const oldUserIds = company.users.map((u) => u.id);

    const newUser = await prisma.$transaction(async (tx) => {
      // Create new user linked to same company
      const created = await tx.user.create({
        data: {
          name,
          email,
          role: "CLIENT",
          status: "APPROVED",
          company: { connect: { id: params.companyId } },
          companyRole: "OWNER",
        },
      });

      // Delete compliance data contributed by old users
      await tx.countryBenefitRequirement.deleteMany({
        where: { contributedById: { in: oldUserIds } },
      });
      await tx.countryStatutoryLimit.deleteMany({
        where: { contributedById: { in: oldUserIds } },
      });

      // Delete old users
      await tx.user.deleteMany({
        where: { id: { in: oldUserIds } },
      });

      return created;
    });

    return NextResponse.json({
      message: "Contact replaced successfully",
      user: { id: newUser.id, name: newUser.name, email: newUser.email },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error replacing contact:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
