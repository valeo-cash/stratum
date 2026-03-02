import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import bs58 from "bs58";

const keypairPath =
  process.argv[2] || join(homedir(), ".config", "solana", "id.json");

if (!existsSync(keypairPath)) {
  console.error(`Keypair file not found: ${keypairPath}`);
  console.error("Run: solana-keygen new");
  process.exit(1);
}

const raw = readFileSync(keypairPath, "utf-8");
const bytes = new Uint8Array(JSON.parse(raw));

if (bytes.length !== 64) {
  console.error(`Expected 64-byte keypair, got ${bytes.length} bytes`);
  process.exit(1);
}

const encoded = bs58.encode(bytes);
const pubkey = bs58.encode(bytes.slice(32));

console.log(`  Keypair file: ${keypairPath}`);
console.log(`  Public key:   ${pubkey}`);
console.log("");
console.log(`  Add this to your .env as:`);
console.log(`  SOLANA_PRIVATE_KEY=${encoded}`);
