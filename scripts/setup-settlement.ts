import { config } from "dotenv";
import { resolve } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createApproveCheckedInstruction,
} from "@solana/spl-token";
import { Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

config({ path: resolve(__dirname, "../apps/gateway/.env") });

const AGENT_COUNT = 10;
const USDC_DECIMALS = 6;
const USDC_PER_AGENT = 1_000n * 10n ** BigInt(USDC_DECIMALS); // 1000 USDC
const APPROVAL_AMOUNT = 100n * 10n ** BigInt(USDC_DECIMALS); // 100 USDC
const OUTPUT_FILE = resolve(__dirname, "devnet-agents.json");

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  const settlementKeyB64 = process.env.SOLANA_SETTLEMENT_KEY || process.env.SOLANA_PRIVATE_KEY;

  if (!rpcUrl) {
    console.error("Missing SOLANA_RPC_URL in apps/gateway/.env");
    process.exit(1);
  }
  if (!settlementKeyB64) {
    console.error("Missing SOLANA_SETTLEMENT_KEY (or SOLANA_PRIVATE_KEY) in apps/gateway/.env");
    process.exit(1);
  }

  const connection = new Connection(rpcUrl, "confirmed");
  const settlementKeypair = Keypair.fromSecretKey(
    Buffer.from(settlementKeyB64, "base64"),
  );

  console.log("");
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   Stratum — Devnet Settlement Setup      ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log("");
  console.log(`  RPC:        ${rpcUrl.slice(0, 50)}...`);
  console.log(`  Settlement: ${settlementKeypair.publicKey.toBase58()}`);
  console.log(`  Agents:     ${AGENT_COUNT}`);
  console.log("");

  // 1. Generate or load agent keypairs
  let agents: Keypair[];
  if (existsSync(OUTPUT_FILE)) {
    console.log("→ Loading existing agents from devnet-agents.json...");
    const existing = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
    agents = existing.agents.map((a: { secretKey: number[] }) =>
      Keypair.fromSecretKey(new Uint8Array(a.secretKey)),
    );
    console.log(`  Loaded ${agents.length} agents`);
  } else {
    console.log(`→ Generating ${AGENT_COUNT} agent keypairs...`);
    agents = Array.from({ length: AGENT_COUNT }, () => Keypair.generate());
  }
  console.log("");

  // 2. Airdrop SOL to settlement keypair for tx fees
  console.log("→ Airdropping SOL to settlement keypair for fees...");
  try {
    const sig = await connection.requestAirdrop(
      settlementKeypair.publicKey,
      2 * LAMPORTS_PER_SOL,
    );
    await connection.confirmTransaction(sig, "confirmed");
    console.log("  2 SOL airdropped");
  } catch (e: any) {
    console.log(`  Airdrop failed (may already have SOL): ${e.message?.slice(0, 80)}`);
  }
  console.log("");

  // 3. Create mock USDC mint (settlement keypair is mint authority)
  console.log("→ Creating mock USDC SPL token mint...");
  const mintAuthority = settlementKeypair;
  const usdcMint = await createMint(
    connection,
    settlementKeypair, // payer
    mintAuthority.publicKey, // mint authority
    null, // freeze authority
    USDC_DECIMALS,
  );
  console.log(`  Mint: ${usdcMint.toBase58()}`);
  console.log("");

  // 4. Create ATA for settlement keypair
  console.log("→ Creating settlement ATA...");
  const settlementAta = await getOrCreateAssociatedTokenAccount(
    connection,
    settlementKeypair,
    usdcMint,
    settlementKeypair.publicKey,
  );
  console.log(`  Settlement ATA: ${settlementAta.address.toBase58()}`);
  console.log("");

  // 5. Fund each agent: airdrop SOL, create ATA, mint USDC, approve
  console.log(`→ Funding ${AGENT_COUNT} agents...`);
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const label = `  Agent ${i + 1}/${agents.length}`;
    process.stdout.write(`${label}: ${agent.publicKey.toBase58().slice(0, 12)}...`);

    // Airdrop SOL for tx fees
    try {
      const sig = await connection.requestAirdrop(
        agent.publicKey,
        0.1 * LAMPORTS_PER_SOL,
      );
      await connection.confirmTransaction(sig, "confirmed");
    } catch {
      // may already have SOL
    }

    // Create ATA
    const agentAta = await getOrCreateAssociatedTokenAccount(
      connection,
      settlementKeypair, // payer
      usdcMint,
      agent.publicKey,
    );

    // Mint USDC
    await mintTo(
      connection,
      settlementKeypair, // payer
      usdcMint,
      agentAta.address,
      mintAuthority, // mint authority
      USDC_PER_AGENT,
    );

    // Approve settlement keypair as delegate
    const approveIx = createApproveCheckedInstruction(
      agentAta.address,
      usdcMint,
      settlementKeypair.publicKey, // delegate
      agent.publicKey, // owner
      APPROVAL_AMOUNT,
      USDC_DECIMALS,
    );
    const tx = new Transaction().add(approveIx);
    await sendAndConfirmTransaction(connection, tx, [agent], {
      commitment: "confirmed",
    });

    console.log(" funded + approved ✓");
  }
  console.log("");

  // 6. Save to JSON
  const output = {
    rpcUrl,
    usdcMint: usdcMint.toBase58(),
    settlementAddress: settlementKeypair.publicKey.toBase58(),
    agents: agents.map((a) => ({
      publicKey: a.publicKey.toBase58(),
      secretKey: Array.from(a.secretKey),
    })),
    fundedAmount: USDC_PER_AGENT.toString(),
    approvedAmount: APPROVAL_AMOUNT.toString(),
    createdAt: new Date().toISOString(),
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`→ Saved to ${OUTPUT_FILE}`);
  console.log("");

  // 7. Summary
  console.log("╔══════════════════════════════════════════╗");
  console.log("║              Summary                     ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log("");
  console.log(`  ${agents.length} agents funded with 1000 USDC each`);
  console.log(`  100 USDC approved for settlement`);
  console.log(`  USDC Mint: ${usdcMint.toBase58()}`);
  console.log(`  Settlement: ${settlementKeypair.publicKey.toBase58()}`);
  console.log("");
  console.log("  Add to apps/gateway/.env:");
  console.log(`  USDC_MINT=${usdcMint.toBase58()}`);
  console.log("");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
