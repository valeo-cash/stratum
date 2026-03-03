import { prisma } from "./db";
import { getAnchor, getSettlementRouter } from "./settlement";
import { notifyFacilitators } from "./webhook";
import { hashReceipt } from "@valeo/stratum-receipts";
import { StratumMerkleTree } from "@valeo/stratum-merkle";
import { computeMultilateralNetting } from "@valeo/stratum-netting";
import {
  type SignedReceipt,
  type AnchorRecord,
  createWindowId,
  createReceiptId,
  createAccountId,
  createFacilitatorId,
} from "@valeo/stratum-core";
import type { NetTransfer } from "@valeo/stratum-settlement";
import { listServices } from "./registry";
import { toHex } from "./crypto";

const ANCHOR_BACKOFF = [1000, 5000, 25000, 120_000, 600_000];
const WEBHOOK_MAX_RETRIES = 3;

let pendingRetryCount = 0;

export function getPendingRetryCount(): number {
  return pendingRetryCount;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function reconstructReceiptsFromDb(
  dbReceipts: Array<{
    receiptId: string;
    windowId: string;
    sequence: number;
    payerAddress: string;
    payeeAddress: string;
    amount: string;
    asset: string;
    resourceHash: string;
    receiptHash: string;
    signature: string;
    signerPubKey: string;
    nonce: string;
  }>,
): SignedReceipt[] {
  return dbReceipts.map((r) => ({
    version: 1,
    receipt: {
      version: 1,
      receipt_id: createReceiptId(r.receiptId),
      window_id: createWindowId(r.windowId),
      sequence: r.sequence,
      payer: createAccountId(r.payerAddress),
      payee: createAccountId(r.payeeAddress),
      amount: BigInt(r.amount),
      asset: r.asset,
      resource_hash: Buffer.from(r.resourceHash, "hex"),
      idempotency_key: new Uint8Array(32),
      timestamp: 0,
      facilitator_id: createFacilitatorId("gateway"),
      nonce: r.nonce,
    },
    signature: Buffer.from(r.signature, "hex"),
    signer_public_key: Buffer.from(r.signerPubKey, "hex"),
  }));
}

function mapTransfersToNetTransfers(
  nettingResult: any,
  windowId: string,
): NetTransfer[] {
  const transfers: NetTransfer[] = [];
  if (!nettingResult.transfers) return transfers;

  for (const t of nettingResult.transfers) {
    const payee = t.to || t.payee;
    let chain: "solana" | "base" = "solana";

    const services = listServices();
    for (const svc of services) {
      const walletValues = Object.values(svc.wallets);
      if (svc.walletAddress === payee || walletValues.includes(payee)) {
        chain = svc.chains[0] || "solana";
        break;
      }
    }

    transfers.push({
      from: t.from || t.payer,
      to: payee,
      amount: BigInt(t.amount),
      windowId,
      chain,
    });
  }

  return transfers;
}

async function retryAnchor(
  windowId: string,
  receipts: SignedReceipt[],
): Promise<{ txHash: string; success: boolean }> {
  const anchor = getAnchor();
  const hashes = receipts.map((r) => hashReceipt(r));
  const tree = new StratumMerkleTree(hashes);

  let grossVolume = 0n;
  for (const r of receipts) grossVolume += r.receipt.amount;

  const positions = new Map<string, Map<string, bigint>>();
  for (const sr of receipts) {
    const payer = sr.receipt.payer as string;
    const payee = sr.receipt.payee as string;
    if (!positions.has(payer)) positions.set(payer, new Map());
    positions.get(payer)!.set(payee, (positions.get(payer)!.get(payee) ?? 0n) + sr.receipt.amount);
  }
  const wid = createWindowId(windowId);
  const netting = computeMultilateralNetting({ window_id: wid, positions });

  const anchorRecord: AnchorRecord & { gross_volume: bigint; net_volume: bigint } = {
    version: 1,
    chain: "solana",
    tx_hash: new Uint8Array(32),
    block_number: 0,
    window_id: wid,
    merkle_root: tree.root,
    receipt_count: receipts.length,
    timestamp: Date.now(),
    gross_volume: grossVolume,
    net_volume: netting.net_volume,
  };

  for (let attempt = 0; attempt < ANCHOR_BACKOFF.length; attempt++) {
    try {
      const result = await anchor.anchor(anchorRecord);
      if (result.txHash.startsWith("already-anchored:")) {
        console.log(`[retry] Window ${windowId} already anchored on-chain (idempotent)`);
      } else {
        console.log(`[retry] Anchored ${windowId} on Solana: https://explorer.solana.com/tx/${result.txHash}?cluster=devnet`);
      }
      return { txHash: result.txHash, success: true };
    } catch (err) {
      console.error(`[retry] Anchor attempt ${attempt + 1}/${ANCHOR_BACKOFF.length} for ${windowId} failed:`, err);
      if (attempt < ANCHOR_BACKOFF.length - 1) {
        await sleep(ANCHOR_BACKOFF[attempt]);
      }
    }
  }

  return { txHash: "", success: false };
}

async function retrySettlement(
  windowId: string,
  nettingData: any,
): Promise<boolean> {
  const router = getSettlementRouter();
  if (!router) return true;

  const netTransfers = mapTransfersToNetTransfers(nettingData, windowId);
  if (netTransfers.length === 0) return true;

  try {
    const results = await router.executeBatch(netTransfers);

    for (const r of results) {
      for (const t of r.transfers) {
        const amountUSDC = (Number(t.amount) / 1_000_000).toFixed(6);
        if (t.status === "confirmed") {
          console.log(`[retry] Transfer: ${amountUSDC} USDC from ${t.from.slice(0, 12)}... to ${t.to.slice(0, 12)}... on ${r.chain}`);
        } else {
          console.log(`[retry] Transfer FAILED: ${amountUSDC} USDC on ${r.chain}: ${t.error}`);
        }
      }
    }

    const allSuccess = results.every((r) => r.allSucceeded);
    return allSuccess;
  } catch (err) {
    console.error(`[retry] USDC settlement failed for ${windowId}:`, err);
    return false;
  }
}

async function retryClosingWindow(window: {
  windowId: string;
  nettingData: string | null;
}): Promise<void> {
  console.log(`[retry] Retrying closing window: ${window.windowId}`);

  const dbReceipts = await prisma.gatewayReceipt.findMany({
    where: { windowId: window.windowId },
  });

  if (dbReceipts.length === 0) {
    console.log(`[retry] No receipts found for ${window.windowId}, marking failed`);
    await prisma.gatewayWindow.update({
      where: { windowId: window.windowId },
      data: { state: "failed" },
    });
    return;
  }

  const receipts = reconstructReceiptsFromDb(dbReceipts);

  // Retry anchor
  const anchorResult = await retryAnchor(window.windowId, receipts);
  if (!anchorResult.success) {
    console.error(`[retry] All anchor retries exhausted for ${window.windowId}, marking failed`);
    await prisma.gatewayWindow.update({
      where: { windowId: window.windowId },
      data: { state: "failed" },
    });
    return;
  }

  await prisma.gatewayWindow.update({
    where: { windowId: window.windowId },
    data: { state: "anchored", anchorTxHash: anchorResult.txHash },
  });

  // Retry USDC settlement
  const nettingData = window.nettingData ? JSON.parse(window.nettingData) : null;
  if (nettingData) {
    const settled = await retrySettlement(window.windowId, nettingData);
    if (!settled) {
      console.error(`[retry] USDC settlement failed for ${window.windowId}, requires manual intervention`);
      await prisma.gatewayWindow.update({
        where: { windowId: window.windowId },
        data: { state: "failed" },
      });
      return;
    }
  }

  await prisma.gatewayWindow.update({
    where: { windowId: window.windowId },
    data: { state: "settled", finalizedAt: new Date() },
  });

  console.log(`[retry] Window ${window.windowId} recovered successfully`);
}

async function retryAnchoredWindow(window: {
  windowId: string;
  nettingData: string | null;
}): Promise<void> {
  console.log(`[retry] Retrying anchored window (USDC settlement): ${window.windowId}`);

  const nettingData = window.nettingData ? JSON.parse(window.nettingData) : null;
  if (!nettingData) {
    console.log(`[retry] No netting data for ${window.windowId}, marking settled`);
    await prisma.gatewayWindow.update({
      where: { windowId: window.windowId },
      data: { state: "settled", finalizedAt: new Date() },
    });
    return;
  }

  const settled = await retrySettlement(window.windowId, nettingData);
  if (!settled) {
    console.error(`[retry] USDC settlement failed for ${window.windowId}, requires manual intervention`);
    await prisma.gatewayWindow.update({
      where: { windowId: window.windowId },
      data: { state: "failed" },
    });
    return;
  }

  await prisma.gatewayWindow.update({
    where: { windowId: window.windowId },
    data: { state: "settled", finalizedAt: new Date() },
  });

  console.log(`[retry] Window ${window.windowId} recovered successfully`);
}

export async function retryPendingWindows(): Promise<void> {
  let stuckWindows;
  try {
    stuckWindows = await prisma.gatewayWindow.findMany({
      where: { state: { in: ["closing", "anchored"] } },
      orderBy: { openedAt: "asc" },
    });
  } catch (e: any) {
    console.error("[retry] Failed to query stuck windows:", e.message);
    return;
  }

  if (stuckWindows.length === 0) {
    console.log("[retry] No stuck windows found — clean startup");
    return;
  }

  pendingRetryCount = stuckWindows.length;
  console.log(`[retry] Found ${stuckWindows.length} stuck window(s), retrying...`);

  for (const w of stuckWindows) {
    try {
      if (w.state === "closing") {
        await retryClosingWindow(w);
      } else if (w.state === "anchored") {
        await retryAnchoredWindow(w);
      }
    } catch (err) {
      console.error(`[retry] Unexpected error retrying ${w.windowId}:`, err);
      await prisma.gatewayWindow.update({
        where: { windowId: w.windowId },
        data: { state: "failed" },
      }).catch(() => {});
    }

    pendingRetryCount--;
  }

  console.log("[retry] All pending retries processed");
}
