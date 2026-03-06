import {
  WindowManager,
  createAccountId,
  createFacilitatorId,
  type StratumConfig,
  type SignedReceipt,
  type AnchorRecord,
  type SignedWindowHead,
} from "@valeo/stratum-core";
import { hashReceipt } from "@valeo/stratum-receipts";
import { StratumMerkleTree, createSignedWindowHead, hashWindowHead } from "@valeo/stratum-merkle";
import { computeMultilateralNetting, createSettlementBatch } from "@valeo/stratum-netting";
import { MockAnchor, SolanaAnchor, type ChainAnchor } from "@valeo/stratum-anchor";
import {
  SettlementRouter,
  SolanaSettlement,
  BaseSettlement,
  type NetTransfer,
  type BatchSettlementResult,
} from "@valeo/stratum-settlement";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getGatewayPrivateKey, getGatewayPublicKey, toHex } from "./crypto";
import { listServices } from "./registry";
import { prisma } from "./db";
import { notifyFacilitators } from "./webhook";

const config: StratumConfig = {
  version: 1,
  settlement_window_seconds: parseInt(process.env.SETTLEMENT_INTERVAL_SECONDS || "60", 10),
  chain: "solana",
  asset: "USDC",
  facilitator_url: process.env.FACILITATOR_URL || "http://localhost:3200",
  risk_controls_enabled: false,
};

const manager = new WindowManager(config);

function createAnchor(): ChainAnchor {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  const programId = process.env.ANCHOR_PROGRAM_ID;
  const privateKeyB64 = process.env.SOLANA_PRIVATE_KEY;

  if (rpcUrl && programId && privateKeyB64) {
    const keypair = Keypair.fromSecretKey(Buffer.from(privateKeyB64, "base64"));
    console.log(`[settlement] Using SolanaAnchor (program: ${programId.slice(0, 8)}..., cluster: ${rpcUrl})`);
    return new SolanaAnchor({ rpcUrl, programId, keypair });
  }

  console.log("[settlement] SOLANA_RPC_URL / ANCHOR_PROGRAM_ID / SOLANA_PRIVATE_KEY not set — using MockAnchor");
  return new MockAnchor();
}

function createSettlementRouter(): SettlementRouter | null {
  let solana: SolanaSettlement | undefined;
  let base: BaseSettlement | undefined;

  const solRpc = process.env.SOLANA_RPC_URL;
  const solKeyB64 = process.env.SOLANA_SETTLEMENT_KEY;
  const solMint = process.env.SOLANA_USDC_MINT;

  if (solRpc && solKeyB64 && solMint) {
    const connection = new Connection(solRpc, "confirmed");
    const keypair = Keypair.fromSecretKey(Buffer.from(solKeyB64, "base64"));
    const mint = new PublicKey(solMint);
    solana = new SolanaSettlement(connection, keypair, mint);
    console.log(`[settlement] SolanaSettlement configured (delegate: ${keypair.publicKey.toBase58().slice(0, 12)}...)`);
  }

  const baseRpc = process.env.BASE_RPC_URL;
  const baseKey = process.env.BASE_SETTLEMENT_KEY as `0x${string}` | undefined;
  const baseUsdc = process.env.BASE_USDC_ADDRESS as `0x${string}` | undefined;

  if (baseRpc && baseKey && baseUsdc) {
    base = new BaseSettlement({
      rpcUrl: baseRpc,
      privateKey: baseKey,
      usdcAddress: baseUsdc,
      testnet: baseRpc.includes("sepolia"),
    });
    console.log(`[settlement] BaseSettlement configured (rpc: ${baseRpc.slice(0, 30)}...)`);
  }

  if (!solana && !base) {
    console.log("[settlement] No settlement chains configured — using mock facilitator only");
    return null;
  }

  return new SettlementRouter({ solana, base });
}

const anchor = createAnchor();
const settlementRouter = createSettlementRouter();

export function getSettlementRouter(): SettlementRouter | null {
  return settlementRouter;
}

export function getAnchor(): ChainAnchor {
  return anchor;
}

