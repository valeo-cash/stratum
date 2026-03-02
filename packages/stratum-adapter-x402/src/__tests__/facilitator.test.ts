import { describe, it, expect } from "vitest";
import { MockFacilitatorClient, CoinbaseFacilitatorClient } from "../facilitator";
import {
  createBatchId,
  createWindowId,
  createInstructionId,
  createAccountId,
  createFacilitatorId,
} from "@valeo/stratum-core";
import type { SettlementBatch } from "@valeo/stratum-core";

function makeBatch(): SettlementBatch {
  return {
    version: 1,
    batch_id: createBatchId("batch-test-001"),
    window_id: createWindowId("win-test"),
    instructions: [
      {
        version: 1,
        instruction_id: createInstructionId("xfer-001"),
        from: createAccountId("alice"),
        to: createAccountId("bob"),
        amount: 5000n,
        asset: "USDC",
        chain: "solana",
        facilitator_id: createFacilitatorId("coinbase"),
      },
      {
        version: 1,
        instruction_id: createInstructionId("xfer-002"),
        from: createAccountId("carol"),
        to: createAccountId("dave"),
        amount: 3000n,
        asset: "USDC",
        chain: "solana",
        facilitator_id: createFacilitatorId("coinbase"),
      },
    ],
    merkle_root: new Uint8Array(32),
    status: "pending",
    facilitator_id: createFacilitatorId("coinbase"),
  };
}

describe("MockFacilitatorClient", () => {
  it("submits a batch and returns submitted status", async () => {
    const client = new MockFacilitatorClient();
    const batch = makeBatch();

    const result = await client.submitSettlementBatch(batch);

    expect(result.batchId).toBe("batch-test-001");
    expect(result.status).toBe("submitted");
    expect(result.txHashes).toHaveLength(2);
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it("getSettlementStatus returns submitted after submit", async () => {
    const client = new MockFacilitatorClient();
    const batch = makeBatch();

    await client.submitSettlementBatch(batch);
    const status = await client.getSettlementStatus("batch-test-001");
    expect(status).toBe("submitted");
  });

  it("getSettlementStatus returns pending for unknown batch", async () => {
    const client = new MockFacilitatorClient();
    const status = await client.getSettlementStatus("unknown-batch");
    expect(status).toBe("pending");
  });

  it("confirmBatch transitions status to confirmed", async () => {
    const client = new MockFacilitatorClient();
    const batch = makeBatch();

    await client.submitSettlementBatch(batch);
    client.confirmBatch("batch-test-001");

    const status = await client.getSettlementStatus("batch-test-001");
    expect(status).toBe("confirmed");
  });
});

describe("CoinbaseFacilitatorClient", () => {
  it("constructor accepts facilitator URL", () => {
    const client = new CoinbaseFacilitatorClient({
      facilitatorUrl: "https://facilitator.coinbase.com",
    });
    expect(client).toBeDefined();
  });

  it("submitSettlementBatch throws not implemented", async () => {
    const client = new CoinbaseFacilitatorClient({
      facilitatorUrl: "https://facilitator.coinbase.com",
    });
    await expect(client.submitSettlementBatch(makeBatch())).rejects.toThrow(
      /Not implemented/,
    );
  });

  it("getSettlementStatus throws not implemented", async () => {
    const client = new CoinbaseFacilitatorClient({
      facilitatorUrl: "https://facilitator.coinbase.com",
    });
    await expect(client.getSettlementStatus("batch-001")).rejects.toThrow(
      /Not implemented/,
    );
  });
});
