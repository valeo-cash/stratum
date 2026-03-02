import { describe, it, expect } from "vitest";
import { ClearingLedger } from "../ledger";
import {
  createWindowId,
  createReceiptId,
  createAccountId,
  createFacilitatorId,
  CURRENT_RECEIPT_VERSION,
} from "@valeo/stratum-core";
import type { SignedReceipt, Receipt } from "@valeo/stratum-core";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function makeSignedReceipt(overrides: Partial<Receipt> = {}): SignedReceipt {
  const receipt: Receipt = {
    version: CURRENT_RECEIPT_VERSION,
    receipt_id: createReceiptId(`rcpt-${Math.random().toString(36).slice(2)}`),
    window_id: createWindowId("win-001"),
    sequence: 1,
    payer: createAccountId("alice"),
    payee: createAccountId("bob"),
    amount: 1000n,
    asset: "USDC",
    resource_hash: new Uint8Array(32).fill(0xab),
    idempotency_key: new Uint8Array(32).fill(Math.floor(Math.random() * 256)),
    timestamp: Date.now(),
    facilitator_id: createFacilitatorId("coinbase"),
    nonce: `nonce-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
  return {
    version: 1,
    receipt,
    signature: new Uint8Array(64),
    signer_public_key: new Uint8Array(32),
  };
}

describe("ClearingLedger", () => {
  describe("append 100 receipts", () => {
    it("positions match expected bilateral sums", () => {
      const ledger = new ClearingLedger();

      for (let i = 0; i < 50; i++) {
        ledger.append(
          makeSignedReceipt({
            payer: createAccountId("alice"),
            payee: createAccountId("bob"),
            amount: 100n,
            idempotency_key: new Uint8Array(32).fill(i),
            sequence: i,
          }),
        );
      }
      for (let i = 0; i < 50; i++) {
        ledger.append(
          makeSignedReceipt({
            payer: createAccountId("bob"),
            payee: createAccountId("alice"),
            amount: 40n,
            idempotency_key: new Uint8Array(32).fill(50 + i),
            sequence: 50 + i,
          }),
        );
      }

      const entries = ledger.getWindowEntries(createWindowId("win-001"));
      expect(entries).toHaveLength(100);

      const positions = ledger.getPositions(createWindowId("win-001"));
      const aliceToBob = positions.positions.get("alice")?.get("bob");
      const bobToAlice = positions.positions.get("bob")?.get("alice");
      expect(aliceToBob).toBe(5000n);
      expect(bobToAlice).toBe(2000n);
    });
  });

  describe("idempotency", () => {
    it("second append returns original entry without double-counting", () => {
      const ledger = new ClearingLedger();
      const idemKey = new Uint8Array(32).fill(0x42);

      const sr = makeSignedReceipt({
        receipt_id: createReceiptId("rcpt-idem"),
        idempotency_key: idemKey,
      });

      const entry1 = ledger.append(sr);
      const entry2 = ledger.append(sr);

      expect(entry1.entry_id).toBe(entry2.entry_id);
      expect(entry1.receipt_id).toBe(entry2.receipt_id);

      const entries = ledger.getWindowEntries(createWindowId("win-001"));
      expect(entries).toHaveLength(1);

      expect(ledger.hasIdempotencyKey(toHex(idemKey))).toBe(true);
    });
  });

  describe("cross-window isolation", () => {
    it("receipts in window A do not appear in window B", () => {
      const ledger = new ClearingLedger();

      ledger.append(
        makeSignedReceipt({
          window_id: createWindowId("win-A"),
          idempotency_key: new Uint8Array(32).fill(0x01),
        }),
      );
      ledger.append(
        makeSignedReceipt({
          window_id: createWindowId("win-A"),
          idempotency_key: new Uint8Array(32).fill(0x02),
        }),
      );
      ledger.append(
        makeSignedReceipt({
          window_id: createWindowId("win-B"),
          idempotency_key: new Uint8Array(32).fill(0x03),
        }),
      );

      expect(ledger.getWindowEntries(createWindowId("win-A"))).toHaveLength(2);
      expect(ledger.getWindowEntries(createWindowId("win-B"))).toHaveLength(1);

      const posA = ledger.getPositions(createWindowId("win-A"));
      const posB = ledger.getPositions(createWindowId("win-B"));

      let totalA = 0n;
      for (const payees of posA.positions.values()) {
        for (const amount of payees.values()) totalA += amount;
      }

      let totalB = 0n;
      for (const payees of posB.positions.values()) {
        for (const amount of payees.values()) totalB += amount;
      }

      expect(totalA).toBe(2000n);
      expect(totalB).toBe(1000n);
    });
  });

  describe("getParticipantPosition", () => {
    it("computes correct gross credits, debits, and net", () => {
      const ledger = new ClearingLedger();
      const winId = createWindowId("win-pos");

      ledger.append(
        makeSignedReceipt({
          window_id: winId,
          payer: createAccountId("alice"),
          payee: createAccountId("bob"),
          amount: 300n,
          idempotency_key: new Uint8Array(32).fill(0x10),
        }),
      );
      ledger.append(
        makeSignedReceipt({
          window_id: winId,
          payer: createAccountId("bob"),
          payee: createAccountId("alice"),
          amount: 100n,
          idempotency_key: new Uint8Array(32).fill(0x11),
        }),
      );

      const alicePos = ledger.getParticipantPosition("alice", winId);
      expect(alicePos.gross_credit).toBe(100n);
      expect(alicePos.gross_debit).toBe(300n);
      expect(alicePos.net_balance).toBe(-200n);

      const bobPos = ledger.getParticipantPosition("bob", winId);
      expect(bobPos.gross_credit).toBe(300n);
      expect(bobPos.gross_debit).toBe(100n);
      expect(bobPos.net_balance).toBe(200n);
    });
  });
});
