import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { notifyAdminNewRegistration, notifyBrokerClientAccepted } from "@/lib/email";
import { validatePassword } from "@/lib/password";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";

const passwordSchema = z.string().refine(
  (val: string) => validatePassword(val).valid,
  { message: "Password must be at least 10 characters with uppercase, lowercase, digit, and special character" }
);

const clientRegisterSchema = z.object({
  role: z.literal("CLIENT").optional().default("CLIENT"),
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1),
  companyName: z.string().min(1),
  country: z.string().length(2),
  industry: z.string().min(1),
  employeeCount: z.number().int().positive(),
  inviteToken: z.string().optional(),
  acceptedTerms: z.literal(true),
});

const brokerRegisterSchema = z.object({
  role: z.literal("BROKER"),
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1),
  companyName: z.string().min(1),
  licenseNumber: z.string().optional(),
  countriesActive: z.array(z.string().length(2)).min(1),
  acceptedTerms: z.literal(true),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 registrations per IP per hour
    const ip = getClientIp(req);
    const rateLimited = checkRateLimit(`register:${ip}`, 60 * 60 * 1000, 3);
    if (rateLimited) return rateLimited;

    const body = await req.json();
    const role = body.role || "CLIENT";

    if (role === "BROKER") {
      const data = brokerRegisterSchema.parse(body);

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

      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          role: "BROKER",
          status: "PENDING",
          companyId: null,
          brokerProfile: {
            create: {
              companyName: data.companyName,
              licenseNumber: data.licenseNumber || null,
              countriesActive: data.countriesActive,
            },
          },
        },
      });

      notifyAdminNewRegistration({
        name: data.name,
        email: data.email,
        companyName: `${data.companyName} (Broker)`,
      }).catch((err) => console.error("Failed to send admin notification:", err));

      return NextResponse.json(
        {
          message: "Registration successful. Your broker account is pending approval.",
          userId: user.id,
        },
        { status: 201 }
      );
    }

    // CLIENT registration (default)
    const data = clientRegisterSchema.parse(body);

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
        company: { connect: { id: company.id } },
        companyRole: "OWNER",
      },
    });

    // If invite token present, link the broker-client relationship
    if (data.inviteToken) {
      const relationship = await prisma.brokerClientRelationship.findUnique({
        where: { inviteToken: data.inviteToken },
        include: { broker: { include: { brokerProfile: true } } },
      });

      if (relationship && relationship.status === "INVITED") {
        await prisma.brokerClientRelationship.update({
          where: { id: relationship.id },
          data: {
            companyId: company.id,
            status: "ACTIVE",
            acceptedAt: new Date(),
          },
        });

        // Notify broker
        if (relationship.broker) {
          notifyBrokerClientAccepted({
            brokerEmail: relationship.broker.email,
            clientName: data.name,
            clientCompanyName: data.companyName,
          }).catch((err) => console.error("Failed to send broker notification:", err));
        }
      }
    }

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
