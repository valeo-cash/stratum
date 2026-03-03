import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import CopyButton from "@/app/components/console/CopyButton";

function compressionColor(ratio: number | null) {
  if (!ratio) return "text-[#0A0A0A]";
  if (ratio > 100) return "text-[#10B981]";
  if (ratio > 10) return "text-[#003FFF]";
  return "text-[#0A0A0A]";
}

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

export default async function WindowsPage() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    redirect("/console/login");
  }
  if (!session?.user) redirect("/console/login");

  if (!prisma) {
    return (
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <p className="text-[#6B7280] text-sm">Database not connected. Set DATABASE_URL to enable the console.</p>
      </div>
    );
  }

  const windows = await prisma.windowRecord.findMany({
    orderBy: { openedAt: "desc" },
  });

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <h1
        className="text-[#0A0A0A] mb-1"
        style={{ fontSize: "1.5rem", fontWeight: 500 }}
      >
        Settlement Windows
      </h1>
      <p className="text-[#6B7280] text-sm mb-8">
        All clearing windows and their settlement status.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]">
              <th className="pb-3 font-normal">Window ID</th>
              <th className="pb-3 font-normal">State</th>
              <th className="pb-3 font-normal">Receipts</th>
              <th className="pb-3 font-normal">Gross Vol</th>
              <th className="pb-3 font-normal">Net Vol</th>
              <th className="pb-3 font-normal">Compression</th>
              <th className="pb-3 font-normal">Merkle Root</th>
              <th className="pb-3 font-normal">Anchor Tx</th>
              <th className="pb-3 font-normal">Finalized</th>
            </tr>
          </thead>
          <tbody>
            {windows.map((w) => (
              <tr key={w.id} className="border-t border-[#E5E7EB] hover:bg-[#FAFAFA] transition-colors">
                <td className="py-3">
                  <Link
                    href={`/console/windows/${w.windowId}`}
                    className="text-[#003FFF] font-mono text-xs hover:underline"
                  >
                    {w.windowId}
                  </Link>
                </td>
                <td className="py-3">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-none ${stateBadge(w.state)}`}
                  >
                    {w.state}
                  </span>
                </td>
                <td className="py-3 text-[#0A0A0A] font-mono text-xs">
                  {w.receiptCount}
                </td>
                <td className="py-3 text-[#0A0A0A] font-mono text-xs">
                  ${w.grossVolume.toFixed(2)}
                </td>
                <td className="py-3 text-[#0A0A0A] font-mono text-xs">
                  {w.netVolume != null ? `$${w.netVolume.toFixed(2)}` : "—"}
                </td>
                <td className={`py-3 font-mono text-xs ${compressionColor(w.compressionRatio)}`}>
                  {w.compressionRatio != null ? `${w.compressionRatio.toFixed(1)}:1` : "—"}
                </td>
                <td className="py-3 text-[#9CA3AF] font-mono text-xs">
                  {w.merkleRoot ? (
                    <span className="flex items-center gap-1">
                      {w.merkleRoot.slice(0, 10)}...
                      <CopyButton text={w.merkleRoot} />
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3 font-mono text-xs">
                  {w.anchorTxHash ? (
                    <a
                      href={`https://explorer.solana.com/tx/${w.anchorTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#003FFF] hover:underline"
                    >
                      {w.anchorTxHash.slice(0, 10)}...
                    </a>
                  ) : (
                    <span className="text-[#9CA3AF]">—</span>
                  )}
                </td>
                <td className="py-3 text-[#9CA3AF] font-mono text-xs whitespace-nowrap">
                  {w.finalizedAt
                    ? w.finalizedAt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
