import { FastifyInstance } from "fastify";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  createReceiptId,
  createWindowId,
  createAccountId,
  createFacilitatorId,
  CURRENT_RECEIPT_VERSION,
  type Receipt,
} from "@valeo/stratum-core";
import { signReceipt, hashReceipt, computeIdempotencyKey } from "@valeo/stratum-receipts";
import { getService } from "../registry";
import {
  generateNonce,
  storeNonce,
  consumeNonce,
  decodePaymentHeader,
  verifyPaymentSignature,
  getGatewayPrivateKey,
  toHex,
} from "../crypto";
import { submitReceipt, getSettlementRouter } from "../settlement";
import { getActiveFacilitatorId } from "../webhook";

let receiptSeq = 0;

export default async function proxyRoutes(fastify: FastifyInstance) {
  fastify.all("/s/:slug/*", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const service = getService(slug);

    if (!service) {
      return reply.status(404).send({ error: `No service registered for slug '${slug}'` });
    }

    const paymentHeader = request.headers["x-payment"] as string | undefined;

    if (!paymentHeader) {
      const nonce = generateNonce();
      storeNonce(nonce);

      const priceInMicroUnits = Math.round(service.pricePerRequest * 1_000_000).toString();
      const validUntil = String(Math.floor(Date.now() / 1000) + 60);

      return reply.status(402).send({
        error: "Payment Required",
        x402: {
          version: "1",
          price: priceInMicroUnits,
          // Legacy fields for backward compatibility with old agents
          asset: "USDC",
          network: service.chains[0] || "solana",
          payTo: service.wallets[service.chains[0]] || service.walletAddress || "stratum-gateway",
          // Multi-chain support
          chains: service.chains.map((c) => ({
            chain: c,
            asset: "USDC",
            payTo: service.wallets[c] || service.walletAddress,
          })),
          validUntil,
          nonce,
        },
      });
    }

    // --- Verify payment ---
    let payment;
    try {
      payment = decodePaymentHeader(paymentHeader);
    } catch {
      return reply.status(400).send({ error: "Invalid X-PAYMENT header: malformed base64/JSON" });
    }

    // 1. Verify Ed25519 signature
    let sigValid: boolean;
    try {
      sigValid = verifyPaymentSignature(payment);
    } catch {
      sigValid = false;
    }
    if (!sigValid) {
      return reply.status(403).send({ error: "Invalid payment signature" });
    }

    // 2. Check nonce
    if (!consumeNonce(payment.nonce)) {
      return reply.status(403).send({ error: "Invalid or expired nonce" });
    }

    // 3. Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (parseInt(payment.validUntil, 10) < now) {
      return reply.status(403).send({ error: "Payment expired" });
    }

    // 4. Check amount
    const expectedPrice = Math.round(service.pricePerRequest * 1_000_000);
    if (parseInt(payment.amount, 10) < expectedPrice) {
      return reply.status(403).send({ error: `Insufficient payment: expected ${expectedPrice}, got ${payment.amount}` });
    }

    // 5. Read chain from payment (default "solana" for backward compat)
    const paymentChain: "solana" | "base" = payment.chain === "base" ? "base" : "solana";

    // 6. Optional pre-flight check
    if (process.env.ENABLE_PREFLIGHT_CHECK === "true") {
      const router = getSettlementRouter();
      if (router && router.hasChain(paymentChain)) {
        try {
          const preflight = await router.preflightCheck(
            payment.payer,
            BigInt(payment.amount),
            paymentChain,
          );
          if (!preflight.hasBalance || !preflight.hasAllowance) {
            const settlementAddr = process.env.SOLANA_SETTLEMENT_KEY
              ? "configured-settlement-address"
              : "unknown";
            return reply.status(402).send({
              error: preflight.hasBalance
                ? "Insufficient USDC allowance"
                : "Insufficient USDC balance",
              required: payment.amount,
              currentAllowance: preflight.allowance.toString(),
              currentBalance: preflight.balance.toString(),
              chain: paymentChain,
              approvalInstructions: paymentChain === "solana"
                ? `Call SPL Token approve() with delegate: ${settlementAddr}`
                : `Call USDC.approve(${settlementAddr}, amount) on Base`,
            });
          }
        } catch (err) {
          console.error("[proxy] Pre-flight check failed, continuing:", err);
        }
      }
    }

    // --- Create real receipt ---
    const wildcardPath = (request.params as { "*": string })["*"] || "";
    const resourcePath = `/s/${slug}/${wildcardPath}`;
    const resourceHash = sha256(new TextEncoder().encode(resourcePath));

    const seq = ++receiptSeq;
    const receiptId = createReceiptId(`rcpt-${Date.now().toString(36)}-${seq}`);
    const nonce = payment.nonce;

    const receipt: Receipt = {
      version: CURRENT_RECEIPT_VERSION,
      receipt_id: receiptId,
      window_id: createWindowId("pending"),
      sequence: seq,
      payer: createAccountId(payment.payer),
      payee: createAccountId(payment.payTo),
      amount: BigInt(payment.amount),
      asset: payment.asset,
      resource_hash: resourceHash,
      idempotency_key: computeIdempotencyKey({
        payer: createAccountId(payment.payer),
        payee: createAccountId(payment.payTo),
        resource_hash: resourceHash,
        amount: BigInt(payment.amount),
        nonce,
      }),
      timestamp: Date.now(),
      facilitator_id: createFacilitatorId(await getActiveFacilitatorId()),
      nonce,
    };

    const signedReceipt = await signReceipt(receipt, getGatewayPrivateKey());
    const receiptHash = hashReceipt(signedReceipt);
    const receiptHashHex = toHex(receiptHash);

    // Submit to window manager
    try {
      submitReceipt(signedReceipt);
    } catch (err) {
      console.error("[proxy] submitReceipt error:", err);
    }

    // --- Proxy upstream ---
    const targetUrl = service.targetUrl.replace(/\/+$/, "") + "/" + wildcardPath;

    const upstreamHeaders: Record<string, string> = {};
    for (const [key, val] of Object.entries(request.headers)) {
      if (["host", "connection", "x-payment", "transfer-encoding"].includes(key)) continue;
      if (typeof val === "string") upstreamHeaders[key] = val;
    }

    try {
      const upstream = await fetch(targetUrl, {
        method: request.method,
        headers: upstreamHeaders,
        body: request.method !== "GET" && request.method !== "HEAD"
          ? JSON.stringify(request.body)
          : undefined,
      });

      const body = await upstream.text();

      return reply
        .status(upstream.status)
        .header("x-stratum-receipt", receiptHashHex)
        .header("x-stratum-service", service.slug)
        .send(body);
    } catch (err) {
      return reply.status(502).send({
        error: "Upstream request failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
