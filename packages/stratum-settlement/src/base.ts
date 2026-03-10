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
  "function transfer(address to, uint256 amount) returns (bool)",
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

    console.log(`[base-settlement] Settlement wallet: ${this.settlementAddress}`);
    console.log(`[base-settlement] Processing ${transfers.length} transfers`);

    try {
      const usdcBalance = await this.publicClient.readContract({
        address: this.usdcAddress,
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [this.settlementAddress],
      }) as bigint;
      const ethBalance = await this.publicClient.getBalance({ address: this.settlementAddress });
      console.log(`[base-settlement] USDC balance: ${(Number(usdcBalance) / 1_000_000).toFixed(6)} ($${(Number(usdcBalance) / 1_000_000).toFixed(2)})`);
      console.log(`[base-settlement] ETH balance: ${(Number(ethBalance) / 1e18).toFixed(6)} ETH`);
    } catch (balErr: any) {
      console.warn(`[base-settlement] Could not fetch balances: ${balErr.message}`);
    }

    for (const t of transfers) {
      const amountUSDC = (Number(t.amount) / 1_000_000).toFixed(6);
      console.log(`[base-settlement] Attempting transfer: ${t.from} -> ${t.to} amount: ${amountUSDC} USDC`);

      try {
        const hash: Hash = await this.walletClient.writeContract({
          address: this.usdcAddress,
          abi: USDC_ABI,
          functionName: "transfer",
          args: [
            t.to as Address,
            t.amount,
          ],
          account: this.account,
          chain: this.walletClient.chain!,
        });

        console.log(`[base-settlement] Tx sent: ${hash}`);

        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        const succeeded = receipt.status === "success";
        if (succeeded) {
          console.log(`[base-settlement] Tx confirmed: ${hash} (block ${receipt.blockNumber})`);
        } else {
          console.error(`[base-settlement] Tx reverted: ${hash} (block ${receipt.blockNumber})`);
        }

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
        console.error(`[base-settlement] Transfer failed: ${t.to}`, err.message);
        if (err.stack) console.error(`[base-settlement] Stack:`, err.stack);
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