const allReceipts: SignedReceipt[] = [];
const finalizedWindows: Array<{
  windowId: string;
  head: SignedWindowHead;
  merkleRoot: Uint8Array;
  anchorTxHash: string;
  receiptCount: number;
  receipts: SignedReceipt[];
  settlementResults?: BatchSettlementResult[];
}> = [];

let previousHeadHash: Uint8Array | null = null;
let currentBatchId: string | null = null;
let lastSettlementTime: Date | null = null;

export function getLastSettlementTime(): Date | null {
  return lastSettlementTime;
}

export function submitReceipt(signed: SignedReceipt) {
  allReceipts.push(signed);
  const result = manager.submitReceipt(signed);

  prisma.gatewayReceipt.create({
    data: {
      receiptId: signed.receipt.receipt_id as string,
      windowId: signed.receipt.window_id as string,
      sequence: signed.receipt.sequence,
      payerAddress: signed.receipt.payer as string,
      payeeAddress: signed.receipt.payee as string,
      amount: signed.receipt.amount.toString(),
      asset: signed.receipt.asset,
      resourceHash: toHex(signed.receipt.resource_hash),
      receiptHash: toHex(hashReceipt(signed)),
      signature: toHex(signed.signature),
      signerPubKey: toHex(signed.signer_public_key),
      nonce: signed.receipt.nonce,
    },
  }).catch((e) => console.error("[settlement] DB receipt write failed:", e.message));

  return result;
}

export function getReceiptStore(): SignedReceipt[] {
  return allReceipts;
}

export function getFinalizedWindows() {
  return finalizedWindows;
}

export function getCurrentWindowInfo() {
  const current = manager.getCurrentWindow();
  return {
    windowId: current.windowId as string,
    state: current.getState(),
    receiptCount: current.getReceiptCount(),
  };
}

/**
 * Map netting transfers to NetTransfer[] with chain info from service registry.
 * Falls back to "solana" if no service config found.
 */
