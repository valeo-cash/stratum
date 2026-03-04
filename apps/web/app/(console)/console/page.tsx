import { getStats, getReceipts } from "@/app/lib/gateway";
import { DollarSign, Fuel, Server, Anchor } from "lucide-react";
import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const LiveFeed = nextDynamic(() => import("@/app/components/console/LiveFeed"), { ssr: false });

function ChainBadge({ chain }: { chain: string }) {
  if (chain === "base") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[#DBEAFE] text-[#1E40AF]">
        Base
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[#E8DAFE] text-[#6D28D9]">
      Solana
    </span>
  );
}

export default async function ConsoleDashboardPage() {
  const stats = await getStats();
  const recentReceipts = await getReceipts({ limit: 15 });

  if (!stats) {
    return (
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.5rem", fontWeight: 500 }}>Dashboard</h1>
        <div className="mt-8 bg-[#FEF2F2] border border-[#FECACA] rounded-none p-6">
          <p className="text-[#991B1B] text-sm font-medium mb-1">Gateway Offline</p>
          <p className="text-[#6B7280] text-sm">Cannot connect to the Stratum Gateway. Make sure it is running.</p>
        </div>
      </div>
    );
  }

  const gross = stats.totalReceipts ?? 0;
  const windows = stats.windowsFinalized ?? 0;
  const services = stats.activeServices ?? 1;
  const net = gross > 0 ? Math.max(windows * Math.max(services, 1), windows || 1) : 0;
  const compression = gross > 0 && net > 0 ? gross / net : 0;
  const feeReduction = gross > 0 && net > 0 ? ((1 - net / gross) * 100) : 0;
  const gasSaved = gross > 0 ? (gross - net) * 0.005 : 0;
  const grossVolume = stats.totalVolumeUSDC ?? 0;

  const statCards = [
    { label: "Gross Payments", value: gross.toLocaleString(), icon: DollarSign, color: "#10B981", extra: null },
    { label: "Gross Volume", value: `$${grossVolume.toFixed(2)}`, icon: Fuel, color: "#003FFF", extra: null },
    { label: "Active Services", value: String(services), icon: Server, color: "#D97706", extra: null },
    { label: "Anchor Txs", value: String(windows), icon: Anchor, color: "#6366F1", extra: "solana" as string | null },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.5rem", fontWeight: 500 }}>Dashboard</h1>
      <p className="text-[#6B7280] text-sm mb-8">Live overview of your Stratum Gateway.</p>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em]">{stat.label}</span>
                <div className="flex items-center gap-2">
                  {stat.extra && <ChainBadge chain={stat.extra} />}
                  <Icon size={16} style={{ color: stat.color }} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-[#0A0A0A] font-mono" style={{ fontSize: "1.25rem", fontWeight: 500 }}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Clearing Performance */}
      <div className="mb-8 border-l-2 border-[#003FFF] pl-0">
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] border-l-0 rounded-none p-6">
          <h3 className="text-[11px] font-mono text-[#003FFF] uppercase tracking-[0.15em] mb-5">Clearing Performance</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em] mb-2">Netting Ratio</p>
              <p className="text-[#0A0A0A] font-mono" style={{ fontSize: "1.5rem", fontWeight: 500 }}>
                {gross > 0 ? `${gross} : ${net}` : "—"}
              </p>
              <p className="text-[11px] text-[#9CA3AF] mt-1">
                {gross > 0 ? `${compression.toFixed(1)}× compression` : "No data yet"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em] mb-2">Net Settlements</p>
              <p className="text-[#0A0A0A] font-mono" style={{ fontSize: "1.5rem", fontWeight: 500 }}>
                {gross > 0 ? net.toLocaleString() : "—"}
              </p>
              <p className="text-[11px] text-[#9CA3AF] mt-1">on-chain transfers</p>
            </div>
            <div>
              <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em] mb-2">Gas Saved</p>
              <p className="text-[#0A0A0A] font-mono" style={{ fontSize: "1.5rem", fontWeight: 500 }}>
                {gross > 0 ? `$${gasSaved.toFixed(2)}` : "—"}
              </p>
              <p className="text-[11px] text-[#9CA3AF] mt-1">vs. individual settlement</p>
            </div>
            <div>
              <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em] mb-2">Fee Reduction</p>
              <p className="text-[#10B981] font-mono" style={{ fontSize: "1.5rem", fontWeight: 500 }}>
                {gross > 0 ? `-${feeReduction.toFixed(1)}%` : "—"}
              </p>
              <p className="text-[11px] text-[#9CA3AF] mt-1">transaction cost reduction</p>
            </div>
          </div>
        </div>
      </div>

      {/* Net Settlement Summary */}
      <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-8">
        <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">Net Settlement Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Gross Volume</p>
            <p className="text-sm font-mono text-[#0A0A0A]">${grossVolume.toFixed(3)}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Net Settlement</p>
            <p className="text-sm font-mono text-[#0A0A0A]">
              ${grossVolume.toFixed(3)}
              {services <= 1 && <span className="text-[10px] text-[#9CA3AF] ml-1">(1 service)</span>}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Merkle Anchors</p>
            <p className="text-sm font-mono text-[#0A0A0A]">{windows}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Compression</p>
            <p className="text-sm font-mono text-[#0A0A0A]">{gross > 0 ? `${compression.toFixed(1)}×` : "—"}</p>
          </div>
        </div>
      </div>

      {/* Current Window */}
      {stats.currentWindow && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em]">Current Window</span>
            <span className={`text-[11px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-none ${stats.currentWindow.state === "OPEN" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#6B7280]"}`}>{stats.currentWindow.state}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div><p className="text-[11px] text-[#9CA3AF] mb-1">Window ID</p><p className="text-sm font-mono text-[#0A0A0A]">{stats.currentWindow.windowId}</p></div>
            <div><p className="text-[11px] text-[#9CA3AF] mb-1">Receipts</p><p className="text-sm font-mono text-[#0A0A0A]">{stats.currentWindow.receiptCount}</p></div>
            <div><p className="text-[11px] text-[#9CA3AF] mb-1">Gross Volume</p><p className="text-sm font-mono text-[#0A0A0A]">${(Number(stats.currentWindow.grossVolume) || 0).toFixed(2)}</p></div>
            <div><p className="text-[11px] text-[#9CA3AF] mb-1">Opened</p><p className="text-sm font-mono text-[#0A0A0A]">{stats.currentWindow.openedAt ? new Date(stats.currentWindow.openedAt).toLocaleDateString() : "—"}</p></div>
          </div>
        </div>
      )}

      {/* Recent Finalized Windows */}
      {stats.recentWindows?.length > 0 && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-8">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">Recent Finalized Windows</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]">
                  <th className="pb-3 font-normal">Window</th>
                  <th className="pb-3 font-normal">Receipts</th>
                  <th className="pb-3 font-normal">Merkle Root</th>
                  <th className="pb-3 font-normal">Anchor Tx</th>
                  <th className="pb-3 font-normal">Chain</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentWindows.map((w: any) => (
                  <tr key={w.id} className="border-t border-[#E5E7EB]">
                    <td className="py-2.5 text-[#003FFF] font-mono text-xs">{w.id}</td>
                    <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">{w.receiptCount}</td>
                    <td className="py-2.5 text-[#9CA3AF] font-mono text-xs">{w.merkleRoot}</td>
                    <td className="py-2.5 font-mono text-xs">
                      {w.anchorTxHash
                        ? <a href={`https://explorer.solana.com/tx/${w.anchorTxHash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-[#003FFF] hover:underline">{w.anchorTxHash.slice(0, 12)}...</a>
                        : <span className="text-[#9CA3AF]">—</span>
                      }
                    </td>
                    <td className="py-2.5"><ChainBadge chain={w.chain || "solana"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Receipts */}
      {recentReceipts && recentReceipts.length > 0 && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-6">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">Recent Receipts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]"><th className="pb-3 font-normal">Payer</th><th className="pb-3 font-normal">Amount</th><th className="pb-3 font-normal">Window</th><th className="pb-3 font-normal">Time</th></tr></thead>
              <tbody>
                {recentReceipts.map((r: any) => (
                  <tr key={r.id} className="border-t border-[#E5E7EB]">
                    <td className="py-2.5 text-[#9CA3AF] font-mono text-xs">{r.payer?.slice(0, 6)}...{r.payer?.slice(-4)}</td>
                    <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">${(Number(r.amount) || 0).toFixed(4)}</td>
                    <td className="py-2.5 text-[#6B7280] font-mono text-xs">{r.windowId}</td>
                    <td className="py-2.5 text-[#9CA3AF] font-mono text-xs whitespace-nowrap">{r.timestamp ? new Date(r.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6"><LiveFeed /></div>
    </div>
  );
}
