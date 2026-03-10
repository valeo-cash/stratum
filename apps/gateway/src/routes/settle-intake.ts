import { FastifyInstance } from "fastify";
import { sha256 } from "@noble/hashes/sha2.js";
import { signReceipt, hashReceipt, computeIdempotencyKey } from "@valeo/stratum-receipts";
import {
  createReceiptId,
  createWindowId,
  createAccountId,
  createFacilitatorId,
  CURRENT_RECEIPT_VERSION,
  type Receipt,
} from "@valeo/stratum-core";
import { requireRole } from "../middleware/auth";
import { getCurrentWindowInfo, submitReceipt } from "../settlement";
import { getGatewayPrivateKey, toHex } from "../crypto";
import { prisma } from "../db";
import { checkBalance } from "../balance-check";

const facilitatorGuard = requireRole("facilitator", "admin");

interface PaymentInput {
  from: string;
  to: string;
  amount: string;
  chain?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

let intakeSeq = 0;

export default async function settleIntakeRoutes(fastify: FastifyInstance) {

  fastify.post("/v1/settle/submit", { preHandler: facilitatorGuard }, async (request, reply) => {
    const body = request.body as PaymentInput & { payments?: PaymentInput[] };
    const apiKeyId = request.apiKeyId || "__unknown__";

    let payments: PaymentInput[];
    if (body.payments && Array.isArray(body.payments)) {
      payments = body.payments;
    } else if (body.from && body.to && body.amount) {
      payments = [body];
    } else {
      return reply.status(400).send({
        error: "Request must include either a 'payments' array or single payment fields (from, to, amount)",
      });
    }

    if (payments.length === 0) {
      return reply.status(400).send({ error: "No payments provided" });
    }

    if (payments.length > 500) {
      return reply.status(400).send({ error: "Maximum 500 payments per request" });
    }

    const windowInfo = getCurrentWindowInfo();
    const windowIntervalSeconds = parseInt(process.env.SETTLEMENT_INTERVAL_SECONDS || "60", 10);
    const estimatedSettlement = new Date(Date.now() + windowIntervalSeconds * 1000).toISOString();

    const enableBalanceCheck = process.env.ENABLE_BALANCE_CHECK !== "false";
    const balanceCheckMin = BigInt(process.env.BALANCE_CHECK_MIN_AMOUNT || "0");

    const facilitatorId = apiKeyId;

    const results: Array<{
      reference: string | null;
      status: "queued" | "rejected";
      receiptId?: string;
      error?: string;
    }> = [];

    let accepted = 0;
    let rejected = 0;

    for (const p of payments) {
      if (!p.from || !p.to || !p.amount) {
        results.push({ reference: p.reference ?? null, status: "rejected", error: "Missing required fields: from, to, amount" });
        rejected++;
        continue;
      }

      const amount = BigInt(p.amount);
      if (amount <= 0n) {
        results.push({ reference: p.reference ?? null, status: "rejected", error: "Amount must be positive" });
        rejected++;
        continue;
      }

      const chain = p.chain || "solana";
      if (chain !== "solana" && chain !== "base") {
        results.push({ reference: p.reference ?? null, status: "rejected", error: "Chain must be 'solana' or 'base'" });
        rejected++;
        continue;
      }

      if (enableBalanceCheck && amount >= balanceCheckMin) {
        try {
          const balance = await checkBalance(p.from, chain);
          if (balance < amount) {
            console.log(`[settle-intake] Balance check failed for ${p.from}: needs ${amount}, has ${balance}`);
            results.push({
              reference: p.reference ?? null,
              status: "rejected",
              error: `Insufficient balance: needs ${p.amount}, has ${balance.toString()}`,
            });
            rejected++;
            continue;
          }
        } catch (err) {
          console.error("[settle-intake] Balance check error, allowing payment:", err);
        }
      }

      const seq = ++intakeSeq;
      const receiptId = createReceiptId(`rcpt-${Date.now().toString(36)}-i${seq}`);
      const nonce = `intake-${Date.now()}-${seq}`;
      const resourceHash = sha256(new TextEncoder().encode(`intake-${facilitatorId}-${seq}`));

      const receipt: Receipt = {
        version: CURRENT_RECEIPT_VERSION,
        receipt_id: receiptId,
        window_id: createWindowId("pending"),
        sequence: seq,
        payer: createAccountId(p.from),
        payee: createAccountId(p.to),
        amount,
        asset: "USDC",
        resource_hash: resourceHash,
        idempotency_key: computeIdempotencyKey({
          payer: createAccountId(p.from),
          payee: createAccountId(p.to),
          resource_hash: resourceHash,
          amount,
          nonce,
        }),
        timestamp: Date.now(),
        facilitator_id: createFacilitatorId(facilitatorId),
        nonce,
      };

      const signedReceipt = await signReceipt(receipt, getGatewayPrivateKey());

      try {
        submitReceipt(signedReceipt);
      } catch (err) {
        console.error("[settle-intake] submitReceipt error:", err);
      }

      if (p.reference) {
        prisma.intakePayment.create({
          data: {
            reference: p.reference,
            apiKeyId: facilitatorId,
            receiptId: receiptId as string,
            windowId: windowInfo.windowId,
            from: p.from,
            to: p.to,
            amount: p.amount,
            chain,
            status: "queued",
            metadata: p.metadata ? JSON.stringify(p.metadata) : null,
          },
        }).catch((e) => console.error("[settle-intake] DB write failed:", e.message));
      }

      results.push({
        reference: p.reference ?? null,
        status: "queued",
        receiptId: receiptId as string,
      });
      accepted++;
    }

    return reply.status(201).send({
      accepted,
      rejected,
      windowId: windowInfo.windowId,
      estimatedSettlement,
      payments: results,
    });
  });

  fastify.get("/v1/settle/status/:reference", { preHandler: facilitatorGuard }, async (request, reply) => {
    const { reference } = request.params as { reference: string };
    const apiKeyId = request.apiKeyId || "__unknown__";

    const payment = await prisma.intakePayment.findUnique({
      where: { apiKeyId_reference: { apiKeyId, reference } },
    });

    if (!payment) {
      return reply.status(404).send({ error: "Payment not found" });
    }

    let resolvedStatus = payment.status;
    let txHash = payment.txHash;
    let settledAt = payment.settledAt;
    let error = payment.error;

    if (resolvedStatus !== "settled" && resolvedStatus !== "failed") {
      const batch = await prisma.settlementBatch.findFirst({
        where: { windowId: payment.windowId },
        orderBy: { createdAt: "desc" },
      });

      if (batch) {
        if (batch.status === "settled") {
          resolvedStatus = "settled";
          txHash = (batch.txHashes && batch.txHashes.length > 0 ? batch.txHashes.split(",")[0] : null)
            || batch.anchorTxHash
            || null;
          settledAt = new Date();
          prisma.intakePayment.update({
            where: { id: payment.id },
            data: { status: "settled", txHash, settledAt, batchId: batch.id },
          }).catch(() => {});
        } else if (batch.status === "webhook_sent" || batch.status === "pending") {
          resolvedStatus = "batched";
          if (payment.status === "queued") {
            prisma.intakePayment.update({
              where: { id: payment.id },
              data: { status: "batched", batchId: batch.id },
            }).catch(() => {});
          }
        }
      }
    }

    return {
      reference: payment.reference,
      status: resolvedStatus,
      receiptId: payment.receiptId,
      windowId: payment.windowId,
      from: payment.from,
      to: payment.to,
      amount: payment.amount,
      chain: payment.chain,
      txHash,
      error,
      createdAt: payment.createdAt.toISOString(),
      settledAt: settledAt?.toISOString() ?? null,
    };
  });

  fastify.get("/v1/settle/recent", { preHandler: facilitatorGuard }, async (request) => {
    const apiKeyId = request.apiKeyId || "__unknown__";
    const { limit } = request.query as { limit?: string };
    const cap = Math.min(parseInt(limit || "50", 10), 200);

    const payments = await prisma.intakePayment.findMany({
      where: { apiKeyId },
      orderBy: { createdAt: "desc" },
      take: cap,
    });

    return {
      payments: payments.map((p) => ({
        reference: p.reference,
        from: p.from,
        to: p.to,
        amount: p.amount,
        chain: p.chain,
        status: p.status,
        batchId: p.batchId,
        txHash: p.txHash,
        error: p.error,
        createdAt: p.createdAt.toISOString(),
        settledAt: p.settledAt?.toISOString() ?? null,
      })),
    };
  });

  fastify.post("/v1/settle/batch-status", { preHandler: facilitatorGuard }, async (request, reply) => {
    const { references } = request.body as { references?: string[] };
    const apiKeyId = request.apiKeyId || "__unknown__";

    if (!references || !Array.isArray(references) || references.length === 0) {
      return reply.status(400).send({ error: "Provide a 'references' array" });
    }

    if (references.length > 500) {
      return reply.status(400).send({ error: "Maximum 500 references per request" });
    }

    const payments = await prisma.intakePayment.findMany({
      where: { apiKeyId, reference: { in: references } },
    });

    const paymentMap = new Map(payments.map((p) => [p.reference, p]));

    const windowIds = [...new Set(payments.map((p) => p.windowId))];
    const batches = windowIds.length > 0
      ? await prisma.settlementBatch.findMany({
          where: { windowId: { in: windowIds } },
          orderBy: { createdAt: "desc" },
        })
      : [];
    const batchByWindow = new Map(batches.map((b) => [b.windowId, b]));

    const results = references.map((ref) => {
      const payment = paymentMap.get(ref);
      if (!payment) {
        return { reference: ref, status: "not_found" as const };
      }

      let resolvedStatus = payment.status;
      let txHash = payment.txHash;

      const batch = batchByWindow.get(payment.windowId);
      if (batch) {
        if (batch.status === "settled" && resolvedStatus !== "settled") {
          resolvedStatus = "settled";
          txHash = (batch.txHashes && batch.txHashes.length > 0 ? batch.txHashes.split(",")[0] : null)
            || batch.anchorTxHash
            || null;
        } else if (batch.status === "webhook_sent" || batch.status === "pending") {
          resolvedStatus = "batched";
        }
      }

      return {
        reference: ref,
        status: resolvedStatus,
        receiptId: payment.receiptId,
        windowId: payment.windowId,
        amount: payment.amount,
        chain: payment.chain,
        txHash,
        createdAt: payment.createdAt.toISOString(),
        settledAt: payment.settledAt?.toISOString() ?? null,
      };
    });

    return { payments: results };
  });
}
