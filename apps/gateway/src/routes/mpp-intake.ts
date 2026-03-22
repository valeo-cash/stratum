import { FastifyInstance } from "fastify";
import { sha256 } from "@noble/hashes/sha2.js";
import { signReceipt, computeIdempotencyKey } from "@valeo/stratum-receipts";
import {
  createReceiptId,
  createWindowId,
  createAccountId,
  createFacilitatorId,
  CURRENT_RECEIPT_VERSION,
  type Receipt,
} from "@valeo/stratum-core";
import { requireRole } from "../middleware/auth";
import { getCurrentWindowInfo, submitReceipt, addWindowVolume, getWindowVolume } from "../settlement";
import { getGatewayPrivateKey } from "../crypto";
import { prisma } from "../db";
import { type MppPaymentInput, normalizeMppToReceipt } from "../mpp-adapter";

const facilitatorGuard = requireRole("facilitator", "admin");

const MAX_WINDOW_VOLUME = BigInt(process.env.MAX_WINDOW_VOLUME || "10000000000");
const MAX_SINGLE_TRANSFER = BigInt(process.env.MAX_SINGLE_TRANSFER || "1000000000");

let mppSeq = 0;

export default async function mppIntakeRoutes(fastify: FastifyInstance) {

  fastify.post("/v1/mpp/submit", { preHandler: facilitatorGuard }, async (request, reply) => {
    const body = request.body as MppPaymentInput & { payments?: MppPaymentInput[] };
    const apiKeyId = request.apiKeyId || "__unknown__";

    let payments: MppPaymentInput[];
    if (body.payments && Array.isArray(body.payments)) {
      payments = body.payments;
    } else if (body.from && body.to && body.amount && body.method) {
      payments = [body];
    } else {
      return reply.status(400).send({
        error: "Request must include either a 'payments' array or single payment fields (from, to, amount, method)",
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

    const results: Array<{
      reference: string | null;
      status: "queued" | "settled_external" | "rejected";
      receiptId?: string;
      error?: string;
    }> = [];

    let accepted = 0;
    let rejected = 0;

    for (const p of payments) {
      if (!p.from || !p.to || !p.amount || !p.method) {
        results.push({ reference: null, status: "rejected", error: "Missing required fields: from, to, amount, method" });
        rejected++;
        continue;
      }

      if (p.method !== "crypto" && p.method !== "spt") {
        results.push({ reference: null, status: "rejected", error: "method must be 'crypto' or 'spt'" });
        rejected++;
        continue;
      }

      const normalized = normalizeMppToReceipt(p);
      const amount = BigInt(normalized.amount);

      if (amount <= 0n) {
        results.push({ reference: normalized.reference, status: "rejected", error: "Amount must be positive" });
        rejected++;
        continue;
      }

      if (amount > MAX_SINGLE_TRANSFER) {
        results.push({ reference: normalized.reference, status: "rejected", error: "amount_exceeds_limit" });
        rejected++;
        continue;
      }

      const existing = await prisma.intakePayment.findUnique({
        where: { apiKeyId_reference: { apiKeyId, reference: normalized.reference } },
      });
      if (existing) {
        results.push({
          reference: normalized.reference,
          status: existing.status as any,
          receiptId: existing.receiptId || "",
        });
        accepted++;
        continue;
      }

      if (normalized.skipSettlement) {
        try {
          await prisma.intakePayment.create({
            data: {
              reference: normalized.reference,
              apiKeyId,
              receiptId: `mpp-spt-${normalized.reference}`,
              windowId: windowInfo.windowId,
              from: normalized.from,
              to: normalized.to,
              amount: normalized.amount,
              chain: normalized.chain,
              status: "settled_external",
              txHash: p.paymentIntentId ?? null,
              paymentMethod: "spt",
              paymentIntentId: p.paymentIntentId ?? null,
              externallySettled: true,
              metadata: JSON.stringify(normalized.metadata),
            },
          });
        } catch (err: any) {
          if (err?.code === "P2002") {
            results.push({ reference: normalized.reference, status: "settled_external" });
            accepted++;
            continue;
          }
          console.error("[mpp-intake] DB write failed:", err.message);
          results.push({ reference: normalized.reference, status: "rejected", error: "Internal error" });
          rejected++;
          continue;
        }

        results.push({ reference: normalized.reference, status: "settled_external" });
        accepted++;
        continue;
      }

      const currentWindowVolume = getWindowVolume(windowInfo.windowId);
      if (currentWindowVolume + amount > MAX_WINDOW_VOLUME) {
        return reply.status(429).send({
          error: "window_limit_exceeded",
          message: "Settlement window volume limit reached. Try again next window.",
          currentVolume: currentWindowVolume.toString(),
          limit: MAX_WINDOW_VOLUME.toString(),
        });
      }

      const seq = ++mppSeq;
      const receiptId = createReceiptId(`rcpt-mpp-${Date.now().toString(36)}-${seq}`);
      const nonce = `mpp-${Date.now()}-${seq}`;
      const resourceHash = sha256(new TextEncoder().encode(`mpp-${apiKeyId}-${seq}`));

      const receipt: Receipt = {
        version: CURRENT_RECEIPT_VERSION,
        receipt_id: receiptId,
        window_id: createWindowId("pending"),
        sequence: seq,
        payer: createAccountId(normalized.from),
        payee: createAccountId(normalized.to),
        amount,
        asset: "USDC",
        resource_hash: resourceHash,
        idempotency_key: computeIdempotencyKey({
          payer: createAccountId(normalized.from),
          payee: createAccountId(normalized.to),
          resource_hash: resourceHash,
          amount,
          nonce,
        }),
        timestamp: Date.now(),
        facilitator_id: createFacilitatorId(apiKeyId),
        nonce,
      };

      const signedReceipt = await signReceipt(receipt, getGatewayPrivateKey());

      try {
        submitReceipt(signedReceipt);
      } catch (err) {
        console.error("[mpp-intake] submitReceipt error:", err);
      }

      try {
        await prisma.intakePayment.create({
          data: {
            reference: normalized.reference,
            apiKeyId,
            receiptId: receiptId as string,
            windowId: windowInfo.windowId,
            from: normalized.from,
            to: normalized.to,
            amount: normalized.amount,
            chain: normalized.chain,
            status: "queued",
            paymentMethod: "crypto",
            paymentIntentId: p.paymentIntentId ?? null,
            metadata: JSON.stringify(normalized.metadata),
          },
        });
      } catch (err: any) {
        if (err?.code === "P2002") {
          results.push({ reference: normalized.reference, status: "queued", receiptId: receiptId as string });
          accepted++;
          continue;
        }
        console.error("[mpp-intake] DB write failed:", err.message);
      }

      addWindowVolume(windowInfo.windowId, amount);

      results.push({
        reference: normalized.reference,
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

  fastify.get("/v1/mpp/status/:reference", { preHandler: facilitatorGuard }, async (request, reply) => {
    const { reference } = request.params as { reference: string };
    const apiKeyId = request.apiKeyId || "__unknown__";

    const payment = await prisma.intakePayment.findUnique({
      where: { apiKeyId_reference: { apiKeyId, reference } },
    });

    if (!payment) {
      return reply.status(404).send({ error: "Payment not found" });
    }

    if (payment.status === "settled_external") {
      return {
        reference: payment.reference,
        status: "settled_external",
        receiptId: payment.receiptId,
        windowId: payment.windowId,
        from: payment.from,
        to: payment.to,
        amount: payment.amount,
        chain: payment.chain,
        txHash: payment.txHash,
        paymentMethod: payment.paymentMethod,
        externallySettled: payment.externallySettled,
        createdAt: payment.createdAt.toISOString(),
        settledAt: payment.createdAt.toISOString(),
      };
    }

    let resolvedStatus = payment.status;
    let txHash = payment.txHash;
    let settledAt = payment.settledAt;

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
      paymentMethod: payment.paymentMethod,
      externallySettled: payment.externallySettled,
      error: payment.error,
      createdAt: payment.createdAt.toISOString(),
      settledAt: settledAt?.toISOString() ?? null,
    };
  });
}
