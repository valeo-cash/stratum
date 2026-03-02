import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import type { Receipt, SignedReceipt } from "@valeo/stratum-core";
import { CURRENT_RECEIPT_VERSION } from "@valeo/stratum-core";
import { canonicalEncode } from "./canonical";

// noble v3 requires providing a sync sha512 hash
ed.hashes.sha512 = sha512;

/**
 * Sign a receipt with an Ed25519 private key.
 * Returns a SignedReceipt containing the original receipt,
 * the 64-byte signature, and the signer's 32-byte public key.
 */
export async function signReceipt(
  receipt: Receipt,
  privateKey: Uint8Array,
): Promise<SignedReceipt> {
  const message = canonicalEncode(receipt);
  const signature = ed.sign(message, privateKey);
  const publicKey = ed.getPublicKey(privateKey);

  return {
    version: CURRENT_RECEIPT_VERSION,
    receipt,
    signature,
    signer_public_key: publicKey,
  };
}

/**
 * Verify the Ed25519 signature on a SignedReceipt.
 * Re-encodes the receipt canonically and checks the signature
 * against the embedded public key.
 */
export async function verifyReceipt(signed: SignedReceipt): Promise<boolean> {
  const message = canonicalEncode(signed.receipt);
  return ed.verify(signed.signature, message, signed.signer_public_key);
}

/**
 * Generate a new Ed25519 keypair for signing receipts.
 */
export async function generateKeypair(): Promise<{
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}> {
  const privateKey = ed.utils.randomSecretKey();
  const publicKey = ed.getPublicKey(privateKey);
  return { privateKey, publicKey };
}
