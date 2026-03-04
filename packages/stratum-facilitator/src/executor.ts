import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import type { SettlementTransfer } from "./types";

const USDC_DECIMALS = 6;
const MAX_INSTRUCTIONS_PER_TX = 10;

export async function executeSolanaTransfers(
  connection: Connection,
  payer: Keypair,
  transfers: SettlementTransfer[],
  usdcMint: PublicKey,
): Promise<string[]> {
  const solanaTransfers = transfers.filter((t) => t.chain === "solana");
  if (solanaTransfers.length === 0) return [];

  const sourceAta = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    usdcMint,
    payer.publicKey,
  );

  const instructions = await Promise.all(
    solanaTransfers.map(async (t) => {
      const destPubkey = new PublicKey(t.to);
      const destAta = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        usdcMint,
        destPubkey,
      );

      return createTransferCheckedInstruction(
        sourceAta.address,
        usdcMint,
        destAta.address,
        payer.publicKey,
        BigInt(t.amount),
        USDC_DECIMALS,
      );
    }),
  );

  const chunks: (typeof instructions)[] = [];
  for (let i = 0; i < instructions.length; i += MAX_INSTRUCTIONS_PER_TX) {
    chunks.push(instructions.slice(i, i + MAX_INSTRUCTIONS_PER_TX));
  }

  const signatures: string[] = [];

  for (const chunk of chunks) {
    const tx = new Transaction();
    for (const ix of chunk) tx.add(ix);

    const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
      commitment: "confirmed",
    });
    signatures.push(sig);
  }

  return signatures;
}
