import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import { DollarSign, Fuel, Server, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";

const ReceiptsChart = dynamic(() => import("@/app/components/console/ReceiptsChart"), { ssr: false });
const LiveFeed = dynamic(() => import("@/app/components/console/LiveFeed"), { ssr: false });

export default async function DashboardPage() {
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
        <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.5rem", fontWeight: 500 }}>Dashboard</h1>
        <p className="text-[#6B7280] text-sm mt-2">Database not connected. Set DATABASE_URL to enable the console.</p>
      </div>
    );
  }

  const userId = (session.user as { id?: string }).id;
  const services = await prisma.service.findMany({ where: { userId: userId ?? undefined } });
  const serviceIds = services.map((s: { id: string }) => s.id);
  const receipts = await prisma.receiptRecord.findMany({ where: { serviceId: { in: serviceIds } }, orderBy: { createdAt: "desc" } });
  const windows = await prisma.windowRecord.findMany({ orderBy: { openedAt: "desc" } });

  const totalEarnings = receipts.reduce((sum, r) => sum + r.amount, 0);
  const activeServices = services.filter((s) => s.isActive).length;
  const gasSaved = receipts.length * 0.005;
  const finalizedWindows = windows.filter((w) => w.state === "FINALIZED");
  const avgCompression = finalizedWindows.length > 0
    ? finalizedWindows.reduce((s, w) => s + (w.compressionRatio ?? 0), 0) / finalizedWindows.length
    : 0;
  const currentWindow = windows.find((w) => w.state === "OPEN") ?? windows[0];

  const now = Date.now();
  const chartData = [];
  for (let i = 23; i >= 0; i--) {
    const hourStart = now - i * 3600_000;
    const hourEnd = hourStart + 3600_000;
    const count = receipts.filter((r) => { const t = r.createdAt.getTime(); return t >= hourStart && t < hourEnd; }).length;
    const label = new Date(hourStart).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    chartData.push({ hour: label, count });
  }

  const recentReceipts = receipts.slice(0, 15);
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s.name]));

  const stats = [
    { label: "Total Earnings", value: `$${totalEarnings.toFixed(2)}`, icon: DollarSign, color: "#10B981" },
    { label: "Gas Saved", value: `$${gasSaved.toFixed(2)}`, icon: Fuel, color: "#003FFF" },
    { label: "Active Services", value: String(activeServices), icon: Server, color: "#D97706" },
    { label: "Avg Compression", value: `${avgCompression.toFixed(1)}:1`, icon: TrendingUp, color: "#6366F1" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.5rem", fontWeight: 500 }}>Dashboard</h1>
      <p className="text-[#6B7280] text-sm mb-8">Overview of your Stratum clearing activity.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
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

      {currentWindow && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em]">Current Window</span>
            <span className={`text-[11px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-none ${currentWindow.state === "OPEN" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#6B7280]"}`}>{currentWindow.state}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div><p className="text-[11px] text-[#9CA3AF] mb-1">Window ID</p><p className="text-sm font-mono text-[#0A0A0A]">{currentWindow.windowId}</p></div>
            <div><p className="text-[11px] text-[#9CA3AF] mb-1">Receipts</p><p className="text-sm font-mono text-[#0A0A0A]">{currentWindow.receiptCount}</p></div>
            <div><p className="text-[11px] text-[#9CA3AF] mb-1">Gross Volume</p><p className="text-sm font-mono text-[#0A0A0A]">${currentWindow.grossVolume.toFixed(2)}</p></div>
            <div><p className="text-[11px] text-[#9CA3AF] mb-1">Opened</p><p className="text-sm font-mono text-[#0A0A0A]">{currentWindow.openedAt.toLocaleDateString()}</p></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">Receipts per Hour (24h)</h3>
          <ReceiptsChart data={chartData} />
        </div>
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">Recent Receipts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]"><th className="pb-3 font-normal">Service</th><th className="pb-3 font-normal">Amount</th><th className="pb-3 font-normal">Payer</th><th className="pb-3 font-normal">Time</th></tr></thead>
              <tbody>
                {recentReceipts.map((r) => (
                  <tr key={r.id} className="border-t border-[#E5E7EB]">
                    <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">{serviceMap[r.serviceId] ?? "—"}</td>
                    <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">${r.amount.toFixed(4)}</td>
                    <td className="py-2.5 text-[#9CA3AF] font-mono text-xs">{r.payerAddress.slice(0, 6)}...{r.payerAddress.slice(-4)}</td>
                    <td className="py-2.5 text-[#9CA3AF] font-mono text-xs whitespace-nowrap">{r.createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6"><LiveFeed /></div>
    </div>
  );
}
