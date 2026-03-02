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

  console.log(`[settlement] Closing window with ${currentWindow.getReceiptCount()} receipts`);

  let windowSettlementResults: BatchSettlementResult[] | undefined;

  const head = await manager.closeAndSettle({
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

      // Execute real settlement transfers if router is configured
      if (settlementRouter && nettingResult.transfers?.length > 0) {
        const netTransfers = mapNettingToNetTransfers(nettingResult, window.windowId as string);

        if (netTransfers.length > 0) {
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
          } catch (err) {
            console.error("[settlement] Real settlement failed, continuing with anchor:", err);
          }
        }
      }

      try {
        await fetch(`${config.facilitator_url}/settle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId: batch.batch_id,
            windowId: batch.window_id as string,
            transfers: batch.instructions.length,
            totalVolume: nettingResult.net_volume.toString(),
          }),
        });
      } catch {
        console.log("[settlement] Mock facilitator unavailable, continuing...");
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

      const anchorRecord: AnchorRecord & { gross_volume: bigint; net_volume: bigint } = {
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

      prisma.gatewayWindow.create({
        data: {
          windowId: window.windowId as string,
          state: "FINALIZED",
          receiptCount: receipts.length,
          grossVolume: grossVolume.toString(),
          netVolume: netting.net_volume.toString(),
          transferCount: netting.transfer_count,
          compressionRatio: netting.compression_ratio === Infinity ? null : netting.compression_ratio,
          merkleRoot: toHex(tree.root),
          anchorTxHash: entry?.anchorTxHash ?? null,
          headSignature: toHex(signed.signature),
          finalizedAt: new Date(),
        },
      }).catch((e) => console.error("[settlement] DB window write failed:", e.message));

      return signed;
    },
  });

  windowSettlementResults = undefined;
  return head;
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
