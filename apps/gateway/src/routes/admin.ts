import { FastifyInstance } from "fastify";
import { registerService, listServices, getService, removeService } from "../registry";
import { getReceiptStore, getFinalizedWindows, getCurrentWindowInfo } from "../settlement";
import { toHex } from "../crypto";

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.get("/admin/stats", async () => {
    const receipts = getReceiptStore();
    const windows = getFinalizedWindows();
    const services = listServices();
    const current = getCurrentWindowInfo();

    let totalVolume = 0n;
    for (const r of receipts) totalVolume += r.receipt.amount;

    return {
      totalReceipts: receipts.length,
      totalVolume: totalVolume.toString(),
      totalVolumeUSDC: Number(totalVolume) / 1_000_000,
      activeServices: services.length,
      windowsFinalized: windows.length,
      currentWindow: current,
      recentWindows: windows.slice(-3).map((w) => ({
        id: w.windowId,
        receiptCount: w.receiptCount,
        merkleRoot: toHex(w.merkleRoot).slice(0, 16) + "...",
        anchorTxHash: w.anchorTxHash,
      })),
    };
  });

  fastify.post("/admin/services", async (request, reply) => {
    const { name, targetUrl, slug, pricePerRequest, walletAddress, chains, wallets } = request.body as {
      name?: string;
      targetUrl?: string;
      slug?: string;
      pricePerRequest?: number;
      walletAddress?: string;
      chains?: ("solana" | "base")[];
      wallets?: Record<string, string>;
    };

    if (!name || !targetUrl || !slug) {
      return reply.status(400).send({
        error: "Missing required fields: name, targetUrl, slug",
      });
    }

    if (getService(slug)) {
      return reply.status(409).send({ error: `Service with slug '${slug}' already exists` });
    }

    const resolvedWallet = walletAddress ?? "stratum-gateway-default-wallet";
    const resolvedChains = chains ?? ["solana"];
    const resolvedWallets = wallets ?? { [resolvedChains[0]]: resolvedWallet };

    const entry = await registerService({
      name,
      targetUrl,
      slug,
      pricePerRequest: pricePerRequest ?? 0.002,
      walletAddress: resolvedWallet,
      chains: resolvedChains,
      wallets: resolvedWallets,
      createdAt: new Date().toISOString(),
    });

    return reply.status(201).send(entry);
  });

  fastify.get("/admin/services", async () => {
    return listServices();
  });

  fastify.get("/admin/services/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const svc = getService(slug);
    if (!svc) return reply.status(404).send({ error: "Service not found" });
    return svc;
  });

  fastify.delete("/admin/services/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!removeService(slug)) {
      return reply.status(404).send({ error: "Service not found" });
    }
    return { deleted: true };
  });
}
