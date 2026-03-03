import { getWindowById, getReceipts } from "@/app/lib/gateway";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CopyButton from "@/app/components/console/CopyButton";

function stateBadge(state: string) {
  switch (state) {
    case "OPEN": return "bg-[#D1FAE5] text-[#065F46]";
    case "FINALIZED": return "bg-[#DBEAFE] text-[#1E40AF]";
    case "INSTRUCTING": return "bg-[#FEF3C7] text-[#92400E]";
    default: return "bg-[#F3F4F6] text-[#6B7280]";
  }
}

export default async function ConsoleWindowDetailPage({ params }: { params: { windowId: string } }) {
  const win = await getWindowById(params.windowId);
  if (!win) notFound();

  const receipts = await getReceipts({ windowId: params.windowId });

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <Link href="/console/windows" className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors mb-6">
        <ArrowLeft size={16} />
        Back to Windows
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.5rem", fontWeight: 500 }}>Window {win.windowId}</h1>
          <p className="text-[#6B7280] text-sm">Opened {new Date(win.openedAt).toLocaleString()}</p>
        </div>
        <span className={`text-[11px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-none ${stateBadge(win.state)}`}>{win.state}</span>
      </div>

      <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          <div><p className="text-[11px] text-[#9CA3AF] mb-1">Receipts</p><p className="text-sm font-mono text-[#0A0A0A]">{win.receiptCount}</p></div>
          <div><p className="text-[11px] text-[#9CA3AF] mb-1">Gross Volume</p><p className="text-sm font-mono text-[#0A0A0A]">${win.grossVolume?.toFixed(2) ?? "—"}</p></div>
          <div><p className="text-[11px] text-[#9CA3AF] mb-1">Net Volume</p><p className="text-sm font-mono text-[#0A0A0A]">{win.netVolume != null ? `$${win.netVolume.toFixed(2)}` : "—"}</p></div>
          <div><p className="text-[11px] text-[#9CA3AF] mb-1">Transfers</p><p className="text-sm font-mono text-[#0A0A0A]">{win.transferCount ?? "—"}</p></div>
          <div><p className="text-[11px] text-[#9CA3AF] mb-1">Compression</p><p className="text-sm font-mono text-[#0A0A0A]">{win.compressionRatio != null ? `${win.compressionRatio.toFixed(1)}:1` : "—"}</p></div>
        </div>
      </div>

      {win.merkleRoot && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-6">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">Merkle Anchor</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <p className="text-[11px] text-[#9CA3AF] mb-1">Merkle Root</p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-[#0A0A0A] break-all">{win.merkleRoot}</p>
                <CopyButton text={win.merkleRoot} />
              </div>
            </div>
            <div>
              <p className="text-[11px] text-[#9CA3AF] mb-1">Anchor Transaction</p>
              {win.anchorTxHash ? (
                <div className="flex items-center gap-2">
                  <a href={`https://explorer.solana.com/tx/${win.anchorTxHash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-[#003FFF] hover:underline break-all">{win.anchorTxHash.slice(0, 20)}...{win.anchorTxHash.slice(-8)}</a>
                  <CopyButton text={win.anchorTxHash} />
                </div>
              ) : (
                <p className="text-xs font-mono text-[#9CA3AF]">Not anchored</p>
              )}
            </div>
          </div>
        </div>
      )}

      {receipts && receipts.length > 0 && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">Receipts in Window</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]"><th className="pb-3 font-normal">Seq</th><th className="pb-3 font-normal">Amount</th><th className="pb-3 font-normal">Payer</th><th className="pb-3 font-normal">Payee</th><th className="pb-3 font-normal">Time</th></tr></thead>
              <tbody>
                {receipts.map((r: any) => (
                  <tr key={r.id} className="border-t border-[#E5E7EB]">
                    <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">#{r.sequence}</td>
                    <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">${r.amount?.toFixed(4)}</td>
                    <td className="py-2.5 text-[#9CA3AF] font-mono text-xs">{r.payer?.slice(0, 6)}...{r.payer?.slice(-4)}</td>
                    <td className="py-2.5 text-[#9CA3AF] font-mono text-xs">{r.payee?.slice(0, 6)}...{r.payee?.slice(-4)}</td>
                    <td className="py-2.5 text-[#9CA3AF] font-mono text-xs whitespace-nowrap">{r.timestamp ? new Date(r.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
