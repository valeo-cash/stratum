export interface MppPaymentInput {
  challengeId?: string;
  paymentIntentId?: string;
  txHash?: string;
  from: string;
  to: string;
  amount: string;
  currency: string;
  chain?: string;
  method: "crypto" | "spt";
  metadata?: Record<string, any>;
}

export interface NormalizedMppReceipt {
  from: string;
  to: string;
  amount: string;
  chain: string;
  reference: string;
  skipSettlement: boolean;
  metadata: Record<string, any>;
}

const CHAIN_MAP: Record<string, string> = {
  tempo: "base",
  base: "base",
  solana: "solana",
};

function normalizeAmount(raw: string, currency: string): string {
  if (currency.toUpperCase() === "USD") {
    const dollars = parseFloat(raw);
    if (isNaN(dollars)) return raw;
    return Math.round(dollars * 1_000_000).toString();
  }
  return raw;
}

export function normalizeMppToReceipt(input: MppPaymentInput): NormalizedMppReceipt {
  const isSpt = input.method === "spt";

  const reference =
    input.paymentIntentId ?? input.txHash ?? input.challengeId ?? `mpp-${Date.now().toString(36)}`;

  const chain = isSpt
    ? "stripe"
    : CHAIN_MAP[input.chain ?? "base"] ?? "base";

  const amount = normalizeAmount(input.amount, input.currency);

  const metadata: Record<string, any> = {
    ...input.metadata,
    mppMethod: input.method,
    mppCurrency: input.currency,
  };

  if (input.challengeId) metadata.challengeId = input.challengeId;
  if (input.paymentIntentId) metadata.paymentIntentId = input.paymentIntentId;
  if (input.txHash) metadata.txHash = input.txHash;

  return {
    from: input.from,
    to: input.to,
    amount,
    chain,
    reference,
    skipSettlement: isSpt,
    metadata,
  };
}
