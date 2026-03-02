import { describe, it, expect } from "vitest";
import { canonicalEncode, canonicalDecode } from "../canonical";
import { makeReceipt } from "./helpers";

describe("canonicalEncode / canonicalDecode", () => {
  it("round-trips a receipt preserving all fields", () => {
    const original = makeReceipt();
    const bytes = canonicalEncode(original);
    const decoded = canonicalDecode(bytes);

    expect(decoded.version).toBe(original.version);
    expect(decoded.receipt_id).toBe(original.receipt_id);
    expect(decoded.window_id).toBe(original.window_id);
    expect(decoded.sequence).toBe(original.sequence);
    expect(decoded.payer).toBe(original.payer);
    expect(decoded.payee).toBe(original.payee);
    expect(decoded.amount).toBe(original.amount);
    expect(decoded.asset).toBe(original.asset);
    expect(decoded.nonce).toBe(original.nonce);
    expect(decoded.timestamp).toBe(original.timestamp);
    expect(decoded.facilitator_id).toBe(original.facilitator_id);
  });

  it("preserves BigInt fields (not converted to number)", () => {
    const receipt = makeReceipt({ amount: 9007199254740993n }); // > Number.MAX_SAFE_INTEGER
    const decoded = canonicalDecode(canonicalEncode(receipt));
    expect(typeof decoded.amount).toBe("bigint");
    expect(decoded.amount).toBe(9007199254740993n);
  });

  it("preserves Uint8Array fields via hex round-trip", () => {
    const hash = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const receipt = makeReceipt({ resource_hash: hash });
    const decoded = canonicalDecode(canonicalEncode(receipt));
    expect(decoded.resource_hash).toBeInstanceOf(Uint8Array);
    expect(decoded.resource_hash).toEqual(hash);
  });

  it("produces deterministic output across 1000 iterations", () => {
    const receipt = makeReceipt();
    const first = canonicalEncode(receipt);
    for (let i = 0; i < 1000; i++) {
      const current = canonicalEncode(receipt);
      expect(current).toEqual(first);
    }
  });

  it("produces sorted keys in JSON output", () => {
    const receipt = makeReceipt();
    const json = new TextDecoder().decode(canonicalEncode(receipt));
    const keys = [...json.matchAll(/"([^"]+)":/g)].map((m) => m[1]);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });
});
