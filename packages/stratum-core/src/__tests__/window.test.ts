import { describe, it, expect } from "vitest";
import { SettlementWindow, WindowState } from "../window";
import {
  createWindowId,
  createReceiptId,
  createAccountId,
  createFacilitatorId,
  createBatchId,
  createInstructionId,
  CURRENT_RECEIPT_VERSION,
} from "../index";
import type { SignedReceipt, Receipt, SettlementBatch, AnchorRecord, SignedWindowHead } from "../types";

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

function makeBatch(): SettlementBatch {
  return {
    version: 1,
    batch_id: createBatchId("batch-001"),
    window_id: createWindowId("win-test"),
    instructions: [{
      version: 1,
      instruction_id: createInstructionId("xfer-001"),
      from: createAccountId("alice"),
      to: createAccountId("bob"),
      amount: 5000n,
      asset: "USDC",
      chain: "solana",
      facilitator_id: createFacilitatorId("coinbase"),
    }],
    merkle_root: new Uint8Array(32),
    status: "pending",
    facilitator_id: createFacilitatorId("coinbase"),
  };
}

function makeAnchorRecord(): AnchorRecord {
  return {
    version: 1,
    chain: "solana",
    tx_hash: new Uint8Array(32).fill(0x01),
    block_number: 100,
    window_id: createWindowId("win-test"),
    merkle_root: new Uint8Array(32),
    receipt_count: 5,
    timestamp: Date.now(),
  };
}

function makeSignedHead(): SignedWindowHead {
  return {
    version: 1,
    window_id: createWindowId("win-test"),
    receipt_count: 5,
    merkle_root: new Uint8Array(32),
    total_volume_gross: 5000n,
    total_volume_net: 1000n,
    compression_ratio: 5,
    previous_window_head_hash: null,
    signer_id: createAccountId("node-1"),
    signature: new Uint8Array(64),
  };
}

