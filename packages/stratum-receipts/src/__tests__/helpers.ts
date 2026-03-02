import {
  createReceiptId,
  createWindowId,
  createAccountId,
  createFacilitatorId,
  CURRENT_RECEIPT_VERSION,
} from "@valeo/stratum-core";
import type { Receipt } from "@valeo/stratum-core";

export function makeReceipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    version: CURRENT_RECEIPT_VERSION,
    receipt_id: createReceiptId("rcpt-001"),
    window_id: createWindowId("win-001"),
    sequence: 1,
    payer: createAccountId("agent-alice"),
    payee: createAccountId("service-bob"),
    amount: 5000000n,
    asset: "USDC",
    resource_hash: new Uint8Array(32).fill(0xab),
    idempotency_key: new Uint8Array(32).fill(0xcd),
    timestamp: 1700000000000,
    facilitator_id: createFacilitatorId("coinbase"),
    nonce: "test-nonce-123",
    ...overrides,
  };
}
