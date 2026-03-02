import { readFileSync } from "fs";
import { resolve } from "path";
import { Keypair } from "@solana/web3.js";
import { SolanaAnchor } from "@valeo/stratum-anchor";
import { randomBytes } from "crypto";

// Load env from apps/gateway/.env
const envPath = resolve(__dirname, "..", "apps", "gateway", ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.log("  (Could not load apps/gateway/.env, using process env)");
}

const RPC_URL = process.env.SOLANA_RPC_URL;
const PROGRAM_ID = process.env.ANCHOR_PROGRAM_ID;
const PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;

if (!RPC_URL) {
  console.error("Missing SOLANA_RPC_URL. Set it in apps/gateway/.env or as env var.");
  process.exit(1);
}
if (!PROGRAM_ID) {
  console.error("Missing ANCHOR_PROGRAM_ID. Deploy the program first, then set it in apps/gateway/.env");
  process.exit(1);
}
if (!PRIVATE_KEY) {
  console.error("Missing SOLANA_PRIVATE_KEY. Run: npx tsx scripts/export-keypair.ts");
  process.exit(1);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     Stratum Anchor — End-to-End Test     ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log("");

  const keypair = Keypair.fromSecretKey(Buffer.from(PRIVATE_KEY!, "base64"));
  console.log(`  RPC:        ${RPC_URL}`);
  console.log(`  Program:    ${PROGRAM_ID}`);
  console.log(`  Authority:  ${keypair.publicKey.toBase58()}`);
  console.log("");

  const anchor = new SolanaAnchor({
    rpcUrl: RPC_URL!,
    programId: PROGRAM_ID!,
    keypair,
  });

  const windowId = `test-window-${Date.now()}`;
  const merkleRoot = new Uint8Array(randomBytes(32));
  const receiptCount = 42;
  const grossVolume = 1_500_000n;
  const netVolume = 350_000n;

  console.log(`  Window ID:     ${windowId}`);
  console.log(`  Merkle root:   ${toHex(merkleRoot).slice(0, 32)}...`);
  console.log(`  Receipt count: ${receiptCount}`);
  console.log(`  Gross volume:  ${grossVolume} micro-USDC`);
  console.log(`  Net volume:    ${netVolume} micro-USDC`);
  console.log("");

  // Step 1: Anchor the window on-chain
  console.log("  [1/3] Anchoring window on-chain...");
  const record = {
    version: 1,
    chain: "solana",
    tx_hash: new Uint8Array(32),
    block_number: 0,
    window_id: windowId as any,
    merkle_root: merkleRoot,
    receipt_count: receiptCount,
    timestamp: Date.now(),
    gross_volume: grossVolume,
    net_volume: netVolume,
  };

  const result = await anchor.anchor(record);
  console.log(`        TX hash: ${result.txHash}`);
  console.log(`        Block:   ${result.blockNumber}`);
  console.log(`        Link:    https://explorer.solana.com/tx/${result.txHash}?cluster=devnet`);
  console.log("");

  // Step 2: Read back the PDA
  console.log("  [2/3] Reading PDA back...");
  const onChain = await anchor.getAnchor(windowId as any);

  if (!onChain) {
    console.error("        FAIL: PDA not found after anchoring");
    process.exit(1);
  }

  const rootMatch =
    onChain.merkle_root.length === merkleRoot.length &&
    onChain.merkle_root.every((b, i) => b === merkleRoot[i]);

  console.log(`        Window ID:     ${onChain.window_id}`);
  console.log(`        Merkle root:   ${toHex(onChain.merkle_root).slice(0, 32)}...`);
  console.log(`        Receipt count: ${onChain.receipt_count}`);
  console.log(`        Root match:    ${rootMatch ? "PASS" : "FAIL"}`);
  console.log("");

  // Step 3: Verify via the verify() method
  console.log("  [3/3] Verifying via anchor.verify()...");
  const verified = await anchor.verify(record);
  console.log(`        Verified: ${verified ? "PASS" : "FAIL"}`);
  console.log("");

  // Summary
  const allPassed = rootMatch && verified;
  console.log("╔══════════════════════════════════════════╗");
  console.log(`║  Result: ${allPassed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}               ║`);
  console.log("╚══════════════════════════════════════════╝");
  console.log("");

  if (!allPassed) process.exit(1);
}

main().catch((err) => {
  console.error("");
  console.error("  Test failed with error:", err.message || err);
  if (err.logs) {
    console.error("  Program logs:");
    for (const log of err.logs) console.error(`    ${log}`);
  }
  process.exit(1);
});
