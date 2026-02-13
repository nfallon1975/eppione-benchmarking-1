import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "BROKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = session.user.id;

    const [
      activeClients,
      invitedClients,
      revokedClients,
      requirementsCount,
      limitsCount,
      verifiedRequirements,
      verifiedLimits,
      recentRelationships,
    ] = await Promise.all([
      prisma.brokerClientRelationship.count({
        where: { brokerId: userId, status: "ACTIVE" },
      }),
      prisma.brokerClientRelationship.count({
        where: { brokerId: userId, status: "INVITED" },
      }),
      prisma.brokerClientRelationship.count({
        where: { brokerId: userId, status: "REVOKED" },
      }),
      prisma.countryBenefitRequirement.count({
        where: { contributedById: userId },
      }),
      prisma.countryStatutoryLimit.count({
        where: { contributedById: userId },
      }),
      prisma.countryBenefitRequirement.count({
        where: { contributedById: userId, verifiedByAdmin: true },
      }),
      prisma.countryStatutoryLimit.count({
        where: { contributedById: userId, verifiedByAdmin: true },
      }),
      prisma.brokerClientRelationship.findMany({
        where: { brokerId: userId },
        orderBy: { invitedAt: "desc" },
        take: 5,
        include: {
          company: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      activeClients,
      invitedClients,
      revokedClients,
      totalClients: activeClients + invitedClients + revokedClients,
      complianceContributions: requirementsCount + limitsCount,
      verifiedContributions: verifiedRequirements + verifiedLimits,
      recentActivity: recentRelationships.map((r) => ({
        id: r.id,
        inviteEmail: r.inviteEmail,
        status: r.status,
        invitedAt: r.invitedAt,
        acceptedAt: r.acceptedAt,
        companyName: r.company?.name || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching broker stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
