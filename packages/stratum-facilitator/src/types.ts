export interface StratumConfig {
  apiKey: string;
  gatewayUrl?: string;
}

export interface Payment {
  from: string;
  to: string;
  amount: string;
  chain: "solana" | "base";
  reference?: string;
  metadata?: Record<string, any>;
}

export interface PaymentStatus {
  reference: string;
  status: "queued" | "batched" | "settling" | "settled" | "failed";
  txHash?: string;
  settledAt?: string;
  createdAt: string;
  error?: string;
}

export interface SubmitResponse {
  accepted: number;
  rejected: number;
  windowId: string;
  estimatedSettlement: string;
  payments: { reference: string; status: string; receiptId: string }[];
}
