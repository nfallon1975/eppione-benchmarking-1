import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const relationships = await prisma.brokerClientRelationship.findMany({
      where: {
        companyId: session.user.companyId,
        status: { in: ["ACTIVE", "INVITED"] },
      },
      include: {
        broker: {
          include: {
            brokerProfile: {
              select: {
                companyName: true,
                countriesActive: true,
              },
            },
          },
        },
      },
      orderBy: { invitedAt: "desc" },
    });

    return NextResponse.json(
      relationships.map((r) => ({
        id: r.id,
        status: r.status,
        accessLevel: r.accessLevel,
        invitedAt: r.invitedAt,
        acceptedAt: r.acceptedAt,
        brokerName: r.broker.name,
        brokerEmail: r.broker.email,
        brokerFirm: r.broker.brokerProfile?.companyName || null,
        countries: r.countries,
      }))
    );
  } catch (error) {
    console.error("Error fetching client brokers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const revokeSchema = z.object({
  relationshipId: z.string().min(1),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { relationshipId } = revokeSchema.parse(body);

    const relationship = await prisma.brokerClientRelationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship || relationship.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
    }

    await prisma.brokerClientRelationship.update({
      where: { id: relationshipId },
      data: { status: "REVOKED" },
    });

    return NextResponse.json({ message: "Broker access revoked" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error revoking broker:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
