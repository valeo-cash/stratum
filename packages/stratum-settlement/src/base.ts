import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import type {
  ChainSettlement,
  NetTransfer,
  BatchSettlementResult,
  TransferResult,
} from "./types";

const USDC_ABI = parseAbi([
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

export interface BaseSettlementConfig {
  rpcUrl: string;
  privateKey: `0x${string}`;
  usdcAddress: `0x${string}`;
  testnet?: boolean;
}

export class BaseSettlement implements ChainSettlement {
  readonly chain = "base" as const;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly publicClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly walletClient: any;
  private readonly usdcAddress: Address;
  private readonly settlementAddress: Address;
  private readonly account: PrivateKeyAccount;

  constructor(config: BaseSettlementConfig) {
    const chainConfig = config.testnet ? baseSepolia : base;

    this.account = privateKeyToAccount(config.privateKey);
    this.settlementAddress = this.account.address;

    this.publicClient = createPublicClient({
      chain: chainConfig,
      transport: http(config.rpcUrl),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: chainConfig,
      transport: http(config.rpcUrl),
    });

    this.usdcAddress = config.usdcAddress;
  }

  async executeBatch(transfers: NetTransfer[]): Promise<BatchSettlementResult> {
    const results: TransferResult[] = [];
    const txHashes: string[] = [];

    for (const t of transfers) {
      try {
        const hash: Hash = await this.walletClient.writeContract({
          address: this.usdcAddress,
          abi: USDC_ABI,
          functionName: "transferFrom",
          args: [
            t.from as Address,
            t.to as Address,
            t.amount,
          ],
          account: this.account,
          chain: this.walletClient.chain!,
        });

        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        const succeeded = receipt.status === "success";
        txHashes.push(hash);
        results.push({
          from: t.from,
          to: t.to,
          amount: t.amount,
          txHash: hash,
          status: succeeded ? "confirmed" : "failed",
          error: succeeded ? undefined : "Transaction reverted",
        });
      } catch (err: any) {
        results.push({
          from: t.from,
          to: t.to,
          amount: t.amount,
          txHash: "",
          status: "failed",
          error: err?.message || String(err),
        });
      }
    }

    let totalVolume = 0n;
    for (const r of results) {
      if (r.status === "confirmed") totalVolume += r.amount;
    }

    return {
      chain: "base",
      transfers: results,
      totalVolume,
      txHashes,
      allSucceeded: results.every((r) => r.status === "confirmed"),
    };
  }

  async checkAllowance(agent: string, amount: bigint): Promise<boolean> {
    try {
      const allowance = await this.publicClient.readContract({
        address: this.usdcAddress,
        abi: USDC_ABI,
        functionName: "allowance",
        args: [agent as Address, this.settlementAddress],
      });

      return (allowance as bigint) >= amount;
    } catch {
      return false;
    }
  }

  async getBalance(address: string): Promise<bigint> {
    try {
      const balance = await this.publicClient.readContract({
        address: this.usdcAddress,
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [address as Address],
      });

      return balance as bigint;
    } catch {
      return 0n;
    }
  }
}
