import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { generateKeypair } from "@valeo/stratum-receipts";
import bs58 from "bs58";

ed.hashes.sha512 = sha512;

let gatewayPrivateKey: Uint8Array;
let gatewayPublicKey: Uint8Array;

export async function initGatewayKeypair() {
  const envKey = process.env.GATEWAY_PRIVATE_KEY;
  if (envKey) {
    gatewayPrivateKey = fromHex(envKey);
    gatewayPublicKey = ed.getPublicKey(gatewayPrivateKey);
  } else {
    const kp = await generateKeypair();
    gatewayPrivateKey = kp.privateKey;
    gatewayPublicKey = kp.publicKey;
  }
  console.log(`[gateway] Public key: ${toHex(gatewayPublicKey)}`);
}

export function getGatewayPrivateKey(): Uint8Array {
  return gatewayPrivateKey;
}

export function getGatewayPublicKey(): Uint8Array {
  return gatewayPublicKey;
}

// --- Nonce store with TTL ---

const nonceStore = new Map<string, number>();
const NONCE_TTL_MS = 120_000;

export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export function storeNonce(nonce: string): void {
  nonceStore.set(nonce, Date.now());
}

export function consumeNonce(nonce: string): boolean {
  const ts = nonceStore.get(nonce);
  if (!ts) return false;
  nonceStore.delete(nonce);
  if (Date.now() - ts > NONCE_TTL_MS) return false;
  return true;
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [nonce, ts] of nonceStore) {
    if (now - ts > NONCE_TTL_MS) nonceStore.delete(nonce);
  }
}, 30_000).unref();

// --- Payment verification ---

export interface ParsedPayment {
  payer: string;
  amount: string;
  asset: string;
  payTo: string;
  nonce: string;
  validUntil: string;
  signature: string;
  chain?: "solana" | "base";
}

export function decodePaymentHeader(b64: string): ParsedPayment {
  const json = Buffer.from(b64, "base64").toString("utf-8");
  return JSON.parse(json) as ParsedPayment;
}

export function verifyPaymentSignature(payment: ParsedPayment): boolean {
  const canonicalFields: Record<string, string> = {};
  for (const k of ["amount", "asset", "nonce", "payTo", "payer", "validUntil"].sort()) {
    canonicalFields[k] = (payment as unknown as Record<string, string>)[k];
  }
  const canonical = JSON.stringify(canonicalFields);
  const messageBytes = new TextEncoder().encode(canonical);
  const signatureBytes = fromHex(payment.signature);
  const publicKeyBytes = bs58.decode(payment.payer);
  return ed.verify(signatureBytes, messageBytes, publicKeyBytes) as boolean;
}

export function hashResourcePath(path: string): Uint8Array {
  return sha256(new TextEncoder().encode(path));
}

// --- Hex helpers ---

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}