describe("SettlementWindow", () => {
  describe("valid state transitions", () => {
    it("OPEN -> ACCUMULATING -> PRE_CLOSE -> NETTING -> INSTRUCTING -> ANCHORING -> FINALIZED", () => {
      const w = new SettlementWindow(createWindowId("win-001"));
      expect(w.getState()).toBe(WindowState.OPEN);

      w.open();
      expect(w.getState()).toBe(WindowState.ACCUMULATING);

      w.accumulate(makeSignedReceipt(0));
      expect(w.getState()).toBe(WindowState.ACCUMULATING);

      w.preClose();
      expect(w.getState()).toBe(WindowState.PRE_CLOSE);

      w.computeNetting({ transfers: [] });
      expect(w.getState()).toBe(WindowState.NETTING);

      w.instruct(makeBatch());
      expect(w.getState()).toBe(WindowState.INSTRUCTING);

      w.anchor(makeAnchorRecord());
      expect(w.getState()).toBe(WindowState.ANCHORING);

      w.finalize(makeSignedHead());
      expect(w.getState()).toBe(WindowState.FINALIZED);
    });
  });

  describe("invalid transitions throw", () => {
    it("cannot accumulate in OPEN state", () => {
      const w = new SettlementWindow(createWindowId("win-inv"));
      expect(() => w.accumulate(makeSignedReceipt(0))).toThrow(/OPEN/);
    });

    it("cannot accumulate after PRE_CLOSE", () => {
      const w = new SettlementWindow(createWindowId("win-inv2"));
      w.open();
      w.preClose();
      expect(() => w.accumulate(makeSignedReceipt(0))).toThrow(/PRE_CLOSE/);
    });

    it("cannot finalize from OPEN", () => {
      const w = new SettlementWindow(createWindowId("win-inv3"));
      expect(() => w.finalize(makeSignedHead())).toThrow();
    });

    it("cannot open twice", () => {
      const w = new SettlementWindow(createWindowId("win-inv4"));
      w.open();
      expect(() => w.open()).toThrow(/ACCUMULATING/);
    });

    it("cannot instruct from ACCUMULATING", () => {
      const w = new SettlementWindow(createWindowId("win-inv5"));
      w.open();
      expect(() => w.instruct(makeBatch())).toThrow();
    });
  });

  describe("sequence number assignment", () => {
    it("assigns monotonically increasing sequences", () => {
      const w = new SettlementWindow(createWindowId("win-seq"));
      w.open();

      const sequences: number[] = [];
      for (let i = 0; i < 100; i++) {
        const { sequence } = w.accumulate(makeSignedReceipt(i));
        sequences.push(sequence);
      }

      for (let i = 1; i < sequences.length; i++) {
        expect(sequences[i]).toBe(sequences[i - 1] + 1);
      }
      expect(sequences[0]).toBe(0);
      expect(sequences[99]).toBe(99);
    });
  });

  describe("accumulate 100 receipts", () => {
    it("tracks count and creates entries", () => {
      const w = new SettlementWindow(createWindowId("win-100"));
      w.open();

      for (let i = 0; i < 100; i++) {
        const { entry, sequence } = w.accumulate(makeSignedReceipt(i));
        expect(entry.receipt_id).toBe(`rcpt-${i}`);
        expect(sequence).toBe(i);
      }

      expect(w.getReceiptCount()).toBe(100);
      expect(w.getReceipts()).toHaveLength(100);
    });
  });

  describe("preClose returns stats", () => {
    it("returns receipt count and cutoff sequence", () => {
      const w = new SettlementWindow(createWindowId("win-pc"));
      w.open();
      for (let i = 0; i < 5; i++) w.accumulate(makeSignedReceipt(i));

      const { receiptCount, cutoffSequence } = w.preClose();
      expect(receiptCount).toBe(5);
      expect(cutoffSequence).toBe(5);
    });
  });

  describe("retry and rollback", () => {
    it("retryInstruction resets INSTRUCTING -> NETTING", () => {
      const w = new SettlementWindow(createWindowId("win-retry"));
      w.open();
      w.accumulate(makeSignedReceipt(0));
      w.preClose();
      w.computeNetting({});
      w.instruct(makeBatch());
      expect(w.getState()).toBe(WindowState.INSTRUCTING);

      w.retryInstruction();
      expect(w.getState()).toBe(WindowState.NETTING);
    });

    it("retryAnchoring resets ANCHORING -> INSTRUCTING", () => {
      const w = new SettlementWindow(createWindowId("win-retry2"));
      w.open();
      w.accumulate(makeSignedReceipt(0));
      w.preClose();
      w.computeNetting({});
      w.instruct(makeBatch());
      w.anchor(makeAnchorRecord());
      expect(w.getState()).toBe(WindowState.ANCHORING);

      w.retryAnchoring();
      expect(w.getState()).toBe(WindowState.INSTRUCTING);
    });

    it("rollbackToPreClose resets NETTING -> PRE_CLOSE", () => {
      const w = new SettlementWindow(createWindowId("win-rb"));
      w.open();
      w.accumulate(makeSignedReceipt(0));
      w.preClose();
      w.computeNetting({});
      expect(w.getState()).toBe(WindowState.NETTING);

      w.rollbackToPreClose();
      expect(w.getState()).toBe(WindowState.PRE_CLOSE);
    });
  });

  describe("fail()", () => {
    it("transitions to FAILED from any non-FINALIZED state", () => {
      const w = new SettlementWindow(createWindowId("win-fail"));
      w.open();
      w.fail();
      expect(w.getState()).toBe(WindowState.FAILED);
    });

    it("throws when trying to fail a FINALIZED window", () => {
      const w = new SettlementWindow(createWindowId("win-fail2"));
      w.open();
      w.preClose();
      w.computeNetting({});
      w.instruct(makeBatch());
      w.anchor(makeAnchorRecord());
      w.finalize(makeSignedHead());
      expect(() => w.fail()).toThrow(/FINALIZED/);
    });
  });
});
