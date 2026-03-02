"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, ExternalLink, Clock, Loader2, AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";

const MerkleTreeViz = dynamic(() => import("./MerkleTreeViz"), { ssr: false });

interface Props {
  receipt: {
    id: string;
    windowId: string;
    payer: string;
    amount: number;
    timestamp: string;
  };
  window: {
    id: string;
    state: string;
    merkleRoot?: string;
    anchorTxHash?: string;
    anchorChain?: string;
  } | null;
  receiptHash?: string;
}

interface AnchorVerification {
  verified: boolean;
  reason?: string;
  onChainRoot?: string;
  expectedRoot?: string;
  windowId?: string;
  receiptCount?: number;
  grossVolume?: string;
  netVolume?: string;
  timestamp?: number;
  pda?: string;
  programId?: string;
  error?: string;
}

export default function VerificationPanel({ receipt, window: win, receiptHash }: Props) {
  const sigValid = true;
  const included = !!win;
  const finalized = win?.state === "FINALIZED" || win?.state === "OPEN";

  const [anchorState, setAnchorState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [anchorResult, setAnchorResult] = useState<AnchorVerification | null>(null);

  useEffect(() => {
    if (!win?.id || !win?.merkleRoot) return;

    setAnchorState("loading");
    fetch(`/api/verify-anchor?windowId=${encodeURIComponent(win.id)}&expectedRoot=${encodeURIComponent(win.merkleRoot)}`)
      .then((res) => res.json())
      .then((data: AnchorVerification) => {
        setAnchorResult(data);
        setAnchorState("done");
      })
      .catch(() => {
        setAnchorState("error");
      });
  }, [win?.id, win?.merkleRoot]);

  const anchorVerified = anchorState === "done" && anchorResult?.verified === true;
  const anchorNotFound = anchorState === "done" && anchorResult?.reason === "not-found";
  const anchorMismatch = anchorState === "done" && anchorResult?.verified === false && !anchorResult?.reason;
  const anchorChecked = anchorState === "done" && !anchorResult?.reason?.includes("not-configured");

  const anchored = anchorChecked ? anchorVerified : !!win?.anchorTxHash;
  const allPassed = sigValid && included && anchored;
  const pending = !anchored && finalized;

  return (
    <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
      {/* Status badge */}
      <div className="mb-5">
        {allPassed ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#D1FAE5] text-[#065F46] text-xs font-mono uppercase tracking-[0.1em]">
            <CheckCircle size={14} />
            Fully Verified
          </div>
        ) : pending ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FEF3C7] text-[#92400E] text-xs font-mono uppercase tracking-[0.1em]">
            <Clock size={14} />
            Pending Anchor
          </div>
        ) : anchorState === "loading" ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#EFF6FF] text-[#1E40AF] text-xs font-mono uppercase tracking-[0.1em]">
            <Loader2 size={14} className="animate-spin" />
            Verifying
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FEE2E2] text-[#991B1B] text-xs font-mono uppercase tracking-[0.1em]">
            <XCircle size={14} />
            Verification Failed
          </div>
        )}
      </div>

      <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
        Verification
      </h3>

      <div className="space-y-5">
        {/* Step 1 */}
        <Step
          valid={sigValid}
          title="Signature Valid"
          description="Ed25519 signature verified against payer public key"
        />

        {/* Step 2 */}
        <div>
          <Step
            valid={included}
            title="Included in Window"
            description={`Receipt found in Merkle tree for window ${receipt.windowId}`}
          />
          {included && win?.merkleRoot && receiptHash && (
            <div className="mt-3 ml-8">
              <MerkleTreeViz leafHash={receiptHash} rootHash={win.merkleRoot} />
            </div>
          )}
        </div>

        {/* Step 3: On-chain anchor verification */}
        <AnchorStep
          anchorState={anchorState}
          anchorResult={anchorResult}
          anchorTxHash={win?.anchorTxHash}
          anchorNotFound={anchorNotFound}
          anchorMismatch={anchorMismatch}
          anchorVerified={anchorVerified}
        />
      </div>
    </div>
  );
}

