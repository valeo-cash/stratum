import { describe, it, expect } from "vitest";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import {
  createSignedWindowHead,
  verifyWindowHead,
  hashWindowHead,
} from "../window-head";
import { createWindowId } from "@valeo/stratum-core";

ed.hashes.sha512 = sha512;

function makeKeypair() {
  const privateKey = ed.utils.randomSecretKey();
  const publicKey = ed.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

describe("createSignedWindowHead / verifyWindowHead", () => {
  it("sign + verify round-trip succeeds", async () => {
    const { privateKey, publicKey } = makeKeypair();

    const head = await createSignedWindowHead({
      windowId: createWindowId("win-001"),
      receiptCount: 100,
      merkleRoot: new Uint8Array(32).fill(0xab),
      totalVolumeGross: 50_000_000n,
      totalVolumeNet: 5_000_000n,
      compressionRatio: 10,
      previousWindowHeadHash: null,
      signerPrivateKey: privateKey,
    });

    expect(head.version).toBe(1);
    expect(head.receipt_count).toBe(100);
    expect(head.signature).toHaveLength(64);

    const valid = await verifyWindowHead(head, publicKey);
    expect(valid).toBe(true);
  });

  it("tampered head fails verification", async () => {
    const { privateKey, publicKey } = makeKeypair();

    const head = await createSignedWindowHead({
      windowId: createWindowId("win-002"),
      receiptCount: 50,
      merkleRoot: new Uint8Array(32).fill(0xcd),
      totalVolumeGross: 10_000_000n,
      totalVolumeNet: 1_000_000n,
      compressionRatio: 10,
      previousWindowHeadHash: null,
      signerPrivateKey: privateKey,
    });

    head.receipt_count = 9999;
    const valid = await verifyWindowHead(head, publicKey);
    expect(valid).toBe(false);
  });

  it("wrong public key fails verification", async () => {
    const kp1 = makeKeypair();
    const kp2 = makeKeypair();

    const head = await createSignedWindowHead({
      windowId: createWindowId("win-003"),
      receiptCount: 10,
      merkleRoot: new Uint8Array(32).fill(0xef),
      totalVolumeGross: 1_000_000n,
      totalVolumeNet: 100_000n,
      compressionRatio: 10,
      previousWindowHeadHash: null,
      signerPrivateKey: kp1.privateKey,
    });

    const valid = await verifyWindowHead(head, kp2.publicKey);
    expect(valid).toBe(false);
  });
});

describe("chained window heads", () => {
  it("previous_window_head_hash links windows correctly", async () => {
    const { privateKey, publicKey } = makeKeypair();

    const head1 = await createSignedWindowHead({
      windowId: createWindowId("win-001"),
      receiptCount: 100,
      merkleRoot: new Uint8Array(32).fill(0x11),
      totalVolumeGross: 50_000_000n,
      totalVolumeNet: 5_000_000n,
      compressionRatio: 10,
      previousWindowHeadHash: null,
      signerPrivateKey: privateKey,
    });

    const head1Hash = hashWindowHead(head1);
    expect(head1Hash).toHaveLength(32);

    const head2 = await createSignedWindowHead({
      windowId: createWindowId("win-002"),
      receiptCount: 200,
      merkleRoot: new Uint8Array(32).fill(0x22),
      totalVolumeGross: 100_000_000n,
      totalVolumeNet: 10_000_000n,
      compressionRatio: 10,
      previousWindowHeadHash: head1Hash,
      signerPrivateKey: privateKey,
    });

    expect(head2.previous_window_head_hash).toEqual(head1Hash);

    const v1 = await verifyWindowHead(head1, publicKey);
    const v2 = await verifyWindowHead(head2, publicKey);
    expect(v1).toBe(true);
    expect(v2).toBe(true);
  });
});
