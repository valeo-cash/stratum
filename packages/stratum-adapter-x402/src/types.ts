import type { SettlementBatch } from "@valeo/stratum-core";

export interface SettlementResult {
  batchId: string;
  status: "submitted" | "confirmed" | "failed";
  txHashes: string[];
  timestamp: number;
}

export type SettlementStatus = "pending" | "submitted" | "confirmed" | "failed";

/** Outbound interface: Stratum sends settlement instructions TO the facilitator. */
export interface FacilitatorClient {
  submitSettlementBatch(batch: SettlementBatch): Promise<SettlementResult>;
  getSettlementStatus(batchId: string): Promise<SettlementStatus>;
}

/** Inbound request from an agent to a Stratum-proxied service. */
export interface IncomingRequest {
  slug: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

/** Response returned by the proxy handler. */
export interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}