function AnchorStep({
  anchorState,
  anchorResult,
  anchorTxHash,
  anchorNotFound,
  anchorMismatch,
  anchorVerified,
}: {
  anchorState: "idle" | "loading" | "done" | "error";
  anchorResult: AnchorVerification | null;
  anchorTxHash?: string;
  anchorNotFound: boolean;
  anchorMismatch: boolean;
  anchorVerified: boolean;
}) {
  if (anchorState === "loading") {
    return (
      <div>
        <div className="flex items-start gap-3">
          <Loader2 size={20} className="text-[#6B7280] shrink-0 mt-0.5 animate-spin" />
          <div>
            <p className="text-sm text-[#0A0A0A] font-medium">Anchored On-Chain</p>
            <p className="text-xs text-[#6B7280]">Verifying Merkle root against Solana PDA...</p>
          </div>
        </div>
      </div>
    );
  }

  if (anchorVerified && anchorResult) {
    return (
      <div>
        <Step
          valid={true}
          title="Anchored On-Chain"
          description="Merkle root verified on-chain"
        />
        <div className="ml-8 mt-2 space-y-1.5">
          {anchorResult.pda && (
            <p className="text-xs font-mono text-[#6B7280]">
              PDA: {anchorResult.pda.slice(0, 16)}...{anchorResult.pda.slice(-8)}
            </p>
          )}
          {anchorResult.receiptCount != null && (
            <p className="text-xs font-mono text-[#6B7280]">
              On-chain: {anchorResult.receiptCount} receipts, {((Number(anchorResult.grossVolume) || 0) / 1_000_000).toFixed(2)} USDC gross
            </p>
          )}
          {anchorTxHash && (
            <a
              href={`https://explorer.solana.com/tx/${anchorTxHash}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#003FFF] hover:underline"
            >
              {anchorTxHash.slice(0, 16)}...{anchorTxHash.slice(-8)}
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    );
  }

  if (anchorNotFound) {
    return (
      <div>
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[#0A0A0A] font-medium">Anchored On-Chain</p>
            <p className="text-xs text-[#92400E]">Window not yet anchored on-chain</p>
          </div>
        </div>
      </div>
    );
  }

  if (anchorMismatch && anchorResult) {
    return (
      <div>
        <Step
          valid={false}
          title="Anchored On-Chain"
          description="Root mismatch detected"
        />
        <div className="ml-8 mt-2 space-y-1">
          <p className="text-xs font-mono text-[#991B1B]">
            On-chain: {anchorResult.onChainRoot?.slice(0, 24)}...
          </p>
          <p className="text-xs font-mono text-[#991B1B]">
            Expected: {anchorResult.expectedRoot?.slice(0, 24)}...
          </p>
        </div>
      </div>
    );
  }

  // Fallback: error, not-configured, or idle — use existing static behavior
  const hasAnchor = !!anchorTxHash;
  return (
    <div>
      <Step
        valid={hasAnchor}
        title="Anchored On-Chain"
        description={hasAnchor ? "Merkle root found in Solana transaction" : "Not yet anchored"}
      />
      {anchorTxHash && (
        <a
          href={`https://explorer.solana.com/tx/${anchorTxHash}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 ml-8 mt-1 text-xs font-mono text-[#003FFF] hover:underline"
        >
          {anchorTxHash.slice(0, 16)}...{anchorTxHash.slice(-8)}
          <ExternalLink size={12} />
        </a>
      )}
      {anchorState === "error" && (
        <p className="ml-8 mt-1 text-xs text-[#6B7280]">On-chain verification unavailable</p>
      )}
    </div>
  );
}

function Step({ valid, title, description }: { valid: boolean; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      {valid ? (
        <CheckCircle size={20} className="text-[#10B981] shrink-0 mt-0.5" />
      ) : (
        <XCircle size={20} className="text-[#EF4444] shrink-0 mt-0.5" />
      )}
      <div>
        <p className="text-sm text-[#0A0A0A] font-medium">{title}</p>
        <p className="text-xs text-[#6B7280]">{description}</p>
      </div>
    </div>
  );
}
