import { Keypair } from "@solana/web3.js";
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
import { submitReceipt } from "./settlement";
import { getGatewayPrivateKey } from "./crypto";

const SERVICES = ["gpt4-proxy", "sd-api", "whisper-api"];

const SERVICE_WALLETS: Record<string, string> = {
  "gpt4-proxy": "GPT4" + "x".repeat(40),
  "sd-api": "SDAx" + "x".repeat(40),
  "whisper-api": "WHSx" + "x".repeat(40),
};

let simSeq = 0;
let recentCount = 0;
let logInterval: ReturnType<typeof setInterval> | null = null;
let tickInterval: ReturnType<typeof setInterval> | null = null;

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateReceipts() {
  const count = rand(2, 4);

  for (let i = 0; i < count; i++) {
    const agent = Keypair.generate();
    const service = SERVICES[rand(0, SERVICES.length - 1)];
    const amount = BigInt(rand(1000, 15000));
    const seq = ++simSeq;
    const nonce = `sim-${Date.now().toString(36)}-${seq}`;
    const resourceHash = sha256(
      new TextEncoder().encode(`sim-${service}-${seq}`),
    );

    const payer = agent.publicKey.toBase58();
    const payee = SERVICE_WALLETS[service];

    const receipt: Receipt = {
      version: CURRENT_RECEIPT_VERSION,
      receipt_id: createReceiptId(`sim-${Date.now().toString(36)}-${seq}`),
      window_id: createWindowId("pending"),
      sequence: seq,
      payer: createAccountId(payer),
      payee: createAccountId(payee),
      amount,
      asset: "USDC",
      resource_hash: resourceHash,
      idempotency_key: computeIdempotencyKey({
        payer: createAccountId(payer),
        payee: createAccountId(payee),
        resource_hash: resourceHash,
        amount,
        nonce,
      }),
      timestamp: Date.now(),
      facilitator_id: createFacilitatorId("simulator"),
      nonce,
    };

    try {
      const signed = await signReceipt(receipt, getGatewayPrivateKey());
      submitReceipt(signed);
      recentCount++;
    } catch (err) {
      console.error("[simulator] Failed to generate receipt:", err);
    }
  }
}

export function startSimulator() {
  console.log("[simulator] Background traffic enabled");

  const scheduleNextTick = () => {
    const delayMs = rand(8000, 12000);
    tickInterval = setTimeout(async () => {
      await generateReceipts();
      scheduleNextTick();
    }, delayMs);
    (tickInterval as any).unref?.();
  };

  scheduleNextTick();

  logInterval = setInterval(() => {
    if (recentCount > 0) {
      console.log(
        `[simulator] Generated ${recentCount} receipts in last 60s`,
      );
      recentCount = 0;
    }
  }, 60_000);
  logInterval.unref();
}

export function stopSimulator() {
  if (tickInterval) {
    clearTimeout(tickInterval);
    tickInterval = null;
  }
  if (logInterval) {
    clearInterval(logInterval);
    logInterval = null;
  }
}
