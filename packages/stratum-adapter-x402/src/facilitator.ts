import type { SettlementBatch } from "@valeo/stratum-core";
import type { FacilitatorClient, SettlementResult, SettlementStatus } from "./types";

/**
 * In-memory mock facilitator for testing and local development.
 * Stores submitted batches and returns mock results.
 */
export class MockFacilitatorClient implements FacilitatorClient {
  private batches = new Map<string, { batch: SettlementBatch; status: SettlementStatus }>();

  async submitSettlementBatch(batch: SettlementBatch): Promise<SettlementResult> {
    const batchId = batch.batch_id as string;
    this.batches.set(batchId, { batch, status: "submitted" });

    return {
      batchId,
      status: "submitted",
      txHashes: batch.instructions.map(
        (_, i) => `0x${batchId}-tx-${i}`,
      ),
      timestamp: Date.now(),
    };
  }

  async getSettlementStatus(batchId: string): Promise<SettlementStatus> {
    const entry = this.batches.get(batchId);
    if (!entry) return "pending";
    return entry.status;
  }

  /** Test helper: mark a batch as confirmed. */
  confirmBatch(batchId: string): void {
    const entry = this.batches.get(batchId);
    if (entry) entry.status = "confirmed";
  }
}

/**
 * Coinbase facilitator client stub.
 * Methods throw until a live facilitator endpoint is configured.
 */
export class CoinbaseFacilitatorClient implements FacilitatorClient {
  private readonly facilitatorUrl: string;

  constructor(config: { facilitatorUrl: string }) {
    this.facilitatorUrl = config.facilitatorUrl;
  }

  async submitSettlementBatch(_batch: SettlementBatch): Promise<SettlementResult> {
    throw new Error(
      `Not implemented: requires live facilitator at ${this.facilitatorUrl}`,
    );
  }

  async getSettlementStatus(_batchId: string): Promise<SettlementStatus> {
    throw new Error(
      `Not implemented: requires live facilitator at ${this.facilitatorUrl}`,
    );
  }
}
