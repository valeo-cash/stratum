import { getStats } from "@/app/lib/gateway";
import Link from "next/link";
import CopyButton from "@/app/components/console/CopyButton";

export const dynamic = "force-dynamic";

function stateBadge(state: string) {
  switch (state) {
    case "OPEN": return "bg-[#D1FAE5] text-[#065F46]";
    case "FINALIZED": return "bg-[#DBEAFE] text-[#1E40AF]";
    case "INSTRUCTING": return "bg-[#FEF3C7] text-[#92400E]";
    default: return "bg-[#F3F4F6] text-[#6B7280]";
  }
}

export default async function ConsoleWindowsPage() {
  const stats = await getStats();

  if (!stats) {
    return (
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.5rem", fontWeight: 500 }}>Settlement Windows</h1>
        <div className="mt-8 bg-[#FEF2F2] border border-[#FECACA] rounded-none p-6">
          <p className="text-[#991B1B] text-sm font-medium mb-1">Gateway Offline</p>
          <p className="text-[#6B7280] text-sm">Cannot connect to the Stratum Gateway.</p>
        </div>
      </div>
    );
  }

  const allWindows = [
    ...(stats.currentWindow ? [{ ...stats.currentWindow, merkleRoot: undefined as string | undefined, anchorTxHash: undefined as string | undefined | null, finalizedAt: undefined as string | undefined }] : []),
    ...stats.recentWindows.map((w) => ({ windowId: w.id, state: "FINALIZED", receiptCount: w.receiptCount, grossVolume: 0, merkleRoot: w.merkleRoot, anchorTxHash: w.anchorTxHash, openedAt: "", finalizedAt: "" })),
  ];

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.5rem", fontWeight: 500 }}>Settlement Windows</h1>
      <p className="text-[#6B7280] text-sm mb-8">All clearing windows and their settlement status.</p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]">
              <th className="pb-3 font-normal">Window ID</th>
              <th className="pb-3 font-normal">State</th>
              <th className="pb-3 font-normal">Receipts</th>
              <th className="pb-3 font-normal">Merkle Root</th>
              <th className="pb-3 font-normal">Anchor Tx</th>
            </tr>
          </thead>
          <tbody>
            {allWindows.map((w) => (
              <tr key={w.windowId} className="border-t border-[#E5E7EB] hover:bg-[#FAFAFA] transition-colors">
                <td className="py-3">
                  <Link href={`/console/windows/${w.windowId}`} className="text-[#003FFF] font-mono text-xs hover:underline">{w.windowId}</Link>
                </td>
                <td className="py-3">
                  <span className={`text-[10px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-none ${stateBadge(w.state)}`}>{w.state}</span>
                </td>
                <td className="py-3 text-[#0A0A0A] font-mono text-xs">{w.receiptCount}</td>
                <td className="py-3 text-[#9CA3AF] font-mono text-xs">
                  {w.merkleRoot ? <span className="flex items-center gap-1">{w.merkleRoot.slice(0, 10)}...<CopyButton text={w.merkleRoot} /></span> : "—"}
                </td>
                <td className="py-3 font-mono text-xs">
                  {w.anchorTxHash ? <a href={`https://explorer.solana.com/tx/${w.anchorTxHash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-[#003FFF] hover:underline">{w.anchorTxHash.slice(0, 10)}...</a> : <span className="text-[#9CA3AF]">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {allWindows.length === 0 && (
        <p className="text-[#9CA3AF] text-sm py-12 text-center">No windows yet.</p>
      )}
    </div>
  );
}