function mapNettingToNetTransfers(
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

export async function runSettlementCycle(): Promise<SignedWindowHead | null> {
  const currentWindow = manager.getCurrentWindow();
  if (currentWindow.getReceiptCount() === 0) {
    return null;
  }

  const windowId = currentWindow.windowId as string;
  const receiptCount = currentWindow.getReceiptCount();
  const receipts = currentWindow.getReceipts();
  let grossVolumeCalc = 0n;
  for (const r of receipts) grossVolumeCalc += r.receipt.amount;

  console.log(`[settlement] Closing window with ${receiptCount} receipts`);

  try {
    await prisma.gatewayWindow.upsert({
      where: { windowId },
      create: {
        windowId,
        state: "closing",
        receiptCount,
        grossVolume: grossVolumeCalc.toString(),
      },
      update: {
        state: "closing",
        receiptCount,
        grossVolume: grossVolumeCalc.toString(),
      },
    });
  } catch (e: any) {
    console.error("[settlement] Failed to persist closing window:", e.message);
  }

  let windowSettlementResults: BatchSettlementResult[] | undefined;

  let head: SignedWindowHead;
  try {
  head = await manager.closeAndSettle({
    computeNetting: (window) => {
      const receipts = window.getReceipts();
      const positions = new Map<string, Map<string, bigint>>();

      for (const sr of receipts) {
        const payer = sr.receipt.payer as string;
        const payee = sr.receipt.payee as string;
        const amount = sr.receipt.amount;

        if (!positions.has(payer)) positions.set(payer, new Map());
        const payerMap = positions.get(payer)!;
        payerMap.set(payee, (payerMap.get(payee) ?? 0n) + amount);
      }

      return computeMultilateralNetting({
        window_id: window.windowId,
        positions,
      });
    },

    submitBatch: async (window, nettingResult: any) => {
      const receipts = window.getReceipts();
      const hashes = receipts.map((r) => hashReceipt(r));
      const tree = new StratumMerkleTree(hashes);

      const batch = createSettlementBatch(
        nettingResult,
        window.windowId,
        tree.root,
        "mock-facilitator",
      );

      const netTransfers = nettingResult.transfers?.length > 0
        ? mapNettingToNetTransfers(nettingResult, window.windowId as string)
        : [];

      const primaryChain = netTransfers.length > 0 ? netTransfers[0].chain : "solana";

      // Create SettlementBatch record in DB
      let dbBatch: { id: string } | null = null;
      try {
        dbBatch = await prisma.settlementBatch.create({
          data: {
            windowId: window.windowId as string,
            chain: primaryChain,
            transfers: JSON.stringify(netTransfers.map((t) => ({
              from: t.from,
              to: t.to,
              amount: t.amount.toString(),
              chain: t.chain,
            }))),
            totalVolume: nettingResult.net_volume?.toString() ?? "0",
            status: "pending",
          },
        });
        currentBatchId = dbBatch.id;
        console.log(`[settlement] Created batch ${dbBatch.id} (${netTransfers.length} transfers)`);
      } catch (e: any) {
        console.error("[settlement] Failed to create batch record:", e.message);
      }

      // Try webhook delivery to facilitators
      let webhookDelivered = false;
      if (dbBatch && netTransfers.length > 0) {
        const receipts = window.getReceipts();
        const whHashes = receipts.map((r) => hashReceipt(r));
        const whTree = new StratumMerkleTree(whHashes);

        webhookDelivered = await notifyFacilitators(dbBatch.id, primaryChain, {
          batch_id: dbBatch.id,
          window_id: window.windowId as string,
          chain: primaryChain,
          merkle_root: toHex(whTree.root),
          anchor_tx: null,
          transfers: netTransfers.map((t) => ({
            from: t.from,
            to: t.to,
            amount: t.amount.toString(),
            chain: t.chain,
          })),
          total_volume: nettingResult.net_volume?.toString() ?? "0",
        });
      }

      // If no webhook handled it, try direct settlement or log
      if (!webhookDelivered && netTransfers.length > 0) {
        if (settlementRouter) {
          try {
            const results = await settlementRouter.executeBatch(netTransfers);
            windowSettlementResults = results;

            for (const r of results) {
              for (const t of r.transfers) {
                const amountUSDC = (Number(t.amount) / 1_000_000).toFixed(6);
                if (t.status === "confirmed") {
                  console.log(`[settlement] Transfer: ${amountUSDC} USDC from ${t.from.slice(0, 12)}... to ${t.to.slice(0, 12)}... on ${r.chain} (tx: ${t.txHash.slice(0, 16)}...)`);
                } else {
                  console.log(`[settlement] Transfer FAILED: ${amountUSDC} USDC from ${t.from.slice(0, 12)}... to ${t.to.slice(0, 12)}... on ${r.chain}: ${t.error}`);
                }
              }
            }

            const solCount = results.filter((r) => r.chain === "solana").reduce((s, r) => s + r.transfers.length, 0);
            const baseCount = results.filter((r) => r.chain === "base").reduce((s, r) => s + r.transfers.length, 0);
            const totalSettled = results.reduce((s, r) => s + r.totalVolume, 0n);
            const totalUSDC = (Number(totalSettled) / 1_000_000).toFixed(2);

            const parts: string[] = [];
            if (solCount > 0) parts.push(`solana (${solCount})`);
            if (baseCount > 0) parts.push(`base (${baseCount})`);

            console.log(`[settlement] Settled ${solCount + baseCount} transfers on ${parts.join(" + ")}, total $${totalUSDC} USDC`);

            if (dbBatch) {
              prisma.settlementBatch.update({
                where: { id: dbBatch.id },
                data: { status: "settled" },
              }).catch((e) => console.error("[settlement] Failed to update batch status:", e.message));
            }
          } catch (err) {
            console.error("[settlement] Real settlement failed, continuing with anchor:", err);
          }
        } else {
          const volUSDC = (Number(nettingResult.net_volume ?? 0n) / 1_000_000).toFixed(2);
          console.log(`[settlement] No facilitator webhooks or settlement chains configured — ${netTransfers.length} net transfers ($${volUSDC} USDC) recorded but not settled`);
        }
      }

      return batch;
    },

    anchorRoot: async (window) => {
      const receipts = window.getReceipts();
      const hashes = receipts.map((r) => hashReceipt(r));
      const tree = new StratumMerkleTree(hashes);

      let grossVolume = 0n;
      for (const r of receipts) grossVolume += r.receipt.amount;

      const nettingPositions = new Map<string, Map<string, bigint>>();
      for (const sr of receipts) {
        const payer = sr.receipt.payer as string;
        const payee = sr.receipt.payee as string;
        if (!nettingPositions.has(payer)) nettingPositions.set(payer, new Map());
        nettingPositions.get(payer)!.set(payee, (nettingPositions.get(payer)!.get(payee) ?? 0n) + sr.receipt.amount);
      }
      const anchorNetting = computeMultilateralNetting({ window_id: window.windowId, positions: nettingPositions });

      const services = listServices();
      const serviceSet = new Set<string>();
      for (const sr of receipts) {
        const payee = sr.receipt.payee as string;
        for (const svc of services) {
          if (svc.walletAddress === payee || Object.values(svc.wallets).includes(payee)) {
            serviceSet.add(svc.slug);
            break;
          }
        }
      }

      const compressionVal = anchorNetting.transfer_count > 0
        ? (receipts.length / anchorNetting.transfer_count).toFixed(1) + "x"
        : "1x";

      const memo = JSON.stringify({
        protocol: "stratum-x402",
        version: "1",
        window: window.windowId as string,
        grossReceipts: receipts.length,
        grossVolume: grossVolume.toString(),
        netTransfers: anchorNetting.transfer_count,
        netVolume: anchorNetting.net_volume.toString(),
        compression: compressionVal,
        services: Array.from(serviceSet),
      });

      const anchorRecord: AnchorRecord & { gross_volume: bigint; net_volume: bigint; memo: string } = {
        version: 1,
        chain: "solana",
        tx_hash: new Uint8Array(32),
        block_number: 0,
        window_id: window.windowId,
        merkle_root: tree.root,
        receipt_count: receipts.length,
        timestamp: Date.now(),
        gross_volume: grossVolume,
        net_volume: anchorNetting.net_volume,
        memo,
      };

      const result = await anchor.anchor(anchorRecord);
      anchorRecord.tx_hash = new TextEncoder().encode(result.txHash.slice(0, 32).padEnd(32, "\0"));
      anchorRecord.block_number = result.blockNumber;

      if (result.txHash.startsWith("already-anchored:")) {
        console.log(`[settlement] Window already anchored on-chain (idempotent)`);
      } else {
        console.log(`[settlement] Anchored on Solana: https://explorer.solana.com/tx/${result.txHash}?cluster=devnet`);
      }

      finalizedWindows.push({
        windowId: window.windowId as string,
        head: null as any,
        merkleRoot: tree.root,
        anchorTxHash: result.txHash,
        receiptCount: receipts.length,
        receipts: [...receipts],
        settlementResults: windowSettlementResults,
      });

      if (currentBatchId) {
        prisma.settlementBatch.update({
          where: { id: currentBatchId },
          data: { anchorTxHash: result.txHash },
        }).catch((e) => console.error("[settlement] Failed to update batch anchorTxHash:", e.message));
      }

      prisma.gatewayWindow.update({
        where: { windowId: window.windowId as string },
        data: { state: "anchored", anchorTxHash: result.txHash, merkleRoot: toHex(tree.root) },
      }).catch((e) => console.error("[settlement] Failed to update window to anchored:", e.message));

      return anchorRecord;
    },

    signHead: async (window) => {
      const receipts = window.getReceipts();
      const hashes = receipts.map((r) => hashReceipt(r));
      const tree = new StratumMerkleTree(hashes);

      let grossVolume = 0n;
      for (const r of receipts) grossVolume += r.receipt.amount;

      const nettingPositions = new Map<string, Map<string, bigint>>();
      for (const sr of receipts) {
        const payer = sr.receipt.payer as string;
        const payee = sr.receipt.payee as string;
        if (!nettingPositions.has(payer)) nettingPositions.set(payer, new Map());
        nettingPositions.get(payer)!.set(payee, (nettingPositions.get(payer)!.get(payee) ?? 0n) + sr.receipt.amount);
      }
      const netting = computeMultilateralNetting({ window_id: window.windowId, positions: nettingPositions });

      const signed = await createSignedWindowHead({
        windowId: window.windowId,
        receiptCount: receipts.length,
        merkleRoot: tree.root,
        totalVolumeGross: grossVolume,
        totalVolumeNet: netting.net_volume,
        compressionRatio: netting.compression_ratio,
        previousWindowHeadHash: previousHeadHash,
        signerPrivateKey: getGatewayPrivateKey(),
      });

      const entry = finalizedWindows.find((w) => w.windowId === (window.windowId as string));
      if (entry) entry.head = signed;

      previousHeadHash = hashWindowHead(signed);

      console.log(`[settlement] Window ${window.windowId} finalized: ${receipts.length} receipts, root=${toHex(tree.root).slice(0, 16)}...`);

      const windowData = {
        state: "settled",
        receiptCount: receipts.length,
        grossVolume: grossVolume.toString(),
        netVolume: netting.net_volume.toString(),
        transferCount: netting.transfer_count,
        compressionRatio: netting.compression_ratio === Infinity ? null : netting.compression_ratio,
        merkleRoot: toHex(tree.root),
        anchorTxHash: entry?.anchorTxHash ?? null,
        headSignature: toHex(signed.signature),
        nettingData: JSON.stringify({
          transfers: netting.transfers.map((t: any) => ({
            ...t,
            amount: t.amount.toString(),
          })),
          net_volume: netting.net_volume.toString(),
          compression_ratio: netting.compression_ratio,
          transfer_count: netting.transfer_count,
        }),
        finalizedAt: new Date(),
      };

      prisma.gatewayWindow.upsert({
        where: { windowId: window.windowId as string },
        create: { windowId: window.windowId as string, ...windowData },
        update: windowData,
      }).catch((e) => console.error("[settlement] DB window write failed:", e.message));

      return signed;
    },
  });
  } catch (err) {
    console.error(`[settlement] Settlement cycle failed for window ${windowId}, will retry on next startup:`, err);
    return null;
  }

  lastSettlementTime = new Date();
  windowSettlementResults = undefined;
  return head;
}

export async function persistCurrentWindow(): Promise<void> {
  const current = manager.getCurrentWindow();
  const count = current.getReceiptCount();
  if (count === 0) return;

  const windowId = current.windowId as string;
  const receipts = current.getReceipts();
  let grossVolume = 0n;
  for (const r of receipts) grossVolume += r.receipt.amount;

  try {
    await prisma.gatewayWindow.upsert({
      where: { windowId },
      create: {
        windowId,
        state: "closing",
        receiptCount: count,
        grossVolume: grossVolume.toString(),
      },
      update: {
        state: "closing",
        receiptCount: count,
        grossVolume: grossVolume.toString(),
      },
    });
    console.log(`[settlement] Persisted current window ${windowId} (${count} receipts) for recovery`);
  } catch (e: any) {
    console.error("[settlement] Failed to persist current window:", e.message);
  }
}

let settlementInterval: ReturnType<typeof setInterval> | null = null;

export function startSettlementLoop() {
  const intervalMs = config.settlement_window_seconds * 1000;
  console.log(`[settlement] Starting loop (every ${config.settlement_window_seconds}s)`);

  settlementInterval = setInterval(async () => {
    try {
      await runSettlementCycle();
    } catch (err) {
      console.error("[settlement] Cycle error:", err);
    }
  }, intervalMs);
  settlementInterval.unref();
}

export function stopSettlementLoop() {
  if (settlementInterval) {
    clearInterval(settlementInterval);
    settlementInterval = null;
  }
}
