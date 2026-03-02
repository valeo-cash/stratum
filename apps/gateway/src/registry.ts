import { prisma } from "./db";

export interface ServiceEntry {
  name: string;
  targetUrl: string;
  slug: string;
  pricePerRequest: number;
  walletAddress: string;
  chains: ("solana" | "base")[];
  wallets: Record<string, string>;
  createdAt: string;
}

const cache = new Map<string, ServiceEntry>();

export async function registerService(entry: ServiceEntry): Promise<ServiceEntry> {
  cache.set(entry.slug, entry);
  try {
    await prisma.gatewayService.upsert({
      where: { slug: entry.slug },
      update: {
        name: entry.name,
        targetUrl: entry.targetUrl,
        pricePerRequest: entry.pricePerRequest,
        walletAddress: entry.walletAddress,
        chains: JSON.stringify(entry.chains),
        wallets: JSON.stringify(entry.wallets),
      },
      create: {
        name: entry.name,
        targetUrl: entry.targetUrl,
        slug: entry.slug,
        pricePerRequest: entry.pricePerRequest,
        walletAddress: entry.walletAddress,
        chains: JSON.stringify(entry.chains),
        wallets: JSON.stringify(entry.wallets),
      },
    });
  } catch (e) {
    console.error("[registry] DB write failed, using in-memory only:", (e as Error).message);
  }
  return entry;
}

export function getService(slug: string): ServiceEntry | undefined {
  return cache.get(slug);
}

export function listServices(): ServiceEntry[] {
  return Array.from(cache.values());
}

export function removeService(slug: string): boolean {
  const deleted = cache.delete(slug);
  if (deleted) {
    prisma.gatewayService.delete({ where: { slug } }).catch(() => {});
  }
  return deleted;
}

export async function loadServicesFromDb(): Promise<void> {
  try {
    const services = await prisma.gatewayService.findMany();
    for (const s of services) {
      let chains: ("solana" | "base")[] = ["solana"];
      let wallets: Record<string, string> = {};
      try { chains = JSON.parse(s.chains); } catch {}
      try { wallets = JSON.parse(s.wallets); } catch {}

      cache.set(s.slug, {
        name: s.name,
        targetUrl: s.targetUrl,
        slug: s.slug,
        pricePerRequest: s.pricePerRequest,
        walletAddress: s.walletAddress,
        chains,
        wallets,
        createdAt: s.createdAt.toISOString(),
      });
    }
    if (services.length > 0) {
      console.log(`[registry] Loaded ${services.length} services from database`);
    }
  } catch {
    console.log("[registry] No database available, using in-memory only");
  }
}
