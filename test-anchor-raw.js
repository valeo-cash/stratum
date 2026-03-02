const { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } = require("@solana/web3.js");
const crypto = require("crypto");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(process.cwd(), "apps/gateway/.env") });

const rpcUrl = process.env.SOLANA_RPC_URL;
const programId = new PublicKey(process.env.ANCHOR_PROGRAM_ID);
const keypair = Keypair.fromSecretKey(Buffer.from(process.env.SOLANA_PRIVATE_KEY, "base64"));
const connection = new Connection(rpcUrl, "confirmed");

const windowId = "test-" + Date.now();
const merkleRoot = crypto.randomBytes(32);

console.log("RPC:", rpcUrl);
console.log("Program:", programId.toBase58());
console.log("Window ID:", windowId);
console.log("Merkle Root:", merkleRoot.toString("hex").slice(0, 16) + "...");
console.log("Authority:", keypair.publicKey.toBase58());

(async () => {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("stratum"), Buffer.from(windowId)],
    programId
  );
  console.log("PDA:", pda.toBase58());

  // Anchor discriminator for "anchor_window" = sha256("global:anchor_window")[0..8]
  const hash = crypto.createHash("sha256").update("global:anchor_window").digest();
  const discriminator = hash.slice(0, 8);

  // Encode args: window_id (string), merkle_root ([u8;32]), receipt_count (u64), gross_volume (u64), net_volume (u64)
  const windowIdBytes = Buffer.from(windowId, "utf8");
  const windowIdLen = Buffer.alloc(4);
  windowIdLen.writeUInt32LE(windowIdBytes.length);

  const receiptCount = Buffer.alloc(8);
  receiptCount.writeBigUInt64LE(100n);
  const grossVolume = Buffer.alloc(8);
  grossVolume.writeBigUInt64LE(50000n);
  const netVolume = Buffer.alloc(8);
  netVolume.writeBigUInt64LE(12000n);

  const data = Buffer.concat([discriminator, windowIdLen, windowIdBytes, merkleRoot, receiptCount, grossVolume, netVolume]);

  const ix = new TransactionInstruction({
    keys: [
      { pubkey: pda, isSigner: false, isWritable: true },
      { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data,
  });

  console.log("\nAnchoring window on Solana devnet...");
  const tx = new Transaction().add(ix);
  tx.feePayer = keypair.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(keypair);

  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(sig, "confirmed");

  console.log("\n✅ Anchor transaction confirmed!");
  console.log("TX:", sig);
  console.log("Explorer: https://explorer.solana.com/tx/" + sig + "?cluster=devnet");

  // Read PDA
  const acct = await connection.getAccountInfo(pda);
  if (acct) {
    console.log("\n📦 On-chain PDA exists! Data length:", acct.data.length, "bytes");
    // Skip first 8 bytes (discriminator), then 32 (authority pubkey)
    const storedRoot = acct.data.slice(8 + 32 + 4 + windowtes.length, 8 + 32 + 4 + windowIdBytes.length + 32);
    console.log("  Stored Merkle Root:", storedRoot.toString("hex").slice(0, 16) + "...");
    console.log("  Match:", merkleRoot.equals(storedRoot) ? "✅ YES" : "❌ NO");
  }
})().catch(console.error);
