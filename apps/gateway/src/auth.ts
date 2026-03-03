import { randomBytes } from "crypto";
import { prisma } from "./db";

export interface ApiKeyValidation {
  valid: boolean;
  role: string;
  serviceSlug?: string | null;
  rateLimit: number;
}

export async function generateApiKey(opts: {
  name: string;
  role: string;
  serviceSlug?: string;
}): Promise<{ id: string; key: string; name: string; role: string }> {
  const key = "sk_live_" + randomBytes(16).toString("hex");

  const record = await prisma.apiKey.create({
    data: {
      key,
      name: opts.name,
      role: opts.role,
      serviceSlug: opts.serviceSlug ?? null,
    },
  });

  return { id: record.id, key: record.key, name: record.name, role: record.role };
}

export async function validateApiKey(key: string): Promise<ApiKeyValidation> {
  if (!key) return { valid: false, role: "", rateLimit: 100 };

  try {
    const record = await prisma.apiKey.findUnique({ where: { key } });

    if (!record || record.revokedAt) {
      return { valid: false, role: "", rateLimit: 100 };
    }

    prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return {
      valid: true,
      role: record.role,
      serviceSlug: record.serviceSlug,
      rateLimit: record.rateLimit,
    };
  } catch {
    return { valid: false, role: "", rateLimit: 100 };
  }
}

export async function revokeApiKey(id: string): Promise<boolean> {
  try {
    await prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}

export async function listApiKeys() {
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
  });

  return keys.map((k) => ({
    id: k.id,
    key: k.key.slice(0, 12) + "..." + k.key.slice(-4),
    name: k.name,
    role: k.role,
    serviceSlug: k.serviceSlug,
    rateLimit: k.rateLimit,
    createdAt: k.createdAt.toISOString(),
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    revokedAt: k.revokedAt?.toISOString() ?? null,
  }));
}
