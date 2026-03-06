import { FastifyInstance } from "fastify";
import { prisma } from "../db";
import { requireRole } from "../middleware/auth";

const settleWriteGuard = requireRole("facilitator", "admin");
const settleReadGuard = requireRole("provider", "facilitator", "admin");

function parseBatch(b: any) {
  return {
    id: b.id,
    windowId: b.windowId,
    chain: b.chain,
    transfers: safeJsonParse(b.transfers, []),
    totalVolume: b.totalVolume,
    status: b.status,
    anchorTxHash: b.anchorTxHash,
    webhookSentAt: b.webhookSentAt?.toISOString() ?? null,
    confirmedAt: b.confirmedAt?.toISOString() ?? null,
    txHashes: safeJsonParse(b.txHashes, null),
    createdAt: b.createdAt.toISOString(),
  };
}

function safeJsonParse(val: string | null | undefined, fallback: any) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export default async function facilitatorRoutes(fastify: FastifyInstance) {
  // Register a webhook URL for settlement notifications
  fastify.post("/v1/settle/webhook", { preHandler: settleWriteGuard }, async (request, reply) => {
    const { url, chains, secret } = request.body as {
      url?: string;
      chains?: string[];
      secret?: string;
    };

    if (!url || !chains || !secret) {
      return reply.status(400).send({ error: "Missing required fields: url, chains, secret" });
    }

    if (!Array.isArray(chains) || chains.length === 0) {
      return reply.status(400).send({ error: "chains must be a non-empty array" });
    }

    const webhook = await prisma.facilitatorWebhook.create({
      data: {
        url,
        chains: JSON.stringify(chains),
        secret,
        apiKeyId: request.apiKeyId ?? "unknown",
      },
    });

    return reply.status(201).send({
      id: webhook.id,
      url: webhook.url,
      chains: JSON.parse(webhook.chains),
      secret: webhook.secret.slice(0, 8) + "...",
      active: webhook.active,
      createdAt: webhook.createdAt.toISOString(),
    });
  });

  // List registered webhooks
  fastify.get("/v1/settle/webhooks", { preHandler: settleWriteGuard }, async () => {
    const webhooks = await prisma.facilitatorWebhook.findMany({
      orderBy: { createdAt: "desc" },
    });

    return {
      webhooks: webhooks.map((w) => ({
        id: w.id,
        url: w.url,
        chains: safeJsonParse(w.chains, []),
        secret: w.secret.slice(0, 8) + "...",
        apiKeyId: w.apiKeyId,
        active: w.active,
        createdAt: w.createdAt.toISOString(),
      })),
    };
  });

  // Delete a webhook
  fastify.delete("/v1/settle/webhook/:id", { preHandler: settleWriteGuard }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.facilitatorWebhook.delete({ where: { id } });
    } catch {
      return reply.status(404).send({ error: "Webhook not found" });
    }

    return { deleted: true };
  });

  // List recent settlement batches
  fastify.get("/v1/settle/batches", { preHandler: settleReadGuard }, async () => {
    const batches = await prisma.settlementBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { batches: batches.map(parseBatch) };
  });

  // Get a specific batch
  fastify.get("/v1/settle/batches/:id", { preHandler: settleReadGuard }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const batch = await prisma.settlementBatch.findUnique({ where: { id } });
    if (!batch) return reply.status(404).send({ error: "Batch not found" });

    return parseBatch(batch);
  });

  // Facilitator confirms settlement execution
  fastify.post("/v1/settle/batches/:id/confirm", { preHandler: settleWriteGuard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { txHashes, chain } = request.body as {
      txHashes?: string[];
      chain?: string;
    };

    if (!txHashes || !Array.isArray(txHashes)) {
      return reply.status(400).send({ error: "Missing required field: txHashes (array)" });
    }

    const batch = await prisma.settlementBatch.findUnique({ where: { id } });
    if (!batch) return reply.status(404).send({ error: "Batch not found" });

    if (batch.status === "settled") {
      return reply.status(400).send({ error: "Batch already settled" });
    }

    const updated = await prisma.settlementBatch.update({
      where: { id },
      data: {
        status: "settled",
        confirmedAt: new Date(),
        txHashes: JSON.stringify(txHashes),
      },
    });

    return parseBatch(updated);
  });
}
