import { describe, it, expect } from "vitest";
import { hashReceipt } from "../hashing";
import { signReceipt, generateKeypair } from "../signing";
import { makeReceipt } from "./helpers";

describe("hashReceipt", () => {
  it("produces 32-byte SHA-256 output", async () => {
    const { privateKey } = await generateKeypair();
    const signed = await signReceipt(makeReceipt(), privateKey);
    const hash = hashReceipt(signed);
    expect(hash).toHaveLength(32);
    expect(hash).toBeInstanceOf(Uint8Array);
  });

  it("same signed receipt always produces same hash", async () => {
    const { privateKey } = await generateKeypair();
    const signed = await signReceipt(makeReceipt(), privateKey);
    const h1 = hashReceipt(signed);
    const h2 = hashReceipt(signed);
    expect(h1).toEqual(h2);
  });

  it("different receipts produce different hashes", async () => {
    const { privateKey } = await generateKeypair();
    const s1 = await signReceipt(makeReceipt(), privateKey);
    const s2 = await signReceipt(
      makeReceipt({ amount: 9999999n }),
      privateKey,
    );
    const h1 = hashReceipt(s1);
    const h2 = hashReceipt(s2);
    expect(h1).not.toEqual(h2);
  });

  it("different signatures produce different hashes", async () => {
    const kp1 = await generateKeypair();
    const kp2 = await generateKeypair();
    const receipt = makeReceipt();
    const s1 = await signReceipt(receipt, kp1.privateKey);
    const s2 = await signReceipt(receipt, kp2.privateKey);
    const h1 = hashReceipt(s1);
    const h2 = hashReceipt(s2);
    expect(h1).not.toEqual(h2);
  });
});
