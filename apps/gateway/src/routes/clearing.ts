import { FastifyInstance } from "fastify";
import { sha256 } from "@noble/hashes/sha2.js";
import { hashReceipt, signReceipt, computeIdempotencyKey } from "@valeo/stratum-receipts";
import {
  createReceiptId,
  createWindowId,
  createAccountId,
  createFacilitatorId,
  CURRENT_RECEIPT_VERSION,
  type Receipt,
} from "@valeo/stratum-core";
import { getReceiptStore, getFinalizedWindows, getCurrentWindowInfo, submitReceipt } from "../settlement";
import { toHex, getGatewayPrivateKey, verifyPaymentSignature } from "../crypto";
import { prisma } from "../db";

function serializeReceipt(sr: any) {
  return {
    id: sr.receipt.receipt_id,
    windowId: sr.receipt.window_id,
    sequence: sr.receipt.sequence,
    payer: sr.receipt.payer,
    payee: sr.receipt.payee,
    amount: Number(sr.receipt.amount) / 1_000_000,
    asset: sr.receipt.asset,
    resource: toHex(sr.receipt.resource_hash).slice(0, 16),
    timestamp: new Date(sr.receipt.timestamp).toISOString(),
    receiptHash: toHex(hashReceipt(sr)),
    signature: toHex(sr.signature),
    signerPublicKey: toHex(sr.signer_public_key),
  };
}

let analyticsCache: any = null;
let analyticsCacheTime = 0;
const ANALYTICS_TTL = 30_000;

