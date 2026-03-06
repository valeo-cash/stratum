"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

/* ── Constants ── */

const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Devnet USDC-dev mint — swap to EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v for mainnet
const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);
const USDC_DECIMALS = 6;
const MAX_TRANSFERS_PER_TX = 5;
const POLL_INTERVAL = 10_000;

/* ── Types ── */

interface Transfer {
  from: string;
  to: string;
  amount: number;
}

interface Batch {
  id: string;
  windowId: string;
  chain: string;
  transfers: Transfer[];
  totalVolume: number;
  status: string;
  createdAt: string;
}

interface SettledEntry {
  batchId: string;
  txHashes: string[];
  settledAt: string;
}

type Stage = "login" | "wallet" | "ready";

/* ── Phantom provider type ── */

interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (
    tx: Transaction,
  ) => Promise<{ signature: string }>;
  publicKey: PublicKey | null;
}

function getPhantom(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const sol = (window as any).solana;
  if (sol?.isPhantom) return sol as PhantomProvider;
  return null;
}

/* ── Helpers ── */

function truncateAddress(addr: string) {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

function formatUSDC(microAmount: number) {
  return "$" + (microAmount / 1e6).toFixed(4);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── Component ── */

export default function DashboardClient() {
  const [stage, setStage] = useState<Stage>("login");
  const [apiKey, setApiKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [walletAddress, setWalletAddress] = useState("");
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [walletError, setWalletError] = useState("");

  const [batches, setBatches] = useState<Batch[]>([]);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settleError, setSettleError] = useState("");

  const [autoSettle, setAutoSettle] = useState(false);
  const [settledLog, setSettledLog] = useState<SettledEntry[]>([]);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  const connectionRef = useRef<Connection | null>(null);
  const autoSettleRef = useRef(false);
  const settlingRef = useRef(false);

  useEffect(() => {
    autoSettleRef.current = autoSettle;
  }, [autoSettle]);

  function getConnection() {
    if (!connectionRef.current) {
      connectionRef.current = new Connection(SOLANA_RPC, "confirmed");
    }
    return connectionRef.current;
  }

  /* ── Step 1: Verify API Key ── */

  async function handleVerify() {
    setVerifying(true);
    setLoginError("");
    try {
      const res = await fetch(
        `/api/dashboard/verify?key=${encodeURIComponent(keyInput)}`,
      );
      const data = await res.json();
      if (data.valid) {
        setApiKey(keyInput);
        setStage("wallet");
      } else {
        setLoginError("Invalid API key or insufficient permissions.");
      }
    } catch {
      setLoginError("Could not reach the server.");
    } finally {
      setVerifying(false);
    }
  }

  /* ── Step 2: Connect Phantom ── */

  async function handleConnectWallet() {
    setConnectingWallet(true);
    setWalletError("");
    const phantom = getPhantom();
    if (!phantom) {
      setWalletError(
        "Phantom wallet not found. Please install the Phantom browser extension.",
      );
      setConnectingWallet(false);
      return;
    }
    try {
      const resp = await phantom.connect();
      const addr = resp.publicKey.toBase58();
      setWalletAddress(addr);

      const conn = getConnection();
      try {
        const ata = await getAssociatedTokenAddress(
          USDC_MINT,
          resp.publicKey,
        );
        const account = await getAccount(conn, ata);
        setUsdcBalance(Number(account.amount));
      } catch {
        setUsdcBalance(0);
      }

      setStage("ready");
    } catch (err: any) {
      setWalletError(err?.message || "Failed to connect wallet.");
    } finally {
      setConnectingWallet(false);
    }
  }

  /* ── Step 3: Poll Batches ── */

  const fetchBatches = useCallback(async () => {
    if (!apiKey) return;
    try {
      const res = await fetch(
        `/api/dashboard/batches?key=${encodeURIComponent(apiKey)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches ?? []);
      }
    } catch { /* silent */ }
  }, [apiKey]);

  useEffect(() => {
    if (stage !== "ready") return;
    fetchBatches();
    const id = setInterval(fetchBatches, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [stage, fetchBatches]);

  /* ── Step 4: Settle a Batch ── */

  const settleBatch = useCallback(
    async (batch: Batch) => {
      const phantom = getPhantom();
      if (!phantom?.publicKey) return;
      if (settlingRef.current) return;
      settlingRef.current = true;

      setSettlingId(batch.id);
      setSettleError("");

      try {
        const conn = getConnection();
        const feePayer = phantom.publicKey;
        const allSignatures: string[] = [];

        const chunks: Transfer[][] = [];
        for (let i = 0; i < batch.transfers.length; i += MAX_TRANSFERS_PER_TX) {
          chunks.push(batch.transfers.slice(i, i + MAX_TRANSFERS_PER_TX));
        }

        for (const chunk of chunks) {
          const tx = new Transaction();
          const { blockhash } = await conn.getLatestBlockhash("confirmed");
          tx.recentBlockhash = blockhash;
          tx.feePayer = feePayer;

          for (const t of chunk) {
            const destPubkey = new PublicKey(t.to);
            const sourceAta = await getAssociatedTokenAddress(
              USDC_MINT,
              feePayer,
            );
            const destAta = await getAssociatedTokenAddress(
              USDC_MINT,
              destPubkey,
            );

            // Idempotent ATA creation for destination
            tx.add(
              createAssociatedTokenAccountInstruction(
                feePayer,
                destAta,
                destPubkey,
                USDC_MINT,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
              ),
            );

            tx.add(
              createTransferCheckedInstruction(
                sourceAta,
                USDC_MINT,
                destAta,
                feePayer,
                t.amount,
                USDC_DECIMALS,
              ),
            );
          }

          const { signature } = await phantom.signAndSendTransaction(tx);
          allSignatures.push(signature);
        }

        // Confirm with gateway
        await fetch("/api/dashboard/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: apiKey,
            batchId: batch.id,
            txHashes: allSignatures,
            chain: "solana",
          }),
        });

        setSettledLog((prev) => [
          {
            batchId: batch.id,
            txHashes: allSignatures,
            settledAt: new Date().toISOString(),
          },
          ...prev,
        ]);

        setBatches((prev) => prev.filter((b) => b.id !== batch.id));
      } catch (err: any) {
        setSettleError(err?.message || "Settlement failed.");
      } finally {
        setSettlingId(null);
        settlingRef.current = false;
      }
    },
    [apiKey],
  );

  /* ── Step 5: Auto-Settle ── */

  useEffect(() => {
    if (stage !== "ready" || !autoSettle) return;

    const unsettled = batches.find(
      (b) => !settlingRef.current && b.id !== settlingId,
    );
    if (unsettled) {
      settleBatch(unsettled);
    }
  }, [batches, autoSettle, stage, settlingId, settleBatch]);

  /* ── Render ── */

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <div className="flex items-center justify-between mb-1">
        <h1
          className="text-[#0A0A0A]"
          style={{ fontSize: "1.5rem", fontWeight: 500 }}
        >
          Settlement Dashboard
        </h1>
        {stage === "ready" && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em]">
              Auto-settle
            </span>
            <button
              onClick={() => setAutoSettle(!autoSettle)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                autoSettle ? "bg-[#3B82F6]" : "bg-[#D1D5DB]"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  autoSettle ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>
        )}
      </div>
      <p className="text-[#6B7280] text-sm mb-8">
        Settle pending batches directly from your Phantom wallet.
      </p>

      {/* ── Step 1: API Key Login ── */}
      {stage === "login" && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-8 max-w-md">
          <h2 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
            Facilitator Login
          </h2>
          <label className="block text-sm text-[#374151] mb-2">
            API Key
          </label>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="sk_facilitator_..."
            className="w-full px-3 py-2 border border-[#E5E7EB] rounded-none text-sm font-mono bg-white text-[#0A0A0A] placeholder-[#D1D5DB] focus:outline-none focus:border-[#3B82F6] mb-4"
          />
          {loginError && (
            <p className="text-sm text-[#EF4444] mb-3">{loginError}</p>
          )}
          <button
            onClick={handleVerify}
            disabled={verifying || !keyInput}
            className="px-5 py-2 bg-[#3B82F6] text-white text-sm font-medium rounded-none hover:bg-[#2563EB] disabled:opacity-50 transition-colors"
          >
            {verifying ? "Verifying..." : "Verify & Continue"}
          </button>
        </div>
      )}

      {/* ── Step 2: Connect Wallet ── */}
      {stage === "wallet" && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-8 max-w-md">
          <h2 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
            Connect Wallet
          </h2>
          <p className="text-sm text-[#6B7280] mb-6">
            Connect your Phantom wallet to sign settlement transactions.
            Your private key never leaves your browser.
          </p>
          {walletError && (
            <p className="text-sm text-[#EF4444] mb-3">{walletError}</p>
          )}
          <button
            onClick={handleConnectWallet}
            disabled={connectingWallet}
            className="px-5 py-2 bg-[#3B82F6] text-white text-sm font-medium rounded-none hover:bg-[#2563EB] disabled:opacity-50 transition-colors"
          >
            {connectingWallet ? "Connecting..." : "Connect Phantom"}
          </button>
        </div>
      )}

      {/* ── Step 3+: Ready ── */}
      {stage === "ready" && (
        <>
          {/* Wallet info bar */}
          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-6">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">
                  Wallet
                </p>
                <p className="text-sm font-mono text-[#0A0A0A]">
                  {truncateAddress(walletAddress)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">
                  USDC Balance
                </p>
                <p className="text-sm font-mono text-[#0A0A0A]">
                  {usdcBalance !== null
                    ? formatUSDC(usdcBalance)
                    : "Loading..."}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">
                  Status
                </p>
                {autoSettle ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#1E40AF]">
                    <span className="w-2 h-2 bg-[#3B82F6] rounded-full animate-pulse" />
                    Auto-settling
                  </span>
                ) : (
                  <span className="text-xs font-mono text-[#10B981]">
                    Ready
                  </span>
                )}
              </div>
            </div>
          </div>

          {settleError && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-none p-4 mb-6">
              <p className="text-sm text-[#991B1B]">{settleError}</p>
            </div>
          )}

          {/* Pending Batches */}
          <h2 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
            Pending Batches
            <span className="ml-2 text-[#0A0A0A]">{batches.length}</span>
          </h2>

          {batches.length === 0 && (
            <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-8 text-center">
              <p className="text-sm text-[#9CA3AF]">
                No pending batches. Polling every 10 seconds...
              </p>
            </div>
          )}

          <div className="grid gap-4 mb-8">
            {batches.map((batch) => {
              const isSettling = settlingId === batch.id;
              const isExpanded = expandedBatch === batch.id;
              return (
                <div
                  key={batch.id}
                  className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">
                          Batch
                        </p>
                        <p className="text-sm font-mono text-[#003FFF]">
                          {batch.id.slice(0, 8)}...
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">
                          Window
                        </p>
                        <p className="text-sm font-mono text-[#0A0A0A]">
                          {batch.windowId}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">
                          Created
                        </p>
                        <p className="text-sm font-mono text-[#0A0A0A]">
                          {timeAgo(batch.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">
                          Transfers
                        </p>
                        <p className="text-sm font-mono text-[#0A0A0A]">
                          {batch.transfers.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">
                          Volume
                        </p>
                        <p className="text-sm font-mono text-[#0A0A0A]">
                          {formatUSDC(batch.totalVolume)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isSettling ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#DBEAFE] text-[#1E40AF] text-xs font-mono uppercase tracking-wider">
                          <span className="w-2 h-2 bg-[#3B82F6] rounded-full animate-pulse" />
                          Settling...
                        </span>
                      ) : (
                        <>
                          <span className="px-2 py-1 bg-[#FEF3C7] text-[#92400E] text-[10px] font-mono uppercase tracking-wider">
                            Pending
                          </span>
                          <button
                            onClick={() => settleBatch(batch)}
                            disabled={!!settlingId}
                            className="px-4 py-1.5 bg-[#3B82F6] text-white text-sm font-medium rounded-none hover:bg-[#2563EB] disabled:opacity-50 transition-colors"
                          >
                            Settle
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expandable transfers */}
                  <button
                    onClick={() =>
                      setExpandedBatch(isExpanded ? null : batch.id)
                    }
                    className="text-[11px] font-mono text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
                  >
                    {isExpanded ? "▾ Hide transfers" : "▸ Show transfers"}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 border-t border-[#E5E7EB] pt-3">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]">
                            <th className="pb-2 font-normal">From</th>
                            <th className="pb-2 font-normal">To</th>
                            <th className="pb-2 font-normal text-right">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {batch.transfers.map((t, i) => (
                            <tr
                              key={i}
                              className="border-t border-[#F3F4F6]"
                            >
                              <td className="py-1.5 text-xs font-mono text-[#6B7280]">
                                {truncateAddress(t.from)}
                              </td>
                              <td className="py-1.5 text-xs font-mono text-[#6B7280]">
                                {truncateAddress(t.to)}
                              </td>
                              <td className="py-1.5 text-xs font-mono text-[#0A0A0A] text-right">
                                {formatUSDC(t.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Settled Log */}
          {settledLog.length > 0 && (
            <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
              <h2 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
                Settlement Log
              </h2>
              <div className="max-h-60 overflow-y-auto">
                {settledLog.map((entry, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-4 py-2 border-t border-[#E5E7EB] first:border-0"
                  >
                    <span className="px-2 py-0.5 bg-[#D1FAE5] text-[#065F46] text-[10px] font-mono uppercase tracking-wider">
                      Settled
                    </span>
                    <span className="text-xs font-mono text-[#0A0A0A]">
                      {entry.batchId.slice(0, 8)}...
                    </span>
                    <span className="text-xs font-mono text-[#9CA3AF]">
                      {new Date(entry.settledAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {entry.txHashes.map((sig) => (
                        <a
                          key={sig}
                          href={`https://solscan.io/tx/${sig}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-[#003FFF] hover:underline"
                        >
                          {sig.slice(0, 8)}...
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
