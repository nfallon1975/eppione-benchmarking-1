/**
 * One-time migration script:
 * 1. Populates companyId on BrokerClientRelationship from the old clientId → User → companyId chain
 * 2. Sets companyRole = OWNER for all existing CLIENT users
 * 3. Deduplicates: if same broker has multiple relationships to the same company, keeps ACTIVE (or most recent)
 *
 * Run with: npx tsx scripts/migrate-broker-relationships.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting broker relationship migration...\n");

  // Step 1: Set companyRole = OWNER for all existing CLIENT users
  const clientUsers = await prisma.user.updateMany({
    where: { role: "CLIENT", companyRole: null },
    data: { companyRole: "OWNER" },
  });
  console.log(`Set companyRole=OWNER for ${clientUsers.count} CLIENT users`);

  // Step 2: Populate companyId on relationships that have clientId data in legacy column
  // Since schema no longer has clientId, we use raw SQL to read the old data
  const relationships = await prisma.$queryRaw<
    Array<{ id: string; brokerId: string; companyId: string | null; status: string; invitedAt: Date }>
  >`
    SELECT bcr.id, bcr."brokerId", bcr."companyId", bcr.status, bcr."invitedAt"
    FROM "BrokerClientRelationship" bcr
    WHERE bcr."companyId" IS NULL
  `;

  console.log(`Found ${relationships.length} relationships without companyId`);

  // For relationships without companyId, try to find company via inviteEmail
  for (const rel of relationships) {
    const inviteEmail = await prisma.$queryRaw<Array<{ inviteEmail: string }>>`
      SELECT "inviteEmail" FROM "BrokerClientRelationship" WHERE id = ${rel.id}
    `;

    if (inviteEmail.length > 0) {
      const user = await prisma.user.findUnique({
        where: { email: inviteEmail[0].inviteEmail },
        select: { companyId: true },
      });

      if (user?.companyId) {
        await prisma.brokerClientRelationship.update({
          where: { id: rel.id },
          data: { companyId: user.companyId },
        });
        console.log(`  Updated relationship ${rel.id} → companyId ${user.companyId}`);
      }
    }
  }

  // Step 3: Deduplicate — if same broker has multiple relationships to the same company
  const allRels = await prisma.brokerClientRelationship.findMany({
    where: { companyId: { not: null } },
    orderBy: [{ status: "asc" }, { invitedAt: "desc" }],
  });

  const seen = new Map<string, string>(); // "brokerId:companyId" → kept relationship id
  const toDelete: string[] = [];

  // Status priority: ACTIVE > INVITED > UPLOADED > REVOKED
  const statusPriority: Record<string, number> = {
    ACTIVE: 4,
    INVITED: 3,
    UPLOADED: 2,
    REVOKED: 1,
  };

  for (const rel of allRels) {
    const key = `${rel.brokerId}:${rel.companyId}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, rel.id);
    } else {
      // Compare: keep the one with better status
      const existingRel = allRels.find((r) => r.id === existing)!;
      const existingPriority = statusPriority[existingRel.status] || 0;
      const currentPriority = statusPriority[rel.status] || 0;

      if (currentPriority > existingPriority) {
        toDelete.push(existing);
        seen.set(key, rel.id);
      } else {
        toDelete.push(rel.id);
      }
    }
  }

  if (toDelete.length > 0) {
    await prisma.brokerClientRelationship.deleteMany({
      where: { id: { in: toDelete } },
    });
    console.log(`\nDeduplicated: removed ${toDelete.length} duplicate relationships`);
  } else {
    console.log("\nNo duplicate relationships found");
  }

  console.log("\nMigration complete!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
