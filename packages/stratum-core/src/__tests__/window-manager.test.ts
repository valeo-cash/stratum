import { describe, it, expect } from "vitest";
import { WindowManager } from "../window-manager";
import { WindowState } from "../window";
import {
  createWindowId,
  createReceiptId,
  createAccountId,
  createFacilitatorId,
  createBatchId,
  createInstructionId,
  CURRENT_RECEIPT_VERSION,
} from "../index";
import type { SignedReceipt, Receipt, StratumConfig, SettlementBatch, AnchorRecord, SignedWindowHead } from "../types";

function makeConfig(): StratumConfig {
  return {
    version: 1,
    settlement_window_seconds: 300,
    chain: "solana",
    asset: "USDC",
    facilitator_url: "https://facilitator.example.com",
    risk_controls_enabled: false,
  };
}

function makeSignedReceipt(seq: number): SignedReceipt {
  const receipt: Receipt = {
    version: CURRENT_RECEIPT_VERSION,
    receipt_id: createReceiptId(`rcpt-${seq}`),
    window_id: createWindowId("win-test"),
    sequence: 0,
    payer: createAccountId("alice"),
    payee: createAccountId("bob"),
    amount: 1000n,
    asset: "USDC",
    resource_hash: new Uint8Array(32).fill(0xab),
    idempotency_key: new Uint8Array(32).fill(seq & 0xff),
    timestamp: Date.now(),
    facilitator_id: createFacilitatorId("coinbase"),
    nonce: `nonce-${seq}`,
  };
  return {
    version: 1,
    receipt,
    signature: new Uint8Array(64),
    signer_public_key: new Uint8Array(32),
  };
}

function makeSettleParams() {
  return {
    computeNetting: () => ({ transfers: [] }),
    submitBatch: async (): Promise<SettlementBatch> => ({
      version: 1,
      batch_id: createBatchId("batch-001"),
      window_id: createWindowId("test"),
      instructions: [],
      merkle_root: new Uint8Array(32),
      status: "pending" as const,
      facilitator_id: createFacilitatorId("coinbase"),
    }),
    anchorRoot: async (): Promise<AnchorRecord> => ({
      version: 1,
      chain: "solana",
      tx_hash: new Uint8Array(32),
      block_number: 1,
      window_id: createWindowId("test"),
      merkle_root: new Uint8Array(32),
      receipt_count: 0,
      timestamp: Date.now(),
    }),
    signHead: async (): Promise<SignedWindowHead> => ({
      version: 1,
      window_id: createWindowId("test"),
      receipt_count: 0,
      merkle_root: new Uint8Array(32),
      total_volume_gross: 0n,
      total_volume_net: 0n,
      compression_ratio: 1,
      previous_window_head_hash: null,
      signer_id: createAccountId("node-1"),
      signature: new Uint8Array(64),
    }),
  };
}

describe("WindowManager", () => {
  it("starts with an ACCUMULATING window", () => {
    const mgr = new WindowManager(makeConfig());
    expect(mgr.getCurrentWindow().getState()).toBe(WindowState.ACCUMULATING);
  });

  it("submitReceipt delegates to current window", () => {
    const mgr = new WindowManager(makeConfig());
    const { receiptId, sequence } = mgr.submitReceipt(makeSignedReceipt(0));
    expect(receiptId).toBe("rcpt-0");
    expect(sequence).toBe(0);

    const { sequence: seq2 } = mgr.submitReceipt(makeSignedReceipt(1));
    expect(seq2).toBe(1);
  });

  describe("closeAndSettle", () => {
    it("finalizes old window and opens new one (zero downtime)", async () => {
      const mgr = new WindowManager(makeConfig());

      mgr.submitReceipt(makeSignedReceipt(0));
      mgr.submitReceipt(makeSignedReceipt(1));

      const oldWindow = mgr.getCurrentWindow();
      const head = await mgr.closeAndSettle(makeSettleParams());

      expect(head).toBeDefined();
      expect(head.version).toBe(1);

      expect(oldWindow.getState()).toBe(WindowState.FINALIZED);

      const newWindow = mgr.getCurrentWindow();
      expect(newWindow).not.toBe(oldWindow);
      expect(newWindow.getState()).toBe(WindowState.ACCUMULATING);
    });

    it("new window accepts receipts immediately after close", async () => {
      const mgr = new WindowManager(makeConfig());
      mgr.submitReceipt(makeSignedReceipt(0));

      await mgr.closeAndSettle(makeSettleParams());

      const { sequence } = mgr.submitReceipt(makeSignedReceipt(10));
      expect(sequence).toBe(0);
    });

    it("multiple settlement cycles work", async () => {
      const mgr = new WindowManager(makeConfig());

      for (let cycle = 0; cycle < 3; cycle++) {
        for (let i = 0; i < 5; i++) {
          mgr.submitReceipt(makeSignedReceipt(cycle * 100 + i));
        }
        const head = await mgr.closeAndSettle(makeSettleParams());
        expect(head).toBeDefined();
      }

      expect(mgr.getCurrentWindow().getState()).toBe(WindowState.ACCUMULATING);
      expect(mgr.getCurrentWindow().getReceiptCount()).toBe(0);
    });
  });
});
