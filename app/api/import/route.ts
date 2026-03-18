import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET - List imports for the current user.
 * Brokers see their own imports. Admins see all.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "ADMIN";

    const where = isAdmin
      ? {}
      : {
          OR: [
            { uploadedByBrokerId: session.user.id },
            { assignedBrokerId: session.user.id },
          ],
        };

    const imports = await prisma.brokerImport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        status: true,
        totalRows: true,
        companiesCreated: true,
        entriesCreated: true,
        anonymise: true,
        createdAt: true,
        assignedBroker: { select: { name: true, email: true } },
        uploadedByBroker: { select: { name: true } },
        uploadedByAdmin: { select: { name: true } },
      },
    });

    return NextResponse.json(imports);
  } catch (error) {
    console.error("List imports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
