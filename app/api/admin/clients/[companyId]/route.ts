import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
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

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");

    if (mode !== "anonymize" && mode !== "full") {
      return NextResponse.json(
        { error: "Query param 'mode' must be 'anonymize' or 'full'" },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: params.companyId },
      include: { users: { select: { id: true } } },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const userIds = company.users.map((u) => u.id);

    await prisma.$transaction(async (tx) => {
      // Delete broker relationships for this company
      await tx.brokerClientRelationship.deleteMany({
        where: { companyId: params.companyId },
      });

      // Delete compliance data contributed by these users
      if (userIds.length > 0) {
        await tx.countryBenefitRequirement.deleteMany({
          where: { contributedById: { in: userIds } },
        });
        await tx.countryStatutoryLimit.deleteMany({
          where: { contributedById: { in: userIds } },
        });
      }

      // Delete all users for this company
      await tx.user.deleteMany({
        where: { companyId: params.companyId },
      });

      if (mode === "anonymize") {
        // Keep data but anonymize company name
        await tx.company.update({
          where: { id: params.companyId },
          data: { name: "Anonymized Company" },
        });
      } else {
        // Full delete — cascade handles benefit data
        await tx.company.delete({
          where: { id: params.companyId },
        });
      }
    });

    return NextResponse.json({
      message:
        mode === "anonymize"
          ? "Client anonymized successfully"
          : "Client deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
