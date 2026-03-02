import type { AnchorRecord, WindowId } from "@valeo/stratum-core";

export interface AnchorResult {
  txHash: string;
  blockNumber: number;
  chain: string;
  timestamp: number;
  confirmed: boolean;
}

export interface ChainAnchor {
  anchor(record: AnchorRecord): Promise<AnchorResult>;
  verify(record: AnchorRecord): Promise<boolean>;
  getAnchor(windowId: WindowId): Promise<AnchorRecord | null>;
}
