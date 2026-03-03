import { getServices } from "@/app/lib/gateway";
import Link from "next/link";

export default async function ConsoleServicesPage() {
  const services = await getServices();

  if (!services) {
    return (
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.5rem", fontWeight: 500 }}>Services</h1>
        <div className="mt-8 bg-[#FEF2F2] border border-[#FECACA] rounded-none p-6">
          <p className="text-[#991B1B] text-sm font-medium mb-1">Gateway Offline</p>
          <p className="text-[#6B7280] text-sm">Cannot connect to the Stratum Gateway.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.5rem", fontWeight: 500 }}>Services</h1>
          <p className="text-[#6B7280] text-sm">Registered API services on the Gateway.</p>
        </div>
      </div>

      {services.length === 0 && (
        <p className="text-[#9CA3AF] text-sm py-12 text-center">No services registered yet.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((svc: any) => (
          <Link key={svc.slug} href={`/console/services/${svc.slug}`} className="block group">
            <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-5 transition-colors hover:border-[#D1D5DB] h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#0A0A0A] text-sm font-medium">{svc.name}</h3>
                <span className="text-[10px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-none bg-[#D1FAE5] text-[#065F46]">Active</span>
              </div>
              <div className="mb-4">
                <p className="text-[11px] text-[#9CA3AF] mb-1">Target URL</p>
                <p className="text-xs font-mono text-[#6B7280] truncate">{svc.targetUrl}</p>
              </div>
              <div className="mb-4">
                <p className="text-[11px] text-[#9CA3AF] mb-1">Stratum Endpoint</p>
                <p className="text-xs font-mono text-[#003FFF] truncate">/s/{svc.slug}/*</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-[#E5E7EB]">
                <div>
                  <p className="text-[10px] text-[#9CA3AF]">Price/req</p>
                  <p className="text-sm font-mono text-[#0A0A0A]">${svc.pricePerRequest}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#9CA3AF]">Chains</p>
                  <p className="text-sm font-mono text-[#0A0A0A]">{svc.chains?.join(", ") ?? "solana"}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
