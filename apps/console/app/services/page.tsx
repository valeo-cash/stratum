import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AddServiceButton from "../components/AddServiceButton";

export default async function ServicesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id?: string }).id;

  const services = await prisma.service.findMany({
    where: { userId: userId ?? undefined },
    orderBy: { createdAt: "desc" },
  });

  const receiptCounts = await prisma.receiptRecord.groupBy({
    by: ["serviceId"],
    where: { serviceId: { in: services.map((s) => s.id) } },
    _count: { id: true },
    _sum: { amount: true },
  });

  const countMap = Object.fromEntries(
    receiptCounts.map((r) => [r.serviceId, { count: r._count.id, sum: r._sum.amount ?? 0 }])
  );

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-[#0A0A0A] mb-1"
            style={{ fontSize: "1.5rem", fontWeight: 500 }}
          >
            Services
          </h1>
          <p className="text-[#6B7280] text-sm">
            Manage your registered API services.
          </p>
        </div>
        <AddServiceButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((svc) => {
          const stats = countMap[svc.id] ?? { count: 0, sum: 0 };
          return (
            <Link key={svc.id} href={`/services/${svc.id}`} className="block group">
              <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 transition-colors hover:border-[#D1D5DB] h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#0A0A0A] text-sm font-medium">
                    {svc.name}
                  </h3>
                  <span
                    className={`text-[10px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-none ${
                      svc.isActive
                        ? "bg-[#D1FAE5] text-[#065F46]"
                        : "bg-[#FEE2E2] text-[#991B1B]"
                    }`}
                  >
                    {svc.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-[11px] text-[#9CA3AF] mb-1">Target URL</p>
                  <p className="text-xs font-mono text-[#6B7280] truncate">
                    {svc.targetUrl}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-[11px] text-[#9CA3AF] mb-1">Stratum Endpoint</p>
                  <p className="text-xs font-mono text-[#003FFF] truncate">
                    stratum.valeo.com/{svc.stratumSlug}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#E5E7EB]">
                  <div>
                    <p className="text-[10px] text-[#9CA3AF]">Receipts</p>
                    <p className="text-sm font-mono text-[#0A0A0A]">
                      {stats.count}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9CA3AF]">Earnings</p>
                    <p className="text-sm font-mono text-[#0A0A0A]">
                      ${stats.sum.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9CA3AF]">Price/req</p>
                    <p className="text-sm font-mono text-[#0A0A0A]">
                      ${svc.pricePerReq}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
