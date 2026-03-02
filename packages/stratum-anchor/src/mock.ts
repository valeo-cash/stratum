import type { AnchorRecord, WindowId } from "@valeo/stratum-core";
import type { AnchorResult, ChainAnchor } from "./types";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * In-memory implementation of ChainAnchor for testing and local development.
 * Stores anchors in a Map keyed by window_id.
 */
export class MockAnchor implements ChainAnchor {
  private readonly store = new Map<string, AnchorRecord>();
  private blockCounter = 0;

  async anchor(record: AnchorRecord): Promise<AnchorResult> {
    const key = record.window_id as string;
    if (this.store.has(key)) {
      throw new Error(
        `Duplicate anchor: window_id "${key}" already anchored`,
      );
    }

    this.store.set(key, record);
    this.blockCounter++;

    return {
      txHash: `0x${toHex(record.merkle_root)}`,
      blockNumber: this.blockCounter,
      chain: record.chain,
      timestamp: Date.now(),
      confirmed: true,
    };
  }

  async verify(record: AnchorRecord): Promise<boolean> {
    const stored = this.store.get(record.window_id as string);
    if (!stored) return false;

    if (stored.merkle_root.length !== record.merkle_root.length) return false;
    for (let i = 0; i < stored.merkle_root.length; i++) {
      if (stored.merkle_root[i] !== record.merkle_root[i]) return false;
    }
    return true;
  }

  async getAnchor(windowId: WindowId): Promise<AnchorRecord | null> {
    return this.store.get(windowId as string) ?? null;
  }
}
