import type {
  ChainSettlement,
  NetTransfer,
  BatchSettlementResult,
  PreflightResult,
} from "./types";

export class SettlementRouter {
  private readonly solana: ChainSettlement | null;
  private readonly base: ChainSettlement | null;

  constructor(opts: {
    solana?: ChainSettlement;
    base?: ChainSettlement;
  }) {
    this.solana = opts.solana ?? null;
    this.base = opts.base ?? null;
  }

  async executeBatch(
    transfers: NetTransfer[],
  ): Promise<BatchSettlementResult[]> {
    const solanaTransfers = transfers.filter((t) => t.chain === "solana");
    const baseTransfers = transfers.filter((t) => t.chain === "base");

    const promises: Promise<BatchSettlementResult>[] = [];

    if (solanaTransfers.length > 0) {
      if (!this.solana) {
        promises.push(
          Promise.resolve(emptyFailedResult("solana", solanaTransfers)),
        );
      } else {
        promises.push(this.solana.executeBatch(solanaTransfers));
      }
    }

    if (baseTransfers.length > 0) {
      if (!this.base) {
        promises.push(
          Promise.resolve(emptyFailedResult("base", baseTransfers)),
        );
      } else {
        promises.push(this.base.executeBatch(baseTransfers));
      }
    }

    if (promises.length === 0) {
      return [];
    }

    const settled = await Promise.allSettled(promises);

    const results: BatchSettlementResult[] = [];
    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        results.push(outcome.value);
      } else {
        results.push({
          chain: "solana",
          transfers: [],
          totalVolume: 0n,
          txHashes: [],
          allSucceeded: false,
        });
      }
    }

    return results;
  }

  async preflightCheck(
    agent: string,
    amount: bigint,
    chain: "solana" | "base",
  ): Promise<PreflightResult> {
    const executor = chain === "solana" ? this.solana : this.base;

    if (!executor) {
      return {
        hasBalance: false,
        hasAllowance: false,
        balance: 0n,
        allowance: 0n,
      };
    }

    const [hasAllowance, balance] = await Promise.all([
      executor.checkAllowance(agent, amount),
      executor.getBalance(agent),
    ]);

    return {
      hasBalance: balance >= amount,
      hasAllowance,
      balance,
      allowance: hasAllowance ? amount : 0n,
    };
  }

  hasChain(chain: "solana" | "base"): boolean {
    return chain === "solana" ? this.solana !== null : this.base !== null;
  }
}

function emptyFailedResult(
  chain: "solana" | "base",
  transfers: NetTransfer[],
): BatchSettlementResult {
  return {
    chain,
    transfers: transfers.map((t) => ({
      from: t.from,
      to: t.to,
      amount: t.amount,
      txHash: "",
      status: "failed" as const,
      error: `${chain} settlement not configured`,
    })),
    totalVolume: 0n,
    txHashes: [],
    allSucceeded: false,
  };
}
