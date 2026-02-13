import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createClientSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  country: z.string().length(2, "Country code must be 2 characters"),
  industry: z.string().min(1, "Industry is required"),
  employeeCount: z.number().int().positive("Employee count must be positive"),
  userName: z.string().min(1, "User name is required"),
  userEmail: z.string().email("Valid email is required"),
});

export async function POST(req: NextRequest) {
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
    const data = createClientSchema.parse(body);

    // Check email not already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: data.userEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          country: data.country,
          industry: data.industry,
          employeeCount: data.employeeCount,
        },
      });

      const user = await tx.user.create({
        data: {
          name: data.userName,
          email: data.userEmail,
          role: "CLIENT",
          status: "APPROVED",
          company: { connect: { id: company.id } },
          companyRole: "OWNER",
        },
      });

      return { company, user };
    });

    return NextResponse.json(
      {
        message: "Client created successfully",
        company: {
          id: result.company.id,
          name: result.company.name,
        },
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
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
