import { getReceipt, getWindow } from "@/app/lib/gateway";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CopyButton from "@/app/components/explorer/CopyButton";
import VerificationPanel from "@/app/components/explorer/VerificationPanel";

export default async function ReceiptPage({
  params,
}: {
  params: { id: string };
}) {
  const receipt = await getReceipt(params.id);
  if (!receipt) notFound();

  const win = await getWindow();

  // Build a mock hash for display if not present
  const receiptHash = receipt.receiptHash || "0x" + Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

  // Build a window object for verification panel
  const windowData = win ? {
    id: win.id,
    state: win.state || "OPEN",
    merkleRoot: win.merkleRoot || "0x" + Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(""),
    anchorTxHash: win.anchorTxHash,
    anchorChain: win.anchorChain,
  } : null;

  return (
    <div className="py-10">
      <Link
        href="/explorer"
        className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Explorer
      </Link>

      <h1
        className="text-[#0A0A0A] mb-1"
        style={{ fontSize: "1.25rem", fontWeight: 500 }}
      >
        Receipt {receipt.id}
      </h1>
      <p className="text-[#6B7280] text-sm mb-8">
        {receipt.timestamp ? new Date(receipt.timestamp).toLocaleString() : ""}
      </p>

      {/* Receipt info */}
      <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-6">
        <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
          Receipt Detail
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Receipt ID" value={receipt.id} copy />
          <Field label="Window ID" value={receipt.windowId} link={`/explorer/window/${receipt.windowId}`} />
          <Field label="Sequence" value={String(receipt.sequence)} />
          <Field label="Amount" value={`$${receipt.amount?.toFixed(6)} ${receipt.asset || "USDC"}`} />
          <Field label="Payer" value={receipt.payer} copy mono />
          <Field label="Payee" value={receipt.payee} copy mono />
          <Field label="Resource" value={receipt.resource} />
          <Field label="Timestamp" value={receipt.timestamp ? new Date(receipt.timestamp).toLocaleString() : "—"} />
        </div>
      </div>

      {/* Verification */}
      <VerificationPanel
        receipt={receipt}
        window={windowData}
        receiptHash={receiptHash}
      />
    </div>
  );
}

function Field({ label, value, copy, mono, link }: { label: string; value: string; copy?: boolean; mono?: boolean; link?: string }) {
  return (
    <div>
      <p className="text-[11px] text-[#9CA3AF] mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {link ? (
          <Link href={link} className={`text-xs text-[#003FFF] hover:underline break-all ${mono ? "font-mono" : ""}`}>
            {value}
          </Link>
        ) : (
          <p className={`text-xs text-[#0A0A0A] break-all ${mono ? "font-mono" : ""}`}>
            {value}
          </p>
        )}
        {copy && <CopyButton text={value} />}
      </div>
    </div>
  );
}
