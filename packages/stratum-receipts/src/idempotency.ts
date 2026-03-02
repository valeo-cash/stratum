import { sha256 } from "@noble/hashes/sha2.js";
import type { Receipt } from "@valeo/stratum-core";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Compute a deterministic idempotency key for a receipt.
 * SHA-256 of (payer || payee || resource_hash || amount || nonce).
 * Same logical payment always produces the same key; replays
 * are detected when the key already exists in the store.
 */
export function computeIdempotencyKey(
  receipt: Pick<
    Receipt,
    "payer" | "payee" | "resource_hash" | "amount" | "nonce"
  >,
): Uint8Array {
  const encoder = new TextEncoder();
  const parts = [
    encoder.encode(receipt.payer),
    encoder.encode("|"),
    encoder.encode(receipt.payee),
    encoder.encode("|"),
    receipt.resource_hash,
    encoder.encode("|"),
    encoder.encode(receipt.amount.toString()),
    encoder.encode("|"),
    encoder.encode(receipt.nonce),
  ];

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return sha256(combined);
}

/**
 * In-memory idempotency store for anti-replay protection.
 * Keys are stored as hex strings for O(1) lookup.
 */
export class IdempotencyStore {
  private seen = new Set<string>();

  /** Returns true if this key has already been recorded (replay). */
  has(key: Uint8Array): boolean {
    return this.seen.has(toHex(key));
  }

  /**
   * Record a key. Returns false if the key was already present (replay),
   * true if it was newly added.
   */
  add(key: Uint8Array): boolean {
    const hex = toHex(key);
    if (this.seen.has(hex)) return false;
    this.seen.add(hex);
    return true;
  }

  /** Clear all recorded keys. */
  clear(): void {
    this.seen.clear();
  }
}
