import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const LOW_THRESHOLD = 1_000_000n;      // $1.00 USDC
const CRITICAL_THRESHOLD = 100_000n;   // $0.10 USDC

let lastBalance: bigint | null = null;
let lastStatus: "ok" | "low" | "critical" | "unknown" = "unknown";
let monitorInterval: ReturnType<typeof setInterval> | null = null;

export function getSettlementBalance(): { solana: string; status: string } {
  if (lastBalance === null) {
    return { solana: "unknown", status: "unknown" };
  }
  const usdcStr = (Number(lastBalance) / 1_000_000).toFixed(2);
  return { solana: usdcStr, status: lastStatus };
}

async function checkBalance(): Promise<void> {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  const keyB64 = process.env.SOLANA_SETTLEMENT_KEY;
  const mintStr = process.env.SOLANA_USDC_MINT;

  if (!rpcUrl || !keyB64 || !mintStr) {
    lastStatus = "unknown";
    return;
  }

  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const keypair = Keypair.fromSecretKey(Buffer.from(keyB64, "base64"));
    const mint = new PublicKey(mintStr);
    const ata = await getAssociatedTokenAddress(mint, keypair.publicKey);
    const account = await getAccount(connection, ata);

    lastBalance = account.amount;
    const usdcStr = (Number(lastBalance) / 1_000_000).toFixed(2);

    if (lastBalance < CRITICAL_THRESHOLD) {
      lastStatus = "critical";
      console.error(`[balance-monitor] CRITICAL: $${usdcStr} USDC — settlements will fail`);
    } else if (lastBalance < LOW_THRESHOLD) {
      lastStatus = "low";
      console.warn(`[balance-monitor] LOW BALANCE: $${usdcStr} USDC — settlements may fail`);
    } else {
      lastStatus = "ok";
      console.log(`[balance-monitor] Settlement wallet balance: $${usdcStr} USDC`);
    }
  } catch (err: any) {
    console.error("[balance-monitor] Balance check failed:", err.message ?? err);
    if (lastBalance === null) lastStatus = "unknown";
  }
}

export function startBalanceMonitor(): void {
  checkBalance();

  monitorInterval = setInterval(() => {
    checkBalance();
  }, CHECK_INTERVAL_MS);
  monitorInterval.unref();

  console.log("[balance-monitor] Started (checking every 5 minutes)");
}

export function stopBalanceMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}
