import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import http from "http";

const SOLANA_USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const BASE_USDC_ADDRESS = process.env.BASE_USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const CACHE_TTL_MS = 10_000;
const balanceCache = new Map<string, { balance: bigint; ts: number }>();

function getCached(key: string): bigint | null {
  const entry = balanceCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.balance;
  return null;
}

function setCache(key: string, balance: bigint) {
  balanceCache.set(key, { balance, ts: Date.now() });
}

async function checkSolanaBalance(walletAddress: string): Promise<bigint> {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  try {
    const owner = new PublicKey(walletAddress);
    const ata = await getAssociatedTokenAddress(SOLANA_USDC_MINT, owner);
    const connection = new Connection(rpcUrl, "confirmed");
    const account = await getAccount(connection, ata);
    return account.amount;
  } catch {
    return 0n;
  }
}

function ethCall(rpcUrl: string, to: string, data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(rpcUrl);
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    });

    const opts: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
    };

    const mod = url.protocol === "https:" ? require("https") : http;
    const req = mod.request(opts, (res: any) => {
      let body = "";
      res.on("data", (c: string) => (body += c));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.result) resolve(parsed.result);
          else reject(new Error(parsed.error?.message || "eth_call failed"));
        } catch { reject(new Error("Invalid RPC response")); }
      });
    });
    req.on("error", reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error("timeout")); });
    req.write(payload);
    req.end();
  });
}

async function checkBaseBalance(walletAddress: string): Promise<bigint> {
  const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  try {
    const addressPadded = walletAddress.toLowerCase().replace("0x", "").padStart(64, "0");
    // balanceOf(address) selector: 0x70a08231
    const calldata = "0x70a08231" + addressPadded;
    const result = await ethCall(rpcUrl, BASE_USDC_ADDRESS, calldata);
    return BigInt(result);
  } catch {
    return 0n;
  }
}

export async function checkBalance(walletAddress: string, chain: string): Promise<bigint> {
  const cacheKey = `${chain}:${walletAddress}`;
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  const balance = chain === "base"
    ? await checkBaseBalance(walletAddress)
    : await checkSolanaBalance(walletAddress);

  setCache(cacheKey, balance);
  return balance;
}
