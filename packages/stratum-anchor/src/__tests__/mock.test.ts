import { describe, it, expect } from "vitest";
import { MockAnchor } from "../mock";
import { createWindowId } from "@valeo/stratum-core";
import type { AnchorRecord } from "@valeo/stratum-core";

function makeAnchorRecord(windowId: string): AnchorRecord {
  return {
    version: 1,
    chain: "solana",
    tx_hash: new Uint8Array(32).fill(0x00),
    block_number: 0,
    window_id: createWindowId(windowId),
    merkle_root: new Uint8Array(32).fill(0xab),
    receipt_count: 100,
    timestamp: Date.now(),
  };
}

describe("MockAnchor", () => {
  it("anchor + verify round-trip succeeds", async () => {
    const mock = new MockAnchor();
    const record = makeAnchorRecord("win-001");

    const result = await mock.anchor(record);
    expect(result.confirmed).toBe(true);
    expect(result.chain).toBe("solana");
    expect(result.blockNumber).toBe(1);
    expect(result.txHash).toContain("0x");

    const valid = await mock.verify(record);
    expect(valid).toBe(true);
  });

  it("getAnchor returns null for unknown window", async () => {
    const mock = new MockAnchor();
    const result = await mock.getAnchor(createWindowId("nonexistent"));
    expect(result).toBeNull();
  });

  it("getAnchor returns the stored record", async () => {
    const mock = new MockAnchor();
    const record = makeAnchorRecord("win-002");
    await mock.anchor(record);

    const stored = await mock.getAnchor(createWindowId("win-002"));
    expect(stored).not.toBeNull();
    expect(stored!.receipt_count).toBe(100);
    expect(stored!.merkle_root).toEqual(new Uint8Array(32).fill(0xab));
  });

  it("rejects duplicate window_id", async () => {
    const mock = new MockAnchor();
    const record = makeAnchorRecord("win-003");
    await mock.anchor(record);

    await expect(mock.anchor(record)).rejects.toThrow(/Duplicate anchor/);
  });

  it("verify returns false for unknown window", async () => {
    const mock = new MockAnchor();
    const record = makeAnchorRecord("win-unknown");
    const valid = await mock.verify(record);
    expect(valid).toBe(false);
  });

  it("verify returns false when merkle_root differs", async () => {
    const mock = new MockAnchor();
    const record = makeAnchorRecord("win-004");
    await mock.anchor(record);

    const tampered = { ...record, merkle_root: new Uint8Array(32).fill(0xff) };
    const valid = await mock.verify(tampered);
    expect(valid).toBe(false);
  });

  it("increments block number for each anchor", async () => {
    const mock = new MockAnchor();
    const r1 = await mock.anchor(makeAnchorRecord("win-a"));
    const r2 = await mock.anchor(makeAnchorRecord("win-b"));
    const r3 = await mock.anchor(makeAnchorRecord("win-c"));

    expect(r1.blockNumber).toBe(1);
    expect(r2.blockNumber).toBe(2);
    expect(r3.blockNumber).toBe(3);
  });
});
