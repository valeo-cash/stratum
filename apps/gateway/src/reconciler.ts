import { Connection } from "@solana/web3.js";
import { prisma } from "./db";

const RECONCILE_INTERVAL_MS = 5 * 60 * 1000;
const LOOKBACK_MS = 60 * 60 * 1000;

let reconcileInterval: ReturnType<typeof setInterval> | null = null;

let lastRunStats = {
  checked: 0,
  reconciled: 0,
  mismatches: 0,
  pending: 0,
  lastRun: null as string | null,
};

export function getReconciliationStats() {
  return { ...lastRunStats };
}

async function verifySolanaTx(txHash: string): Promise<boolean> {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) return false;

  try {
    const conn = new Connection(rpcUrl, "confirmed");
    const tx = await conn.getTransaction(txHash, {
      maxSupportedTransactionVersion: 0,
    });
    return tx !== null && tx.meta !== null && !tx.meta.err;
  } catch (err: any) {
    console.error(`[reconciler] Solana RPC error for ${txHash.slice(0, 20)}:`, err.message);
    return false;
  }
}

async function verifyBaseTx(txHash: string): Promise<boolean> {
  const rpcUrl = process.env.BASE_RPC_URL;
  if (!rpcUrl) return false;

  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
    });
    const json = await res.json() as any;
    if (!json.result) return false;
    return parseInt(json.result.status, 16) === 1;
  } catch (err: any) {
    console.error(`[reconciler] Base RPC error for ${txHash.slice(0, 20)}:`, err.message);
    return false;
  }
}

async function runReconciliation(): Promise<void> {
  const cutoff = new Date(Date.now() - LOOKBACK_MS);

  try {
    const payments = await prisma.intakePayment.findMany({
      where: {
        status: "settled",
        reconciled: false,
        settledAt: { gte: cutoff },
        txHash: { not: null },
      },
      take: 200,
    });

    if (payments.length === 0) {
      const pending = await prisma.intakePayment.count({
        where: { status: "settled", reconciled: false },
      });
      lastRunStats = {
        checked: 0,
        reconciled: lastRunStats.reconciled,
        mismatches: lastRunStats.mismatches,
        pending,
        lastRun: new Date().toISOString(),
      };
      return;
    }

    let reconciled = 0;
    let mismatches = 0;

    for (const payment of payments) {
      const txHash = payment.txHash!;
      const isBase = txHash.startsWith("0x");
      let confirmed: boolean;

      if (isBase) {
        confirmed = await verifyBaseTx(txHash);
      } else {
        confirmed = await verifySolanaTx(txHash);
      }

      if (confirmed) {
        await prisma.intakePayment.update({
          where: { id: payment.id },
          data: { reconciled: true, reconciledAt: new Date() },
        }).catch((e: any) => console.error("[reconciler] DB update failed:", e.message));
        reconciled++;
      } else {
        console.error(
          `[reconciler] MISMATCH: payment ${payment.reference} marked settled but tx ${txHash.slice(0, 24)}... not confirmed on-chain (chain: ${isBase ? "base" : "solana"})`,
        );
        mismatches++;
      }
    }

    const pending = await prisma.intakePayment.count({
      where: { status: "settled", reconciled: false },
    }).catch(() => 0);

    lastRunStats = {
      checked: payments.length,
      reconciled,
      mismatches,
      pending,
      lastRun: new Date().toISOString(),
    };

    console.log(`[reconciler] Checked ${payments.length} payments: ${reconciled} reconciled, ${mismatches} mismatches`);
  } catch (err: any) {
    console.error("[reconciler] Reconciliation run failed:", err.message);
  }
}

export function startReconciler(): void {
  runReconciliation();
  reconcileInterval = setInterval(() => {
    runReconciliation();
  }, RECONCILE_INTERVAL_MS);
  reconcileInterval.unref();
  console.log("[reconciler] Started (checking every 5 minutes)");
}

export function stopReconciler(): void {
  if (reconcileInterval) {
    clearInterval(reconcileInterval);
    reconcileInterval = null;
    console.log("[reconciler] Stopped");
  }
}
