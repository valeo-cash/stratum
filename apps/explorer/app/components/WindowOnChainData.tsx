"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import VerificationPanel from "./VerificationPanel";

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

interface Props {
  windowId: string;
  merkleRoot?: string;
  anchorTxHash?: string;
  fallbackReceiptCount: number;
  fallbackGrossVolume: number;
  fallbackParticipants: number;
}

export default function WindowOnChainData({
  windowId,
  merkleRoot,
  anchorTxHash,
  fallbackReceiptCount,
  fallbackGrossVolume,
  fallbackParticipants,
}: Props) {
  const [loading, setLoading] = useState(!!merkleRoot);
  const [data, setData] = useState<AnchorVerification | null>(null);

  useEffect(() => {
    if (!merkleRoot) return;

    fetch(`/api/verify-anchor?windowId=${encodeURIComponent(windowId)}&expectedRoot=${encodeURIComponent(merkleRoot)}`)
      .then((res) => res.json())
      .then((d: AnchorVerification) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [windowId, merkleRoot]);

  const hasOnChainData = data?.verified && (data.receiptCount ?? 0) > 0;

  const receiptCount = hasOnChainData ? data!.receiptCount! : fallbackReceiptCount;
  const grossVolume = hasOnChainData
    ? Number(data!.grossVolume) / 1_000_000
    : fallbackGrossVolume;
  const netVolume = hasOnChainData
    ? Number(data!.netVolume) / 1_000_000
    : 0;
  const participants = fallbackParticipants > 0 ? fallbackParticipants : "—";

  return (
    <>
      {/* Stats cards */}
      <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-6">
        {hasOnChainData && (
          <p className="text-[10px] font-mono text-[#10B981] uppercase tracking-[0.1em] mb-3">
            On-Chain Verified Data
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Receipts</p>
            <p className="text-sm font-mono text-[#0A0A0A]">
              {loading ? <Loader2 size={14} className="animate-spin inline" /> : receiptCount}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Gross Volume</p>
            <p className="text-sm font-mono text-[#0A0A0A]">
              {loading ? <Loader2 size={14} className="animate-spin inline" /> : `$${grossVolume.toFixed(4)}`}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">
              {hasOnChainData ? "Net Volume" : "Participants"}
            </p>
            <p className="text-sm font-mono text-[#0A0A0A]">
              {loading ? (
                <Loader2 size={14} className="animate-spin inline" />
              ) : hasOnChainData ? (
                `$${netVolume.toFixed(4)}`
              ) : (
                participants
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">State</p>
            <p className="text-sm font-mono text-[#0A0A0A]">
              {hasOnChainData ? "FINALIZED" : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Verification panel */}
      <div className="mb-6">
        <VerificationPanel
          receipt={{
            id: "",
            windowId,
            payer: "",
            amount: 0,
            timestamp: "",
          }}
          window={{
            id: windowId,
            state: "FINALIZED",
            merkleRoot,
            anchorTxHash,
          }}
        />
      </div>
    </>
  );
}
