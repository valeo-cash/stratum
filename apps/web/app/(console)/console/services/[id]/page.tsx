import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CopyButton from "@/app/components/console/CopyButton";
import dynamic from "next/dynamic";

const EarningsChart = dynamic(() => import("@/app/components/console/EarningsChart"), {
  ssr: false,
});

export default async function ServiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
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

  const service = await prisma.service.findUnique({
    where: { id: params.id },
  });

  if (!service) notFound();

  const receipts = await prisma.receiptRecord.findMany({
    where: { serviceId: service.id },
    orderBy: { createdAt: "desc" },
  });

  const totalEarnings = receipts.reduce((s, r) => s + r.amount, 0);

  const now = Date.now();
  const DAY = 86400_000;
  const dailyData = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = now - i * DAY;
    const dayEnd = dayStart + DAY;
    const dayReceipts = receipts.filter((r) => {
      const t = r.createdAt.getTime();
      return t >= dayStart && t < dayEnd;
    });
    const earnings = dayReceipts.reduce((s, r) => s + r.amount, 0);
    dailyData.push({
      day: new Date(dayStart).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      earnings: Math.round(earnings * 1e4) / 1e4,
    });
  }

  const recentReceipts = receipts.slice(0, 25);
  const stratumEndpoint = `https://stratum.valeo.com/${service.stratumSlug}`;

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <Link
        href="/console/services"
        className="inline-flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Services
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1
            className="text-[#0A0A0A] mb-1"
            style={{ fontSize: "1.5rem", fontWeight: 500 }}
          >
            {service.name}
          </h1>
          <p className="text-[#6B7280] text-sm">{service.targetUrl}</p>
        </div>
        <span
          className={`text-[10px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-none ${
            service.isActive
              ? "bg-[#D1FAE5] text-[#065F46]"
              : "bg-[#FEE2E2] text-[#991B1B]"
          }`}
        >
          {service.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Stratum Endpoint</p>
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono text-[#003FFF] truncate">
                {stratumEndpoint}
              </p>
              <CopyButton text={stratumEndpoint} />
            </div>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Price per Request</p>
            <p className="text-sm font-mono text-[#0A0A0A]">
              ${service.pricePerReq} USDC
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Total Receipts</p>
            <p className="text-sm font-mono text-[#0A0A0A]">
              {receipts.length.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#9CA3AF] mb-1">Total Earnings</p>
            <p className="text-sm font-mono text-[#0A0A0A]">
              ${totalEarnings.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 mb-6">
        <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
          Daily Earnings (30 days)
        </h3>
        <EarningsChart data={dailyData} />
      </div>

      <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5">
        <h3 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
          Recent Receipts
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]">
                <th className="pb-3 font-normal">Sequence</th>
                <th className="pb-3 font-normal">Amount</th>
                <th className="pb-3 font-normal">Payer</th>
                <th className="pb-3 font-normal">Resource</th>
                <th className="pb-3 font-normal">Window</th>
                <th className="pb-3 font-normal">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentReceipts.map((r) => (
                <tr key={r.id} className="border-t border-[#E5E7EB]">
                  <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">
                    #{r.sequence}
                  </td>
                  <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">
                    ${r.amount.toFixed(4)}
                  </td>
                  <td className="py-2.5 text-[#9CA3AF] font-mono text-xs">
                    {r.payerAddress.slice(0, 6)}...{r.payerAddress.slice(-4)}
                  </td>
                  <td className="py-2.5 text-[#6B7280] font-mono text-xs">
                    {r.resourcePath}
                  </td>
                  <td className="py-2.5 text-[#6B7280] font-mono text-xs">
                    {r.windowId}
                  </td>
                  <td className="py-2.5 text-[#9CA3AF] font-mono text-xs whitespace-nowrap">
                    {r.createdAt.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
