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

export default async function clearingRoutes(fastify: FastifyInstance) {
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
      chain?: string;
    };

    if (!body.payer || !body.payee || !body.amount || !body.nonce || !body.signature) {
      return reply.status(400).send({ error: "Missing required fields: payer, payee, amount, nonce, signature" });
    }

    let sigValid = false;
    try {
      sigValid = verifyPaymentSignature({
        payer: body.payer,
        amount: body.amount,
        asset: body.asset || "USDC",
        payTo: body.payee,
        nonce: body.nonce,
        validUntil: String(Math.floor(Date.now() / 1000) + 60),
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
