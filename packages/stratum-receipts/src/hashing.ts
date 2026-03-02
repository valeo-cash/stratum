import { sha256 } from "@noble/hashes/sha2.js";
import type { SignedReceipt } from "@valeo/stratum-core";
import { canonicalEncode } from "./canonical";

/**
 * Hash a SignedReceipt for use as a Merkle leaf.
 * SHA-256 of (canonical encoding bytes || signature bytes).
 */
export function hashReceipt(signed: SignedReceipt): Uint8Array {
  const encoded = canonicalEncode(signed.receipt);
  const combined = new Uint8Array(encoded.length + signed.signature.length);
  combined.set(encoded, 0);
  combined.set(signed.signature, encoded.length);
  return sha256(combined);
}
