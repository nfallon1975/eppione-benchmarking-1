import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { notifyAdminNewRegistration } from "@/lib/email";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  companyName: z.string().min(1),
  country: z.string().length(2),
  industry: z.string().min(1),
  employeeCount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(data.password, 12);

    const company = await prisma.company.create({
      data: {
        name: data.companyName,
        country: data.country,
        industry: data.industry,
        employeeCount: data.employeeCount,
      },
    });

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: "CLIENT",
        status: "PENDING",
        companyId: company.id,
      },
    });

    // Fire-and-forget admin notification
    notifyAdminNewRegistration({
      name: data.name,
      email: data.email,
      companyName: data.companyName,
    }).catch((err) => console.error("Failed to send admin notification:", err));

    return NextResponse.json(
      {
        message: "Registration successful. Your account is pending approval.",
        userId: user.id,
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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
