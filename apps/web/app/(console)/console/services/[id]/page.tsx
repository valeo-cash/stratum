import { getService, getReceipts } from "@/app/lib/gateway";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CopyButton from "@/app/components/console/CopyButton";

export default async function ConsoleServiceDetailPage({ params }: { params: { id: string } }) {
  const service = await getService(params.id);
  if (!service) notFound();

  const receipts = await getReceipts({ limit: 25 });
  const stratumEndpoint = `/s/${service.slug}/*`;

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <Link href="/console/services" className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors mb-6">
        <ArrowLeft size={16} />
        Back to Services
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.5rem", fontWeight: 500 }}>{service.name}</h1>
          <p className="text-[#6B7280] text-sm">{service.targetUrl}</p>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-none bg-[#D1FAE5] text-[#065F46]">Active</span>
      </div>

      <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Stratum Endpoint</p>
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono text-[#003FFF] truncate">{stratumEndpoint}</p>
              <CopyButton text={stratumEndpoint} />
            </div>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Price per Request</p>
            <p className="text-sm font-mono text-[#0A0A0A]">${service.pricePerRequest} USDC</p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Chains</p>
            <p className="text-sm font-mono text-[#0A0A0A]">{service.chains?.join(", ") ?? "solana"}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Wallet</p>
            <p className="text-sm font-mono text-[#0A0A0A] truncate">{service.walletAddress?.slice(0, 8)}...{service.walletAddress?.slice(-4)}</p>
          </div>
        </div>
      </div>

      {receipts && receipts.length > 0 && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
          <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">Recent Receipts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]"><th className="pb-3 font-normal">Seq</th><th className="pb-3 font-normal">Amount</th><th className="pb-3 font-normal">Payer</th><th className="pb-3 font-normal">Window</th><th className="pb-3 font-normal">Time</th></tr></thead>
              <tbody>
                {receipts.map((r: any) => (
                  <tr key={r.id} className="border-t border-[#E5E7EB]">
                    <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">#{r.sequence}</td>
                    <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">${r.amount?.toFixed(4)}</td>
                    <td className="py-2.5 text-[#9CA3AF] font-mono text-xs">{r.payer?.slice(0, 6)}...{r.payer?.slice(-4)}</td>
                    <td className="py-2.5 text-[#6B7280] font-mono text-xs">{r.windowId}</td>
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
