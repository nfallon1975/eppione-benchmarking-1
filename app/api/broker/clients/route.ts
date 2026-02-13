import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyBrokerInvite } from "@/lib/email";
import { z } from "zod";
import { randomBytes } from "crypto";

const inviteSchema = z.object({
  email: z.string().email(),
  accessLevel: z.enum(["VIEW_ONLY", "VIEW_AND_ADVISE"]).default("VIEW_ONLY"),
  countries: z.array(z.string().length(2)).default([]),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "BROKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const relationships = await prisma.brokerClientRelationship.findMany({
      where: { brokerId: session.user.id },
      orderBy: { invitedAt: "desc" },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            country: true,
            employeeCount: true,
          },
        },
      },
    });

    return NextResponse.json(
      relationships.map((r) => ({
        id: r.id,
        companyId: r.companyId,
        inviteEmail: r.inviteEmail,
        status: r.status,
        accessLevel: r.accessLevel,
        invitedAt: r.invitedAt,
        acceptedAt: r.acceptedAt,
        company: r.company || null,
        countries: r.countries,
      }))
    );
  } catch (error) {
    console.error("Error fetching broker clients:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "BROKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const data = inviteSchema.parse(body);

    // Check if already invited or active
    const existing = await prisma.brokerClientRelationship.findFirst({
      where: {
        brokerId: session.user.id,
        inviteEmail: data.email,
      },
    });

    if (existing && (existing.status === "INVITED" || existing.status === "ACTIVE")) {
      return NextResponse.json(
        { error: "This email has already been invited or is already a client" },
        { status: 409 }
      );
    }

    const brokerProfile = await prisma.brokerProfile.findUnique({
      where: { userId: session.user.id },
    });

    // Check if user already exists — if so, auto-link
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    let relationship;

    if (existing && existing.status === "UPLOADED") {
      // Transition UPLOADED → INVITED (or ACTIVE if user exists)
      relationship = await prisma.brokerClientRelationship.update({
        where: { id: existing.id },
        data: {
          status: existingUser?.role === "CLIENT" ? "ACTIVE" : "INVITED",
          companyId: existingUser?.role === "CLIENT" ? existingUser.companyId : existing.companyId,
          acceptedAt: existingUser?.role === "CLIENT" ? new Date() : null,
          accessLevel: data.accessLevel,
          countries: data.countries,
          invitedAt: new Date(),
        },
      });
    } else {
      // Create new relationship
      const inviteToken = randomBytes(32).toString("hex");
      relationship = await prisma.brokerClientRelationship.create({
        data: {
          brokerId: session.user.id,
          inviteEmail: data.email,
          inviteToken,
          accessLevel: data.accessLevel,
          countries: data.countries,
          status: existingUser?.role === "CLIENT" ? "ACTIVE" : "INVITED",
          companyId: existingUser?.role === "CLIENT" ? existingUser.companyId : null,
          acceptedAt: existingUser?.role === "CLIENT" ? new Date() : null,
        },
      });
    }

    // Send invite email if user doesn't exist yet
    if (!existingUser || existingUser.role !== "CLIENT") {
      notifyBrokerInvite({
        clientEmail: data.email,
        brokerName: session.user.name || "A broker",
        brokerFirm: brokerProfile?.companyName || "A brokerage firm",
        inviteToken: relationship.inviteToken,
      }).catch((err) => console.error("Failed to send invite email:", err));
    }

    return NextResponse.json(
      {
        message: existingUser?.role === "CLIENT" ? "Client linked successfully" : "Invite sent successfully",
        inviteToken: relationship.inviteToken,
        autoLinked: existingUser?.role === "CLIENT",
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
    console.error("Error creating broker invite:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
