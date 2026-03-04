import { getStats, getReceipts } from "@/app/lib/gateway";
import { DollarSign, Fuel, Server, TrendingUp } from "lucide-react";
import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const LiveFeed = nextDynamic(() => import("@/app/components/console/LiveFeed"), { ssr: false });

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

  const statCards = [
    { label: "Total Receipts", value: stats.totalReceipts.toLocaleString(), icon: DollarSign, color: "#10B981" },
    { label: "Volume (USDC)", value: `$${stats.totalVolumeUSDC.toFixed(2)}`, icon: Fuel, color: "#003FFF" },
    { label: "Active Services", value: String(stats.activeServices), icon: Server, color: "#D97706" },
    { label: "Windows Finalized", value: String(stats.windowsFinalized), icon: TrendingUp, color: "#6366F1" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.5rem", fontWeight: 500 }}>Dashboard</h1>
      <p className="text-[#6B7280] text-sm mb-8">Live overview of your Stratum Gateway.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em]">{stat.label}</span>
                <Icon size={16} style={{ color: stat.color }} strokeWidth={1.5} />
              </div>
              <p className="text-[#0A0A0A] font-mono" style={{ fontSize: "1.25rem", fontWeight: 500 }}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {stats.currentWindow && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em]">Current Window</span>
            <span className={`text-[11px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-none ${stats.currentWindow.state === "OPEN" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#6B7280]"}`}>{stats.currentWindow.state}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div><p className="text-[11px] text-[#9CA3AF] mb-1">Window ID</p><p className="text-sm font-mono text-[#0A0A0A]">{stats.currentWindow.windowId}</p></div>
            <div><p className="text-[11px] text-[#9CA3AF] mb-1">Receipts</p><p className="text-sm font-mono text-[#0A0A0A]">{stats.currentWindow.receiptCount}</p></div>
            <div><p className="text-[11px] text-[#9CA3AF] mb-1">Gross Volume</p><p className="text-sm font-mono text-[#0A0A0A]">${stats.currentWindow.grossVolume.toFixed(2)}</p></div>
            <div><p className="text-[11px] text-[#9CA3AF] mb-1">Opened</p><p className="text-sm font-mono text-[#0A0A0A]">{new Date(stats.currentWindow.openedAt).toLocaleDateString()}</p></div>
          </div>
        </div>
      )}

      {stats.recentWindows.length > 0 && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-8">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">Recent Finalized Windows</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]"><th className="pb-3 font-normal">Window</th><th className="pb-3 font-normal">Receipts</th><th className="pb-3 font-normal">Merkle Root</th><th className="pb-3 font-normal">Anchor Tx</th></tr></thead>
              <tbody>
                {stats.recentWindows.map((w) => (
                  <tr key={w.id} className="border-t border-[#E5E7EB]">
                    <td className="py-2.5 text-[#003FFF] font-mono text-xs">{w.id}</td>
                    <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">{w.receiptCount}</td>
                    <td className="py-2.5 text-[#9CA3AF] font-mono text-xs">{w.merkleRoot}</td>
                    <td className="py-2.5 font-mono text-xs">{w.anchorTxHash ? <a href={`https://explorer.solana.com/tx/${w.anchorTxHash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-[#003FFF] hover:underline">{w.anchorTxHash.slice(0, 12)}...</a> : <span className="text-[#9CA3AF]">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                    <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">${r.amount?.toFixed(4)}</td>
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
