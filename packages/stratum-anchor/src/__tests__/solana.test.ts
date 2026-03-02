import { describe, it, expect } from "vitest";
import { SolanaAnchor } from "../solana";
import { createWindowId } from "@valeo/stratum-core";
import type { AnchorRecord } from "@valeo/stratum-core";

const config = {
  rpcUrl: "https://api.devnet.solana.com",
  programId: "StratumAnch1111111111111111111111111111111",
  keypair: new Uint8Array(64).fill(0x01),
};

function makeAnchorRecord(): AnchorRecord {
  return {
    version: 1,
    chain: "solana",
    tx_hash: new Uint8Array(32),
    block_number: 0,
    window_id: createWindowId("win-001"),
    merkle_root: new Uint8Array(32).fill(0xab),
    receipt_count: 100,
    timestamp: Date.now(),
  };
}

describe("SolanaAnchor", () => {
  it("constructor accepts config without throwing", () => {
    const anchor = new SolanaAnchor(config);
    expect(anchor).toBeInstanceOf(SolanaAnchor);
  });

  it("anchor() throws not-implemented error", async () => {
    const anchor = new SolanaAnchor(config);
    await expect(anchor.anchor(makeAnchorRecord())).rejects.toThrow(
      /Not implemented/,
    );
  });

  it("verify() throws not-implemented error", async () => {
    const anchor = new SolanaAnchor(config);
    await expect(anchor.verify(makeAnchorRecord())).rejects.toThrow(
      /Not implemented/,
    );
  });

  it("getAnchor() throws not-implemented error", async () => {
    const anchor = new SolanaAnchor(config);
    await expect(
      anchor.getAnchor(createWindowId("win-001")),
    ).rejects.toThrow(/Not implemented/);
  });
});