export default async function clearingRoutes(fastify: FastifyInstance) {
  fastify.get("/v1/analytics", async () => {
    if (analyticsCache && Date.now() - analyticsCacheTime < ANALYTICS_TTL) {
      return analyticsCache;
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      receiptTotals,
      receipt24h,
      windowsFinalized,
      windowAgg,
      window24h,
      window24hAgg,
      activeServices,
      serviceStats,
      facilitatorStats,
      facilitatorWebhooks,
    ] = await Promise.all([
      prisma.$queryRawUnsafe<[{ count: bigint; volume: bigint }]>(
        `SELECT COUNT(*)::bigint AS count, COALESCE(SUM(CAST(amount AS BIGINT)), 0)::bigint AS volume FROM gw_receipts`,
      ),
      prisma.$queryRawUnsafe<[{ count: bigint; volume: bigint }]>(
        `SELECT COUNT(*)::bigint AS count, COALESCE(SUM(CAST(amount AS BIGINT)), 0)::bigint AS volume FROM gw_receipts WHERE "createdAt" > $1`,
        twentyFourHoursAgo,
      ),
      prisma.gatewayWindow.count({ where: { state: "settled" } }),
      prisma.gatewayWindow.aggregate({
        _sum: { transferCount: true },
        where: { state: "settled" },
      }),
      prisma.gatewayWindow.count({
        where: { state: "settled", openedAt: { gte: twentyFourHoursAgo } },
      }),
      prisma.gatewayWindow.aggregate({
        _sum: { transferCount: true },
        where: { state: "settled", openedAt: { gte: twentyFourHoursAgo } },
      }),
      prisma.gatewayService.count(),
      prisma.$queryRawUnsafe<{ slug: string; name: string; count: bigint; volume: bigint }[]>(
        `SELECT s.slug, s.name, COUNT(*)::bigint AS count, COALESCE(SUM(CAST(r.amount AS BIGINT)), 0)::bigint AS volume
         FROM gw_receipts r JOIN gw_services s ON r."payeeAddress" = s."walletAddress"
         GROUP BY s.slug, s.name`,
      ),
      prisma.$queryRawUnsafe<{ name: string; apiKeyId: string; batches: bigint; grossReceipts: bigint; grossVolume: bigint; netTransfers: bigint; lastSettlement: Date | null }[]>(
        `SELECT k.name, k.id AS "apiKeyId",
                COUNT(b.id)::bigint AS batches,
                COALESCE(SUM(w."receiptCount"), 0)::bigint AS "grossReceipts",
                COALESCE(SUM(CAST(w."grossVolume" AS BIGINT)), 0)::bigint AS "grossVolume",
                COALESCE(SUM(w."transferCount"), 0)::bigint AS "netTransfers",
                MAX(b."confirmedAt") AS "lastSettlement"
         FROM gw_settlement_batches b
         JOIN gw_api_keys k ON b."facilitatorId" = k.id
         LEFT JOIN gw_windows w ON b."windowId" = w."windowId"
         WHERE b.status IN ('settled', 'webhook_sent')
         GROUP BY k.name, k.id`,
      ),
      prisma.facilitatorWebhook.findMany({
        where: { active: true },
        select: { apiKeyId: true, chains: true },
      }),
    ]);

    const totalGrossReceipts = Number(receiptTotals[0]?.count ?? 0n);
    const totalGrossVolume = (receiptTotals[0]?.volume ?? 0n).toString();
    const totalNetTransfers = windowAgg._sum.transferCount ?? 0;
    const compressionRatio = totalNetTransfers > 0
      ? Math.round((totalGrossReceipts / totalNetTransfers) * 10) / 10
      : 0;

    const receipts24h = Number(receipt24h[0]?.count ?? 0n);
    const volume24h = (receipt24h[0]?.volume ?? 0n).toString();
    const net24h = window24hAgg._sum.transferCount ?? 0;
    const compression24h = net24h > 0
      ? Math.round((receipts24h / net24h) * 10) / 10
      : 0;

    const chainsById = new Map<string, string[]>();
    for (const wh of facilitatorWebhooks) {
      try {
        const parsed: string[] = JSON.parse(wh.chains);
        chainsById.set(wh.apiKeyId, parsed);
      } catch { /* skip */ }
    }

    const facilitators = (facilitatorStats ?? []).map((f) => {
      const vol = f.grossVolume.toString();
      return {
        name: f.name,
        grossReceipts: Number(f.grossReceipts),
        grossVolume: vol,
        grossVolumeUSDC: Number(f.grossVolume) / 1_000_000,
        batchesSettled: Number(f.batches),
        netTransfers: Number(f.netTransfers),
        chains: chainsById.get(f.apiKeyId) ?? ["solana"],
        lastSettlement: f.lastSettlement?.toISOString() ?? null,
      };
    });

    const services = (serviceStats ?? []).map((s) => {
      const vol = s.volume.toString();
      return {
        slug: s.slug,
        name: s.name,
        grossReceipts: Number(s.count),
        grossVolume: vol,
        grossVolumeUSDC: Number(s.volume) / 1_000_000,
      };
    });

    const result = {
      protocol: "stratum-x402",
      totalGrossReceipts,
      totalGrossVolume,
      totalGrossVolumeUSDC: Number(BigInt(totalGrossVolume)) / 1_000_000,
      totalNetTransfers,
      compressionRatio,
      windowsFinalized,
      activeServices,
      chains: (() => {
        const c: string[] = [];
        if (process.env.SOLANA_SETTLEMENT_KEY) c.push("solana");
        if (process.env.BASE_SETTLEMENT_KEY) c.push("base");
        if (c.length === 0) c.push("solana");
        return c;
      })(),
      anchorProgram: process.env.ANCHOR_PROGRAM_ID ?? null,
      last24h: {
        grossReceipts: receipts24h,
        grossVolume: volume24h,
        grossVolumeUSDC: Number(BigInt(volume24h)) / 1_000_000,
        netTransfers: net24h,
        compression: compression24h,
      },
      facilitators,
      services,
      updatedAt: now.toISOString(),
    };

    analyticsCache = result;
    analyticsCacheTime = Date.now();
    return result;
  });

  fastify.get("/v1/status", async () => {
    const receipts = getReceiptStore();
    const windows = getFinalizedWindows();
    return {
      totalReceipts: receipts.length,
      windowsFinalized: windows.length,
      receiptCount: receipts.length,
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get("/v1/receipt/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const receipts = getReceiptStore();

    const found = receipts.find(
      (sr) => sr.receipt.receipt_id === id || toHex(hashReceipt(sr)) === id,
    );

    if (!found) return reply.status(404).send({ error: "Receipt not found" });
    return serializeReceipt(found);
  });

  fastify.get("/v1/receipts", async (request) => {
    const { windowId, limit } = request.query as {
      windowId?: string;
      limit?: string;
    };

    let results = getReceiptStore();

    if (windowId) {
      results = results.filter((sr) => (sr.receipt.window_id as string) === windowId);
    }

    const cap = Math.min(parseInt(limit || "100", 10), 1000);
    return results.slice(-cap).map(serializeReceipt);
  });

  fastify.get("/v1/window", async () => {
    const windows = getFinalizedWindows();
    const latest = windows[windows.length - 1];

    if (!latest) {
      return {
        id: "none",
        state: "OPEN",
        receiptCount: getReceiptStore().length,
        openedAt: new Date().toISOString(),
      };
    }

    return {
      id: latest.windowId,
      state: "FINALIZED",
      receiptCount: latest.receiptCount,
      merkleRoot: toHex(latest.merkleRoot),
      anchorTxHash: latest.anchorTxHash,
      head: latest.head
        ? {
            receipt_count: latest.head.receipt_count,
            compression_ratio: latest.head.compression_ratio,
            total_volume_gross: latest.head.total_volume_gross.toString(),
            total_volume_net: latest.head.total_volume_net.toString(),
          }
        : null,
    };
  });

  fastify.get("/v1/window/current", async () => {
    const current = getCurrentWindowInfo();
    const windows = getFinalizedWindows();
    const receipts = getReceiptStore();

    let totalVolume = 0n;
    for (const r of receipts) totalVolume += r.receipt.amount;

    return {
      currentWindow: current,
      totalReceipts: receipts.length,
      totalVolume: totalVolume.toString(),
      totalVolumeUSDC: Number(totalVolume) / 1_000_000,
      windowsFinalized: windows.length,
      recentWindows: windows.slice(-5).map((w) => ({
        id: w.windowId,
        state: "FINALIZED",
        receiptCount: w.receiptCount,
        anchorTxHash: w.anchorTxHash,
        explorerLink: w.anchorTxHash && !w.anchorTxHash.startsWith("already-anchored:")
          ? `https://explorer.solana.com/tx/${w.anchorTxHash}?cluster=devnet`
          : null,
      })),
    };
  });

  fastify.get("/v1/window/:windowId", async (request, reply) => {
    const { windowId } = request.params as { windowId: string };
    const windows = getFinalizedWindows();
    const found = windows.find((w) => w.windowId === windowId);

    if (!found) return reply.status(404).send({ error: "Window not found" });

    return {
      id: found.windowId,
      state: "FINALIZED",
      receiptCount: found.receiptCount,
      merkleRoot: toHex(found.merkleRoot),
      anchorTxHash: found.anchorTxHash,
      head: found.head
        ? {
            receipt_count: found.head.receipt_count,
            compression_ratio: found.head.compression_ratio,
            total_volume_gross: found.head.total_volume_gross.toString(),
            total_volume_net: found.head.total_volume_net.toString(),
          }
        : null,
      receipts: found.receipts.map(serializeReceipt),
    };
  });

  fastify.get("/v1/windows", async () => {
    return getFinalizedWindows().map((w) => ({
      id: w.windowId,
      state: "FINALIZED",
      receiptCount: w.receiptCount,
      merkleRoot: toHex(w.merkleRoot),
      anchorTxHash: w.anchorTxHash,
    }));
  });

  let directSeq = 0;

  fastify.post("/v1/receipt", async (request, reply) => {
    const body = request.body as {
      payer: string;
      payee: string;
      amount: string;
      asset?: string;
      nonce: string;
      signature: string;
      validUntil?: string;
      chain?: string;
    };

    if (!body.payer || !body.payee || !body.amount || !body.nonce || !body.signature) {
      return reply.status(400).send({ error: "Missing required fields: payer, payee, amount, nonce, signature" });
    }

    const validUntil = body.validUntil || String(Math.floor(Date.now() / 1000) + 60);

    const nowSec = Math.floor(Date.now() / 1000);
    if (parseInt(validUntil, 10) < nowSec) {
      return reply.status(403).send({ error: "Payment expired" });
    }

    let sigValid = false;
    try {
      sigValid = verifyPaymentSignature({
        payer: body.payer,
        amount: body.amount,
        asset: body.asset || "USDC",
        payTo: body.payee,
        nonce: body.nonce,
        validUntil,
        signature: body.signature,
        chain: body.chain as "solana" | "base" | undefined,
      });
    } catch {
      sigValid = false;
    }

    if (!sigValid) {
      return reply.status(403).send({ error: "Invalid payment signature" });
    }

    const seq = ++directSeq;
    const resourceHash = sha256(new TextEncoder().encode(`direct-receipt-${seq}`));
    const receiptId = createReceiptId(`rcpt-${Date.now().toString(36)}-d${seq}`);

    const receipt: Receipt = {
      version: CURRENT_RECEIPT_VERSION,
      receipt_id: receiptId,
      window_id: createWindowId("pending"),
      sequence: seq,
      payer: createAccountId(body.payer),
      payee: createAccountId(body.payee),
      amount: BigInt(body.amount),
      asset: body.asset || "USDC",
      resource_hash: resourceHash,
      idempotency_key: computeIdempotencyKey({
        payer: createAccountId(body.payer),
        payee: createAccountId(body.payee),
        resource_hash: resourceHash,
        amount: BigInt(body.amount),
        nonce: body.nonce,
      }),
      timestamp: Date.now(),
      facilitator_id: createFacilitatorId("mock-facilitator"),
      nonce: body.nonce,
    };

    const signedReceipt = await signReceipt(receipt, getGatewayPrivateKey());
    const receiptHash = hashReceipt(signedReceipt);
    const receiptHashHex = toHex(receiptHash);

    try {
      submitReceipt(signedReceipt);
    } catch (err) {
      console.error("[clearing] submitReceipt error:", err);
    }

    return reply.status(201).send({
      receiptId: receipt.receipt_id,
      receiptHash: receiptHashHex,
      windowId: receipt.window_id,
      sequence: seq,
    });
  });
}
