import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createHash } from "crypto";
import type { AnchorRecord, WindowId } from "@valeo/stratum-core";
import type { AnchorResult, ChainAnchor } from "./types";

export interface SolanaAnchorConfig {
  rpcUrl: string;
  programId: string;
  keypair: Keypair;
}

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/** sha256("global:anchor_window")[0..8] */
const DISCRIMINATOR = createHash("sha256")
  .update("global:anchor_window")
  .digest()
  .subarray(0, 8);

function encodeU32LE(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value, 0);
  return buf;
}

function encodeU64LE(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value), 0);
  return buf;
}

function readU32LE(data: Buffer, offset: number): number {
  return data.readUInt32LE(offset);
}

function readU64LE(data: Buffer, offset: number): bigint {
  return data.readBigUInt64LE(offset);
}

function readI64LE(data: Buffer, offset: number): bigint {
  return data.readBigInt64LE(offset);
}

/**
 * Solana implementation of ChainAnchor using raw @solana/web3.js.
 * No dependency on @coral-xyz/anchor — builds the anchor_window
 * instruction manually and parses PDA account data by byte offset.
 */
export class SolanaAnchor implements ChainAnchor {
  private readonly connection: Connection;
  private readonly programId: PublicKey;
  private readonly keypair: Keypair;

  constructor(config: SolanaAnchorConfig) {
    this.connection = new Connection(config.rpcUrl, "confirmed");
    this.programId = new PublicKey(config.programId);
    this.keypair = config.keypair;
  }

  private derivePDA(windowId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("stratum"), Buffer.from(windowId)],
      this.programId,
    );
  }

  private encodeInstructionData(
    windowId: string,
    merkleRoot: Uint8Array,
    receiptCount: number,
    grossVolume: bigint,
    netVolume: bigint,
  ): Buffer {
    const windowIdBytes = Buffer.from(windowId, "utf-8");
    return Buffer.concat([
      DISCRIMINATOR,
      encodeU32LE(windowIdBytes.length),
      windowIdBytes,
      Buffer.from(merkleRoot),
      encodeU64LE(receiptCount),
      encodeU64LE(grossVolume),
      encodeU64LE(netVolume),
    ]);
  }

  private parseAccountData(data: Buffer): {
    authority: PublicKey;
    windowId: string;
    merkleRoot: Uint8Array;
    receiptCount: number;
    grossVolume: bigint;
    netVolume: bigint;
    timestamp: bigint;
  } | null {
    if (data.length < 8 + 32 + 4) return null;

    let offset = 8; // skip discriminator

    const authority = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;

    const strLen = readU32LE(data, offset);
    offset += 4;

    const windowId = data.subarray(offset, offset + strLen).toString("utf-8");
    offset += strLen;

    const merkleRoot = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;

    const receiptCount = Number(readU64LE(data, offset));
    offset += 8;

    const grossVolume = readU64LE(data, offset);
    offset += 8;

    const netVolume = readU64LE(data, offset);
    offset += 8;

    const timestamp = readI64LE(data, offset);

    return {
      authority,
      windowId,
      merkleRoot,
      receiptCount,
      grossVolume,
      netVolume,
      timestamp,
    };
  }

  async anchor(record: AnchorRecord): Promise<AnchorResult> {
    const windowId = record.window_id as string;
    const [pda] = this.derivePDA(windowId);

    const extra = record as AnchorRecord & {
      gross_volume?: bigint;
      net_volume?: bigint;
      memo?: string;
    };
    const grossVolume = extra.gross_volume ?? 0n;
    const netVolume = extra.net_volume ?? 0n;

    const instructionData = this.encodeInstructionData(
      windowId,
      record.merkle_root,
      record.receipt_count,
      grossVolume,
      netVolume,
    );

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: pda, isSigner: false, isWritable: true },
        { pubkey: this.keypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: instructionData,
    });

    const tx = new Transaction().add(ix);

    if (extra.memo) {
      tx.add(
        new TransactionInstruction({
          keys: [{ pubkey: this.keypair.publicKey, isSigner: true, isWritable: false }],
          programId: MEMO_PROGRAM_ID,
          data: Buffer.from(extra.memo, "utf-8"),
        }),
      );
    }

    try {
      const signature = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.keypair],
        { commitment: "confirmed" },
      );

      const slot = await this.connection.getSlot("confirmed");

      return {
        txHash: signature,
        blockNumber: slot,
        chain: "solana",
        timestamp: Date.now(),
        confirmed: true,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("already in use") || msg.includes("already been processed")) {
        console.warn(`[SolanaAnchor] Window "${windowId}" already anchored on-chain, treating as idempotent success`);
        const slot = await this.connection.getSlot("confirmed").catch(() => 0);
        return {
          txHash: `already-anchored:${pda.toBase58()}`,
          blockNumber: slot,
          chain: "solana",
          timestamp: Date.now(),
          confirmed: true,
        };
      }
      throw err;
    }
  }

  async verify(record: AnchorRecord): Promise<boolean> {
    const windowId = record.window_id as string;
    const [pda] = this.derivePDA(windowId);

    try {
      const accountInfo = await this.connection.getAccountInfo(pda);
      if (!accountInfo?.data) return false;

      const parsed = this.parseAccountData(
        Buffer.from(accountInfo.data),
      );
      if (!parsed) return false;

      if (parsed.merkleRoot.length !== record.merkle_root.length) return false;
      for (let i = 0; i < record.merkle_root.length; i++) {
        if (parsed.merkleRoot[i] !== record.merkle_root[i]) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async getAnchor(windowId: WindowId): Promise<AnchorRecord | null> {
    const wid = windowId as string;
    const [pda] = this.derivePDA(wid);

    try {
      const accountInfo = await this.connection.getAccountInfo(pda);
      if (!accountInfo?.data) return null;

      const parsed = this.parseAccountData(
        Buffer.from(accountInfo.data),
      );
      if (!parsed) return null;

      return {
        version: 1,
        chain: "solana",
        tx_hash: new Uint8Array(32),
        block_number: 0,
        window_id: windowId,
        merkle_root: parsed.merkleRoot,
        receipt_count: parsed.receiptCount,
        timestamp: Number(parsed.timestamp) * 1000,
      };
    } catch {
      return null;
    }
  }
}
