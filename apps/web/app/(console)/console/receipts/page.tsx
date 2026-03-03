import { getReceipts } from "@/app/lib/gateway";

export default async function ConsoleReceiptsPage() {
  const receipts = await getReceipts({ limit: 100 });

  if (!receipts) {
    return (
      <div className="p-6 lg:p-10 max-w-[1200px]">
        <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.5rem", fontWeight: 500 }}>Receipts</h1>
        <div className="mt-8 bg-[#FEF2F2] border border-[#FECACA] rounded-none p-6">
          <p className="text-[#991B1B] text-sm font-medium mb-1">Gateway Offline</p>
          <p className="text-[#6B7280] text-sm">Cannot connect to the Stratum Gateway.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1200px]">
      <h1 className="text-[#0A0A0A] mb-1" style={{ fontSize: "1.5rem", fontWeight: 500 }}>Receipts</h1>
      <p className="text-[#6B7280] text-sm mb-8">All receipts from the Gateway.</p>

      <p className="text-[11px] font-mono text-[#9CA3AF] mb-3">{receipts.length} receipt{receipts.length !== 1 ? "s" : ""}</p>

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
                <td className="py-2.5 text-[#6B7280] font-mono text-xs">{r.id?.slice(0, 12)}...</td>
                <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">${r.amount?.toFixed(4)}</td>
                <td className="py-2.5 text-[#9CA3AF] font-mono text-xs">{r.payer?.slice(0, 6)}...{r.payer?.slice(-4)}</td>
                <td className="py-2.5 text-[#9CA3AF] font-mono text-xs">{r.payee?.slice(0, 6)}...{r.payee?.slice(-4)}</td>
                <td className="py-2.5 text-[#6B7280] font-mono text-xs">{r.windowId}</td>
                <td className="py-2.5 text-[#9CA3AF] font-mono text-xs whitespace-nowrap">{r.timestamp ? new Date(r.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receipts.length === 0 && (
        <p className="text-[#9CA3AF] text-sm py-12 text-center">No receipts yet. Run the simulator to generate traffic.</p>
      )}
    </div>
  );
}
