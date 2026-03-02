import { describe, it, expect } from "vitest";
import { signReceipt, verifyReceipt, generateKeypair } from "../signing";
import { makeReceipt } from "./helpers";
import { createAccountId } from "@valeo/stratum-core";

describe("signReceipt / verifyReceipt", () => {
  it("sign + verify round-trip succeeds", async () => {
    const { privateKey } = await generateKeypair();
    const receipt = makeReceipt();
    const signed = await signReceipt(receipt, privateKey);
    const valid = await verifyReceipt(signed);
    expect(valid).toBe(true);
  });

  it("signature is 64 bytes (Ed25519)", async () => {
    const { privateKey } = await generateKeypair();
    const signed = await signReceipt(makeReceipt(), privateKey);
    expect(signed.signature).toHaveLength(64);
  });

  it("public key is 32 bytes", async () => {
    const { privateKey } = await generateKeypair();
    const signed = await signReceipt(makeReceipt(), privateKey);
    expect(signed.signer_public_key).toHaveLength(32);
  });

  it("rejects tampered receipt (amount changed)", async () => {
    const { privateKey } = await generateKeypair();
    const signed = await signReceipt(makeReceipt(), privateKey);

    signed.receipt = { ...signed.receipt, amount: 9999999n };
    const valid = await verifyReceipt(signed);
    expect(valid).toBe(false);
  });

  it("rejects tampered receipt (payer changed)", async () => {
    const { privateKey } = await generateKeypair();
    const signed = await signReceipt(makeReceipt(), privateKey);

    signed.receipt = {
      ...signed.receipt,
      payer: createAccountId("evil-agent"),
    };
    const valid = await verifyReceipt(signed);
    expect(valid).toBe(false);
  });

  it("rejects verification with wrong public key", async () => {
    const kp1 = await generateKeypair();
    const kp2 = await generateKeypair();
    const signed = await signReceipt(makeReceipt(), kp1.privateKey);

    signed.signer_public_key = kp2.publicKey;
    const valid = await verifyReceipt(signed);
    expect(valid).toBe(false);
  });
});

describe("generateKeypair", () => {
  it("produces unique keypairs", async () => {
    const kp1 = await generateKeypair();
    const kp2 = await generateKeypair();
    expect(kp1.privateKey).not.toEqual(kp2.privateKey);
    expect(kp1.publicKey).not.toEqual(kp2.publicKey);
  });
});
