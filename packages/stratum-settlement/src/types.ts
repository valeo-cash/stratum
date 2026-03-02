export interface ChainSettlement {
  chain: "solana" | "base";
  executeBatch(transfers: NetTransfer[]): Promise<BatchSettlementResult>;
  checkAllowance(agent: string, amount: bigint): Promise<boolean>;
  getBalance(address: string): Promise<bigint>;
}

export interface NetTransfer {
  from: string;
  to: string;
  amount: bigint;
  windowId: string;
  chain: "solana" | "base";
}

export interface BatchSettlementResult {
  chain: "solana" | "base";
  transfers: TransferResult[];
  totalVolume: bigint;
  txHashes: string[];
  allSucceeded: boolean;
}

export interface TransferResult {
  from: string;
  to: string;
  amount: bigint;
  txHash: string;
  status: "confirmed" | "failed";
  error?: string;
}

export interface PreflightResult {
  hasBalance: boolean;
  hasAllowance: boolean;
  balance: bigint;
  allowance: bigint;
}
