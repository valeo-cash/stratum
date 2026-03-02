import { getWindowById, getReceipts } from "../../lib/gateway";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CopyButton from "../../components/CopyButton";
import WindowOnChainData from "../../components/WindowOnChainData";

function stateBadge(state: string) {
  switch (state) {
    case "OPEN": return "bg-[#D1FAE5] text-[#065F46]";
    case "FINALIZED": return "bg-[#DBEAFE] text-[#1E40AF]";
    default: return "bg-[#F3F4F6] text-[#6B7280]";
  }
}

interface NettingRow {
  participant: string;
  grossCredit: number;
  grossDebit: number;
  net: number;
}

export default async function WindowPage({
  params,
}: {
  params: { id: string };
}) {
  const win = await getWindowById(params.id);
  if (!win) notFound();

  const receipts = (await getReceipts({ windowId: params.id, limit: 1000 })) || [];

  // Compute netting breakdown from gateway receipts (fallback data)
  const participantMap = new Map<string, { credit: number; debit: number }>();
  let grossVolume = 0;

  for (const r of receipts) {
    grossVolume += r.amount;
    const payer = participantMap.get(r.payer) ?? { credit: 0, debit: 0 };
    payer.debit += r.amount;
    participantMap.set(r.payer, payer);

    const payee = participantMap.get(r.payee) ?? { credit: 0, debit: 0 };
    payee.credit += r.amount;
    participantMap.set(r.payee, payee);
  }

  const nettingRows: NettingRow[] = [];
  for (const [addr, pos] of participantMap) {
    nettingRows.push({
      participant: addr,
      grossCredit: Math.round(pos.credit * 1e6) / 1e6,
      grossDebit: Math.round(pos.debit * 1e6) / 1e6,
      net: Math.round((pos.credit - pos.debit) * 1e6) / 1e6,
    });
  }
  nettingRows.sort((a, b) => b.net - a.net);

  const sumNet = Math.round(nettingRows.reduce((s, r) => s + r.net, 0) * 1e6) / 1e6;

  return (
    <div className="py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Explorer
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.25rem", fontWeight: 500 }}>
            Window {win.id || params.id}
          </h1>
          <p className="text-[#6B7280] text-sm">
            {win.openedAt ? `Opened ${new Date(win.openedAt).toLocaleString()}` : ""}
          </p>
        </div>
        <span className={`text-[10px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-none ${stateBadge(win.state || "OPEN")}`}>
          {win.state || "OPEN"}
        </span>
      </div>

      {/* On-chain stats + verification panel */}
      <WindowOnChainData
        windowId={params.id}
        merkleRoot={win.merkleRoot}
        anchorTxHash={win.anchorTxHash}
        fallbackReceiptCount={receipts.length}
        fallbackGrossVolume={grossVolume}
        fallbackParticipants={participantMap.size}
      />

      {/* Merkle anchor */}
      {win.merkleRoot && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-6">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
            Merkle Anchor
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] text-[#9CA3AF] mb-1">Merkle Root</p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-[#0A0A0A] break-all">{win.merkleRoot}</p>
                <CopyButton text={win.merkleRoot} />
              </div>
            </div>
            {win.anchorTxHash && (
              <div>
                <p className="text-[11px] text-[#9CA3AF] mb-1">Anchor Transaction</p>
                <a
                  href={`https://explorer.solana.com/tx/${win.anchorTxHash}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-[#003FFF] hover:underline break-all"
                >
                  {win.anchorTxHash}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Netting breakdown */}
      {nettingRows.length > 0 && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
            Netting Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]">
                  <th className="pb-3 font-normal">Participant</th>
                  <th className="pb-3 font-normal text-right">Gross Credit</th>
                  <th className="pb-3 font-normal text-right">Gross Debit</th>
                  <th className="pb-3 font-normal text-right">Net Position</th>
                </tr>
              </thead>
              <tbody>
                {nettingRows.map((row) => (
                  <tr key={row.participant} className="border-t border-[#E5E7EB]">
                    <td className="py-2.5 text-[#6B7280] font-mono text-xs">
                      {row.participant.slice(0, 6)}...{row.participant.slice(-4)}
                    </td>
                    <td className="py-2.5 text-[#0A0A0A] font-mono text-xs text-right">
                      ${row.grossCredit.toFixed(4)}
                    </td>
                    <td className="py-2.5 text-[#0A0A0A] font-mono text-xs text-right">
                      ${row.grossDebit.toFixed(4)}
                    </td>
                    <td className={`py-2.5 font-mono text-xs text-right font-medium ${
                      row.net > 0 ? "text-[#10B981]" : row.net < 0 ? "text-[#EF4444]" : "text-[#0A0A0A]"
                    }`}>
                      {row.net >= 0 ? "+" : ""}${row.net.toFixed(4)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-[#0A0A0A]">
                  <td className="py-2.5 text-[#0A0A0A] font-mono text-xs font-medium">Total</td>
                  <td className="py-2.5 text-[#0A0A0A] font-mono text-xs text-right font-medium">
                    ${nettingRows.reduce((s, r) => s + r.grossCredit, 0).toFixed(4)}
                  </td>
                  <td className="py-2.5 text-[#0A0A0A] font-mono text-xs text-right font-medium">
                    ${nettingRows.reduce((s, r) => s + r.grossDebit, 0).toFixed(4)}
                  </td>
                  <td className="py-2.5 text-[#0A0A0A] font-mono text-xs text-right font-medium">
                    ${sumNet.toFixed(4)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
