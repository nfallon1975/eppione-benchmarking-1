import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/api-key";
import { z } from "zod";

const createKeySchema = z.object({
  name: z.string().min(1, "Key name is required"),
  scopes: z.array(z.string()).min(1, "At least one scope is required"),
});

const deleteKeySchema = z.object({
  keyId: z.string().min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["CLIENT", "BROKER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["CLIENT", "BROKER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, scopes } = createKeySchema.parse(body);

    const { raw, keyHash, keyPrefix } = await generateApiKey();

    await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name,
        keyHash,
        keyPrefix,
        scopes,
      },
    });

    return NextResponse.json({
      message: "API key created. Copy this key now — it won't be shown again.",
      key: raw,
      keyPrefix,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["CLIENT", "BROKER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { keyId } = deleteKeySchema.parse(body);

    // Ensure the key belongs to this user
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: session.user.id },
    });

    if (!key) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    await prisma.apiKey.delete({ where: { id: keyId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
