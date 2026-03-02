import { prisma } from "../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CopyButton from "../../components/CopyButton";

function stateBadge(state: string) {
  switch (state) {
    case "OPEN":
      return "bg-[#D1FAE5] text-[#065F46]";
    case "FINALIZED":
      return "bg-[#DBEAFE] text-[#1E40AF]";
    case "INSTRUCTING":
      return "bg-[#FEF3C7] text-[#92400E]";
    default:
      return "bg-[#F3F4F6] text-[#6B7280]";
  }
}

interface NettingRow {
  participant: string;
  grossCredit: number;
  grossDebit: number;
  net: number;
}

export default async function WindowDetailPage({
  params,
}: {
  params: { windowId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const window = await prisma.windowRecord.findFirst({
    where: { windowId: params.windowId },
  });

  if (!window) notFound();

  const receipts = await prisma.receiptRecord.findMany({
    where: { windowId: window.windowId },
    orderBy: { createdAt: "asc" },
  });

  // Compute netting breakdown from receipts
  const participantMap = new Map<string, { credit: number; debit: number }>();

  for (const r of receipts) {
    // Payer debits, payee credits
    const payer = participantMap.get(r.payerAddress) ?? { credit: 0, debit: 0 };
    payer.debit += r.amount;
    participantMap.set(r.payerAddress, payer);

    const payee = participantMap.get(r.payeeAddress) ?? { credit: 0, debit: 0 };
    payee.credit += r.amount;
    participantMap.set(r.payeeAddress, payee);
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
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <Link
        href="/windows"
        className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Windows
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1
            className="text-[#0A0A0A] mb-1"
            style={{ fontSize: "1.5rem", fontWeight: 500 }}
          >
            Window {window.windowId}
          </h1>
          <p className="text-[#6B7280] text-sm">
            Opened {window.openedAt.toLocaleString()}
          </p>
        </div>
        <span
          className={`text-[11px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-none ${stateBadge(window.state)}`}
        >
          {window.state}
        </span>
      </div>

      {/* Window metadata */}
      <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Receipts</p>
            <p className="text-sm font-mono text-[#0A0A0A]">{window.receiptCount}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Gross Volume</p>
            <p className="text-sm font-mono text-[#0A0A0A]">${window.grossVolume.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Net Volume</p>
            <p className="text-sm font-mono text-[#0A0A0A]">
              {window.netVolume != null ? `$${window.netVolume.toFixed(2)}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Transfers</p>
            <p className="text-sm font-mono text-[#0A0A0A]">{window.transferCount ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Compression</p>
            <p className="text-sm font-mono text-[#0A0A0A]">
              {window.compressionRatio != null ? `${window.compressionRatio.toFixed(1)}:1` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Facilitator</p>
            <p className="text-sm font-mono text-[#0A0A0A]">{window.facilitatorId ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Merkle Root card */}
      {window.merkleRoot && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-6">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
            Merkle Anchor
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <p className="text-[11px] text-[#9CA3AF] mb-1">Merkle Root</p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-[#0A0A0A] break-all">{window.merkleRoot}</p>
                <CopyButton text={window.merkleRoot} />
              </div>
            </div>
            <div>
              <p className="text-[11px] text-[#9CA3AF] mb-1">Anchor Transaction</p>
              {window.anchorTxHash ? (
                <div className="flex items-center gap-2">
                  <a
                    href={`https://explorer.solana.com/tx/${window.anchorTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-[#003FFF] hover:underline break-all"
                  >
                    {window.anchorTxHash.slice(0, 20)}...{window.anchorTxHash.slice(-8)}
                  </a>
                  <CopyButton text={window.anchorTxHash} />
                </div>
              ) : (
                <p className="text-xs font-mono text-[#9CA3AF]">Not anchored</p>
              )}
              {window.anchorChain && (
                <p className="text-[10px] text-[#9CA3AF] mt-1 uppercase">{window.anchorChain}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Netting Breakdown */}
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
                  <td
                    className={`py-2.5 font-mono text-xs text-right font-medium ${
                      row.net > 0
                        ? "text-[#10B981]"
                        : row.net < 0
                        ? "text-[#EF4444]"
                        : "text-[#0A0A0A]"
                    }`}
                  >
                    {row.net >= 0 ? "+" : ""}${row.net.toFixed(4)}
                  </td>
                </tr>
              ))}

              {/* Sum row */}
              <tr className="border-t-2 border-[#0A0A0A]">
                <td className="py-2.5 text-[#0A0A0A] font-mono text-xs font-medium">
                  Total
                </td>
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
    </div>
  );
}
