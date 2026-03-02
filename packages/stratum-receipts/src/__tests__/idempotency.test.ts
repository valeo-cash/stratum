import { describe, it, expect } from "vitest";
import { computeIdempotencyKey, IdempotencyStore } from "../idempotency";
import { makeReceipt } from "./helpers";
import { createAccountId } from "@valeo/stratum-core";

describe("computeIdempotencyKey", () => {
  it("is deterministic — same input produces same key", () => {
    const receipt = makeReceipt();
    const key1 = computeIdempotencyKey(receipt);
    const key2 = computeIdempotencyKey(receipt);
    expect(key1).toEqual(key2);
  });

  it("produces 32-byte SHA-256 output", () => {
    const key = computeIdempotencyKey(makeReceipt());
    expect(key).toHaveLength(32);
    expect(key).toBeInstanceOf(Uint8Array);
  });

  it("different payer produces different key", () => {
    const r1 = makeReceipt();
    const r2 = makeReceipt({ payer: createAccountId("agent-charlie") });
    expect(computeIdempotencyKey(r1)).not.toEqual(
      computeIdempotencyKey(r2),
    );
  });

  it("different payee produces different key", () => {
    const r1 = makeReceipt();
    const r2 = makeReceipt({ payee: createAccountId("service-dave") });
    expect(computeIdempotencyKey(r1)).not.toEqual(
      computeIdempotencyKey(r2),
    );
  });

  it("different amount produces different key", () => {
    const r1 = makeReceipt();
    const r2 = makeReceipt({ amount: 9999999n });
    expect(computeIdempotencyKey(r1)).not.toEqual(
      computeIdempotencyKey(r2),
    );
  });

  it("different nonce produces different key", () => {
    const r1 = makeReceipt();
    const r2 = makeReceipt({ nonce: "different-nonce" });
    expect(computeIdempotencyKey(r1)).not.toEqual(
      computeIdempotencyKey(r2),
    );
  });

  it("different resource_hash produces different key", () => {
    const r1 = makeReceipt();
    const r2 = makeReceipt({ resource_hash: new Uint8Array(32).fill(0xff) });
    expect(computeIdempotencyKey(r1)).not.toEqual(
      computeIdempotencyKey(r2),
    );
  });
});

describe("IdempotencyStore", () => {
  it("reports false for unseen keys", () => {
    const store = new IdempotencyStore();
    const key = computeIdempotencyKey(makeReceipt());
    expect(store.has(key)).toBe(false);
  });

  it("detects duplicate keys (replay)", () => {
    const store = new IdempotencyStore();
    const key = computeIdempotencyKey(makeReceipt());
    expect(store.add(key)).toBe(true);
    expect(store.add(key)).toBe(false);
    expect(store.has(key)).toBe(true);
  });

  it("allows different keys", () => {
    const store = new IdempotencyStore();
    const k1 = computeIdempotencyKey(makeReceipt());
    const k2 = computeIdempotencyKey(makeReceipt({ nonce: "other" }));
    expect(store.add(k1)).toBe(true);
    expect(store.add(k2)).toBe(true);
  });

  it("clear() resets the store", () => {
    const store = new IdempotencyStore();
    const key = computeIdempotencyKey(makeReceipt());
    store.add(key);
    store.clear();
    expect(store.has(key)).toBe(false);
    expect(store.add(key)).toBe(true);
  });
});
