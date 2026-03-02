import { describe, it, expect } from "vitest";
import {
  createAccountId,
  createWindowId,
  createReceiptId,
  createFacilitatorId,
  createInstructionId,
  createServiceId,
  CURRENT_RECEIPT_VERSION,
} from "../index";
import type {
  Receipt,
  SignedReceipt,
  NetPosition,
  SettlementInstruction,
  RoutePricing,
  StratumConfig,
  PaymentIntent,
} from "../types";

function makeReceipt(): Receipt {
  return {
    version: CURRENT_RECEIPT_VERSION,
    receipt_id: createReceiptId("rcpt-001"),
    window_id: createWindowId("win-001"),
    sequence: 1,
    payer: createAccountId("agent-alice"),
    payee: createAccountId("service-bob"),
    amount: 5000000n,
    asset: "USDC",
    resource_hash: new Uint8Array(32),
    idempotency_key: new Uint8Array(32),
    timestamp: Date.now(),
    facilitator_id: createFacilitatorId("coinbase"),
    nonce: "abc123",
  };
}

describe("Receipt interface", () => {
  it("constructs with all required fields", () => {
    const r = makeReceipt();
    expect(r.version).toBe(CURRENT_RECEIPT_VERSION);
    expect(r.receipt_id).toBe("rcpt-001");
    expect(r.amount).toBe(5000000n);
  });

  it("amount is bigint, not number", () => {
    const r = makeReceipt();
    expect(typeof r.amount).toBe("bigint");
  });

  it("hashes are Uint8Array", () => {
    const r = makeReceipt();
    expect(r.resource_hash).toBeInstanceOf(Uint8Array);
    expect(r.idempotency_key).toBeInstanceOf(Uint8Array);
  });

  it("timestamp is a number (Unix ms)", () => {
    const r = makeReceipt();
    expect(typeof r.timestamp).toBe("number");
    expect(r.timestamp).toBeGreaterThan(0);
  });
});

describe("SignedReceipt interface", () => {
  it("wraps a receipt with signature and public key", () => {
    const sr: SignedReceipt = {
      version: 1,
      receipt: makeReceipt(),
      signature: new Uint8Array(64),
      signer_public_key: new Uint8Array(32),
    };
    expect(sr.signature).toHaveLength(64);
    expect(sr.signer_public_key).toHaveLength(32);
    expect(sr.receipt.amount).toBe(5000000n);
  });
});

describe("NetPosition interface", () => {
  it("uses bigint for all monetary fields", () => {
    const pos: NetPosition = {
      version: 1,
      participant_id: createAccountId("alice"),
      window_id: createWindowId("win-001"),
      gross_credit: 10000000n,
      gross_debit: 3000000n,
      net_balance: 7000000n,
      counterparty_count: 5,
    };
    expect(typeof pos.gross_credit).toBe("bigint");
    expect(typeof pos.gross_debit).toBe("bigint");
    expect(typeof pos.net_balance).toBe("bigint");
  });
});

describe("SettlementInstruction interface", () => {
  it("uses bigint for amount", () => {
    const si: SettlementInstruction = {
      version: 1,
      instruction_id: createInstructionId("inst-001"),
      from: createAccountId("alice"),
      to: createAccountId("bob"),
      amount: 7000000n,
      asset: "USDC",
      chain: "solana",
      facilitator_id: createFacilitatorId("coinbase"),
    };
    expect(typeof si.amount).toBe("bigint");
  });
});

describe("RoutePricing interface", () => {
  it("uses bigint for amount_per_request", () => {
    const rp: RoutePricing = {
      version: 1,
      path_pattern: "/api/**",
      amount_per_request: 5000n,
      asset: "USDC",
    };
    expect(typeof rp.amount_per_request).toBe("bigint");
  });
});

describe("PaymentIntent interface", () => {
  it("uses bigint for amount and Uint8Array for resource_hash", () => {
    const pi: PaymentIntent = {
      version: 1,
      amount: 1000000n,
      asset: "USDC",
      payer: createAccountId("agent"),
      payee: createAccountId("service"),
      resource_hash: new Uint8Array(32),
      expiry: Date.now() + 60_000,
      nonce: "nonce-1",
    };
    expect(typeof pi.amount).toBe("bigint");
    expect(pi.resource_hash).toBeInstanceOf(Uint8Array);
  });
});

describe("StratumConfig interface", () => {
  it("constructs with version field", () => {
    const cfg: StratumConfig = {
      version: 1,
      settlement_window_seconds: 300,
      chain: "solana",
      asset: "USDC",
      facilitator_url: "https://x402.org/facilitator",
      risk_controls_enabled: true,
    };
    expect(cfg.version).toBe(1);
    expect(cfg.settlement_window_seconds).toBe(300);
  });
});
