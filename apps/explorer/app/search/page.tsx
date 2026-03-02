import { getReceipt, getReceipts } from "../lib/gateway";
import { redirect } from "next/navigation";
import Link from "next/link";
import SearchBar from "../components/SearchBar";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim();
  if (!q) redirect("/");

  // Try exact receipt ID lookup
  const exact = await getReceipt(q);
  if (exact && exact.id) {
    redirect(`/receipt/${exact.id}`);
  }

  // Otherwise search all receipts by payer/payee address
  const all = await getReceipts({ limit: 1000 });
  const matches = (all || []).filter(
    (r: any) =>
      r.payer?.toLowerCase().includes(q.toLowerCase()) ||
      r.payee?.toLowerCase().includes(q.toLowerCase()) ||
      r.id?.includes(q)
  );

  return (
    <div className="py-10">
      <div className="max-w-[600px] mx-auto mb-10">
        <SearchBar />
      </div>

      <h2
        className="text-[#0A0A0A] mb-1"
        style={{ fontSize: "1.25rem", fontWeight: 500 }}
      >
        Search Results
      </h2>
      <p className="text-[#6B7280] text-sm mb-6">
        {matches.length} receipt{matches.length !== 1 ? "s" : ""} found for &ldquo;{q}&rdquo;
      </p>

      {matches.length === 0 ? (
        <p className="text-[#9CA3AF] text-sm py-8 text-center">
          No receipts match your query.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]">
                <th className="pb-3 font-normal">ID</th>
                <th className="pb-3 font-normal">Amount</th>
                <th className="pb-3 font-normal">Payer</th>
                <th className="pb-3 font-normal">Window</th>
                <th className="pb-3 font-normal">Time</th>
              </tr>
            </thead>
            <tbody>
              {matches.slice(0, 50).map((r: any) => (
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
      )}
    </div>
  );
}
