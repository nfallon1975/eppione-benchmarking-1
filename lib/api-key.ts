import { randomBytes } from "crypto";
import { hash, compare } from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function generateApiKey(): Promise<{
  raw: string;
  keyHash: string;
  keyPrefix: string;
}> {
  const rawBytes = randomBytes(48);
  const raw = `epk_${rawBytes.toString("hex")}`;
  const keyPrefix = raw.substring(0, 12); // "epk_" + 8 hex chars
  const keyHash = await hash(raw, 10);
  return { raw, keyHash, keyPrefix };
}

export async function verifyApiKey(
  raw: string,
  keyHash: string
): Promise<boolean> {
  return compare(raw, keyHash);
}

export function extractApiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer epk_")) {
    return authHeader.substring(7);
  }
  const xApiKey = req.headers.get("x-api-key");
  if (xApiKey?.startsWith("epk_")) {
    return xApiKey;
  }
  return null;
}

export async function authenticateApiKey(
  req: NextRequest
): Promise<{ userId: string; companyId: string | null; scopes: string[] } | null> {
  const raw = extractApiKey(req);
  if (!raw) return null;

  const keyPrefix = raw.substring(0, 12);

  const apiKey = await prisma.apiKey.findFirst({
    where: { keyPrefix },
    include: { user: { select: { id: true, companyId: true, status: true } } },
  });

  if (!apiKey) return null;

  // Check expiry
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Check user status
  if (apiKey.user.status !== "APPROVED") return null;

  // Verify hash
  const valid = await verifyApiKey(raw, apiKey.keyHash);
  if (!valid) return null;

  // Update lastUsedAt
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    userId: apiKey.user.id,
    companyId: apiKey.user.companyId,
    scopes: apiKey.scopes,
  };
}
