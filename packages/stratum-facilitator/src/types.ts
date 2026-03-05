export interface SettlementTransfer {
  from: string;
  to: string;
  amount: string;
  chain: "solana" | "base";
  asset: string;
}

export interface SettlementBatch {
  batch_id: string;
  window_id: string;
  chain: string;
  merkle_root: string;
  anchor_tx_hash: string | null;
  transfers: SettlementTransfer[];
  total_volume: string;
}

export interface FacilitatorConfig {
  apiKey: string;
  solanaPrivateKey: string;
  port?: number;
  publicUrl?: string;
  gatewayUrl?: string;
  solanaRpcUrl?: string;
  usdcMint?: string;
}

export interface SettlementResult {
  success: boolean;
  txHashes: string[];
  batchId?: string;
  error?: string;
}
