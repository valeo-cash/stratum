import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import type { SignedWindowHead, WindowId, AccountId } from "@valeo/stratum-core";

ed.hashes.sha512 = sha512;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Deterministically encode the unsigned portion of a window head
 * for signing. Produces a stable byte representation via sorted-key
 * JSON with BigInt serialized as "<value>n" and Uint8Array as "0x<hex>".
 */
function encodeForSigning(params: {
  window_id: WindowId;
  receipt_count: number;
  merkle_root: Uint8Array;
  total_volume_gross: bigint;
  total_volume_net: bigint;
  compression_ratio: number;
  previous_window_head_hash: Uint8Array | null;
}): Uint8Array {
  const obj: Record<string, unknown> = {
    compression_ratio: params.compression_ratio,
    merkle_root: `0x${toHex(params.merkle_root)}`,
    previous_window_head_hash: params.previous_window_head_hash
      ? `0x${toHex(params.previous_window_head_hash)}`
      : null,
    receipt_count: params.receipt_count,
    total_volume_gross: `${params.total_volume_gross}n`,
    total_volume_net: `${params.total_volume_net}n`,
    window_id: params.window_id,
  };
  return new TextEncoder().encode(JSON.stringify(obj));
}

export async function createSignedWindowHead(params: {
  windowId: WindowId;
  receiptCount: number;
  merkleRoot: Uint8Array;
  totalVolumeGross: bigint;
  totalVolumeNet: bigint;
  compressionRatio: number;
  previousWindowHeadHash: Uint8Array | null;
  signerPrivateKey: Uint8Array;
}): Promise<SignedWindowHead> {
  const publicKey = ed.getPublicKey(params.signerPrivateKey);

  const message = encodeForSigning({
    window_id: params.windowId,
    receipt_count: params.receiptCount,
    merkle_root: params.merkleRoot,
    total_volume_gross: params.totalVolumeGross,
    total_volume_net: params.totalVolumeNet,
    compression_ratio: params.compressionRatio,
    previous_window_head_hash: params.previousWindowHeadHash,
  });

  const signature = ed.sign(message, params.signerPrivateKey);

  return {
    version: 1,
    window_id: params.windowId,
    receipt_count: params.receiptCount,
    merkle_root: params.merkleRoot,
    total_volume_gross: params.totalVolumeGross,
    total_volume_net: params.totalVolumeNet,
    compression_ratio: params.compressionRatio,
    previous_window_head_hash: params.previousWindowHeadHash,
    signer_id: toHex(publicKey) as AccountId,
    signature,
  };
}

/**
 * Verify the Ed25519 signature on a SignedWindowHead.
 */
export async function verifyWindowHead(
  head: SignedWindowHead,
  signerPublicKey: Uint8Array,
): Promise<boolean> {
  const message = encodeForSigning({
    window_id: head.window_id,
    receipt_count: head.receipt_count,
    merkle_root: head.merkle_root,
    total_volume_gross: head.total_volume_gross,
    total_volume_net: head.total_volume_net,
    compression_ratio: head.compression_ratio,
    previous_window_head_hash: head.previous_window_head_hash,
  });

  return ed.verify(head.signature, message, signerPublicKey);
}

/**
 * Hash a SignedWindowHead for chaining (previous_window_head_hash).
 */
export function hashWindowHead(head: SignedWindowHead): Uint8Array {
  const message = encodeForSigning({
    window_id: head.window_id,
    receipt_count: head.receipt_count,
    merkle_root: head.merkle_root,
    total_volume_gross: head.total_volume_gross,
    total_volume_net: head.total_volume_net,
    compression_ratio: head.compression_ratio,
    previous_window_head_hash: head.previous_window_head_hash,
  });
  const combined = new Uint8Array(message.length + head.signature.length);
  combined.set(message, 0);
  combined.set(head.signature, message.length);
  return sha256(combined);
}
