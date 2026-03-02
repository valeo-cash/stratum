import { getStatus, getReceipts } from "./lib/gateway";
import SearchBar from "./components/SearchBar";
import Link from "next/link";

export default async function ExplorerHome() {
  const status = await getStatus();
  const receipts = await getReceipts({ limit: 10 });

  return (
    <div className="py-16">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1
          className="text-[#0A0A0A] mb-3"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 500 }}
        >
          Stratum Explorer
        </h1>
        <p className="text-[#6B7280] text-sm max-w-md mx-auto">
          Verify any agent payment receipt against its on-chain Merkle root.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-[600px] mx-auto mb-14">
        <SearchBar />
      </div>

      {/* Stats */}
      {status && (
        <div className="grid grid-cols-3 gap-4 mb-14 max-w-[600px] mx-auto">
          <StatCard label="Total Receipts" value={status.totalReceipts?.toLocaleString() ?? "0"} />
          <StatCard label="Current Window" value={status.windowId ?? "—"} />
          <StatCard label="Window Receipts" value={status.receiptCount?.toLocaleString() ?? "0"} />
        </div>
      )}

      {/* Recent receipts */}
      {receipts && receipts.length > 0 && (
        <div>
          <h2 className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">
            Recent Receipts
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]">
                  <th className="pb-3 font-normal">ID</th>
                  <th className="pb-3 font-normal">Amount</th>
                  <th className="pb-3 font-normal">Payer</th>
                  <th className="pb-3 font-normal">Payee</th>
                  <th className="pb-3 font-normal">Window</th>
                  <th className="pb-3 font-normal">Time</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r: any) => (
                  <tr key={r.id} className="border-t border-[#E5E7EB]">
                    <td className="py-2.5">
                      <Link href={`/receipt/${r.id}`} className="text-[#003FFF] font-mono text-xs hover:underline">
                        {r.id}
                      </Link>
                    </td>
                    <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">
                      ${r.amount?.toFixed(4)}
                    </td>
                    <td className="py-2.5 text-[#9CA3AF] font-mono text-xs">
                      {r.payer?.slice(0, 6)}...{r.payer?.slice(-4)}
                    </td>
                    <td className="py-2.5 text-[#9CA3AF] font-mono text-xs">
                      {r.payee?.slice(0, 6)}...{r.payee?.slice(-4)}
                    </td>
                    <td className="py-2.5">
                      <Link href={`/window/${r.windowId}`} className="text-[#003FFF] font-mono text-xs hover:underline">
                        {r.windowId}
                      </Link>
                    </td>
                    <td className="py-2.5 text-[#9CA3AF] font-mono text-xs whitespace-nowrap">
                      {r.timestamp ? new Date(r.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(!receipts || receipts.length === 0) && (
        <p className="text-center text-[#9CA3AF] text-sm py-12">
          No receipts yet. Start the Gateway and run the simulator to generate traffic.
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-none p-4 text-center">
      <p className="text-[#003FFF] font-mono text-lg" style={{ fontWeight: 500 }}>{value}</p>
      <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mt-1">{label}</p>
    </div>
  );
}
