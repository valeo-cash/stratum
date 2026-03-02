"use client";

import { useState } from "react";
import { Search, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import CopyButton from "../components/CopyButton";
import dynamic from "next/dynamic";

const MerkleTreeViz = dynamic(() => import("../components/MerkleTreeViz"), {
  ssr: false,
});

interface ReceiptData {
  id: string;
  serviceId: string;
  windowId: string;
  sequence: number;
  payerAddress: string;
  payeeAddress: string;
  amount: number;
  asset: string;
  resourcePath: string;
  idempotencyKey: string;
  receiptHash: string;
  createdAt: string;
}

interface WindowData {
  windowId: string;
  state: string;
  merkleRoot: string | null;
  anchorTxHash: string | null;
  anchorChain: string | null;
}

interface ProofData {
  leaf: string;
  nodes: { hash: string; level: number; side: "left" | "right" | "root"; highlight: boolean }[];
  root: string;
}

interface Verification {
  signatureValid: boolean;
  includedInWindow: boolean;
  anchoredOnChain: boolean;
}

interface SearchResult {
  receipt: ReceiptData;
  window: WindowData | null;
  proof: ProofData;
  verification: Verification;
}

export default function ExplorerPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/explorer?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        setError("Receipt not found. Try a receipt hash, payer address, or receipt ID.");
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <h1
        className="text-[#0A0A0A] mb-1"
        style={{ fontSize: "1.5rem", fontWeight: 500 }}
      >
        Explorer
      </h1>
      <p className="text-[#6B7280] text-sm mb-8">
        Verify any receipt against its settlement proof.
      </p>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by receipt hash, payer address, or receipt ID..."
              className="w-full pl-10 pr-4 py-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-none text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none focus:border-[#003FFF] transition-colors font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#003FFF] text-white text-sm font-medium rounded-none hover:bg-[#0033CC] transition-colors disabled:opacity-50"
          >
            {loading ? "Searching..." : "Verify"}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-none p-4 mb-6">
          <p className="text-sm text-[#991B1B]">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Receipt detail */}
          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
            <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
              Receipt Detail
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Receipt ID" value={result.receipt.id} copy />
              <Field label="Window ID" value={result.receipt.windowId} />
              <Field label="Sequence" value={String(result.receipt.sequence)} />
              <Field label="Amount" value={`$${result.receipt.amount.toFixed(6)} ${result.receipt.asset}`} />
              <Field label="Payer" value={result.receipt.payerAddress} copy mono />
              <Field label="Payee" value={result.receipt.payeeAddress} copy mono />
              <Field label="Resource" value={result.receipt.resourcePath} />
              <Field
                label="Timestamp"
                value={new Date(result.receipt.createdAt).toLocaleString()}
              />
              <Field label="Idempotency Key" value={result.receipt.idempotencyKey} copy />
              <Field label="Receipt Hash" value={result.receipt.receiptHash} copy mono />
            </div>
          </div>

          {/* Verification panel */}
          <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
            <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
              Verification
            </h3>
            <div className="space-y-4">
              {/* Step 1: Signature */}
              <VerifyStep
                valid={result.verification.signatureValid}
                title="Signature Valid"
                description="Ed25519 signature verified against payer public key"
              />

              {/* Step 2: Inclusion */}
              <div>
                <VerifyStep
                  valid={result.verification.includedInWindow}
                  title="Included in Window"
                  description={`Receipt found in Merkle tree for window ${result.receipt.windowId}`}
                />
                {result.proof && (
                  <div className="mt-3 ml-8">
                    <MerkleTreeViz proof={result.proof} />
                  </div>
                )}
              </div>

              {/* Step 3: Anchored */}
              <div>
                <VerifyStep
                  valid={result.verification.anchoredOnChain}
                  title="Anchored On-Chain"
                  description={
                    result.window?.anchorTxHash
                      ? `Merkle root found in Solana transaction`
                      : "No anchor transaction found"
                  }
                />
                {result.window?.anchorTxHash && (
                  <a
                    href={`https://explorer.solana.com/tx/${result.window.anchorTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 ml-8 mt-1 text-xs font-mono text-[#003FFF] hover:underline"
                  >
                    {result.window.anchorTxHash.slice(0, 16)}...{result.window.anchorTxHash.slice(-8)}
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!result && !error && (
        <div className="text-center py-20">
          <Search size={32} className="mx-auto text-[#E5E7EB] mb-4" />
          <p className="text-[#9CA3AF] text-sm">
            Enter a receipt hash, payer address, or receipt ID to verify.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  copy,
  mono,
}: {
  label: string;
  value: string;
  copy?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-[#9CA3AF] mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p
          className={`text-xs text-[#0A0A0A] break-all ${mono ? "font-mono" : ""}`}
        >
          {value}
        </p>
        {copy && <CopyButton text={value} />}
      </div>
    </div>
  );
}

function VerifyStep({
  valid,
  title,
  description,
}: {
  valid: boolean;
  title: string;
  description: string;
}) {
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
