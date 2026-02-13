import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const addUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  companyRole: z.enum(["OWNER", "CONTRIBUTOR", "VIEWER"]),
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
    const data = addUserSchema.parse(body);

    // Validate company exists
    const company = await prisma.company.findUnique({
      where: { id: params.companyId },
    });
    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
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

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: "CLIENT",
        status: "APPROVED",
        company: { connect: { id: params.companyId } },
        companyRole: data.companyRole,
      },
    });

    return NextResponse.json(
      {
        message: "User added successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          companyRole: user.companyRole,
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
    console.error("Error adding user to company:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
