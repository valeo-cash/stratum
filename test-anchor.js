const { Connection, Keypair, PublicKey, SystemProgram } = require("@solana/web3.js");
const { AnchorProvider, Program, setProvider, web3 } = require("@coral-xyz/anchor");
const crypto = require("crypto");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(process.cwd(), "apps/gateway/.env") });

const rpcUrl = process.env.SOLANA_RPC_URL;
const programId = process.env.ANCHOR_PROGRAM_ID;
const privKey = process.env.SOLANA_PRIVATE_KEY;

console.log("RPC:", rpcUrl);
console.log("Program:", programId);

const keypair = Keypair.fromSecretKey(Buffer.from(privKey, "base64"));
const connection = new Connection(rpcUrl, "confirmed");

const windowId = "test-" + Date.now();
const merkleRoot = crypto.randomBytes(32);

console.log("Window ID:", windowId);
console.log("Merkle Root:", merkleRoot.toString("hex").slice(0, 16) + "...");

(async () => {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("stratum"), Buffer.from(windowId)],
    new PublicKey(programId)
  );
  console.log("PDA:", pda.toBase58());
  console.log("Authority:", keypair.publicKey.toBase58());
  console.log("\nAnchoring window on Solana devnet...");

  // Use raw transaction since we don't have the IDL loaded easily
  const idl = require("./packages/stratum-anchor/src/idl/stratum_anchor.json");
  const provider = new AnchorProvider(connection, { publicKey: keypair.publicKey, signTransaction: async (tx) => { tx.sign(keypair); return tx; }, signAllTransactions: async (txs) => { txs.forEach(tx => tx.sign(keypair)); return txs; } }, { commitment: "confirmed" });
  const program = new Program(idl, new PublicKey(programId), provider);

  const tx = await program.methods
    .anchorWindow(windowId, Array.from(merkleRoot), new (require("@coral-xyz/anchor").BN)(100), new (require("@coral-xyz/anchor").BN)(50000), new (require("@coral-xyz/anchor").BN)(12000))
    .accounts({ anchorAccount: pda, authority: keypair.publicKey, systemProgram: SystemProgram.programId })
    .signers([keypair])
    .rpc();

  console.log("\n✅ Anchor transaction confirmed!");
  console.log("TX:", tx);
  console.log("Explorer: https://explorer.solana.com/tx/" + tx + "?cluster=devnet");

  const account = await program.account.anchorAccount.fetch(pda);
  console.log("\n📦 On-chain data:");
  console.log("  Window ID:", account.windowId);
  console.log("  Merkle Root:", Buffer.from(account.merkleRoot).toString("hex").slice(0, 16) + "...");
  console.log("  Receipt Count:", account.receiptCount.toString());
  console.log("  Gross Volume:", account.grossVolume.toString());
  console.log("  Net Volume:", account.netVolume.toString());
})().catch(console.error);
