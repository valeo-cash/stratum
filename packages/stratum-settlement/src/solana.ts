import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type {
  ChainSettlement,
  NetTransfer,
  BatchSettlementResult,
  TransferResult,
} from "./types";

const USDC_DECIMALS = 6;
const MAX_TRANSFERS_PER_TX = 5;

export class SolanaSettlement implements ChainSettlement {
  readonly chain = "solana" as const;
  private readonly connection: Connection;
  private readonly settlementKeypair: Keypair;
  private readonly usdcMint: PublicKey;

  constructor(
    connection: Connection,
    settlementKeypair: Keypair,
    usdcMint: PublicKey,
  ) {
    this.connection = connection;
    this.settlementKeypair = settlementKeypair;
    this.usdcMint = usdcMint;
  }

  async executeBatch(transfers: NetTransfer[]): Promise<BatchSettlementResult> {
    const results: TransferResult[] = [];
    const txHashes: string[] = [];

    const chunks: NetTransfer[][] = [];
    for (let i = 0; i < transfers.length; i += MAX_TRANSFERS_PER_TX) {
      chunks.push(transfers.slice(i, i + MAX_TRANSFERS_PER_TX));
    }

    for (const chunk of chunks) {
      const tx = new Transaction();
      const chunkTransfers: { from: string; to: string; amount: bigint }[] = [];

      for (const t of chunk) {
        const sourceOwner = new PublicKey(t.from);
        const destOwner = new PublicKey(t.to);

        const sourceAta = await getAssociatedTokenAddress(
          this.usdcMint,
          sourceOwner,
        );
        const destAta = await getAssociatedTokenAddress(
          this.usdcMint,
          destOwner,
        );

        const ix = createTransferCheckedInstruction(
          sourceAta,
          this.usdcMint,
          destAta,
          this.settlementKeypair.publicKey, // delegate authority
          t.amount,
          USDC_DECIMALS,
          [],
          TOKEN_PROGRAM_ID,
        );

        tx.add(ix);
        chunkTransfers.push({ from: t.from, to: t.to, amount: t.amount });
      }

      try {
        const signature = await sendAndConfirmTransaction(
          this.connection,
          tx,
          [this.settlementKeypair],
          { commitment: "confirmed" },
        );

        txHashes.push(signature);
        for (const ct of chunkTransfers) {
          results.push({
            from: ct.from,
            to: ct.to,
            amount: ct.amount,
            txHash: signature,
            status: "confirmed",
          });
        }
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        for (const ct of chunkTransfers) {
          results.push({
            from: ct.from,
            to: ct.to,
            amount: ct.amount,
            txHash: "",
            status: "failed",
            error: errorMsg,
          });
        }
      }
    }

    let totalVolume = 0n;
    for (const r of results) {
      if (r.status === "confirmed") totalVolume += r.amount;
    }

    return {
      chain: "solana",
      transfers: results,
      totalVolume,
      txHashes,
      allSucceeded: results.every((r) => r.status === "confirmed"),
    };
  }

  async checkAllowance(agent: string, amount: bigint): Promise<boolean> {
    try {
      const ownerPubkey = new PublicKey(agent);
      const ata = await getAssociatedTokenAddress(this.usdcMint, ownerPubkey);
      const account = await getAccount(this.connection, ata);

      const hasDelegation =
        account.delegate !== null &&
        account.delegate.equals(this.settlementKeypair.publicKey) &&
        account.delegatedAmount >= amount;

      const hasBalance = account.amount >= amount;

      return hasDelegation && hasBalance;
    } catch {
      return false;
    }
  }

  async getBalance(address: string): Promise<bigint> {
    try {
      const ownerPubkey = new PublicKey(address);
      const ata = await getAssociatedTokenAddress(this.usdcMint, ownerPubkey);
      const account = await getAccount(this.connection, ata);
      return account.amount;
    } catch {
      return 0n;
    }
  }
}
