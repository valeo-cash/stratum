"use client";

import { useState, useMemo } from "react";

interface Receipt {
  id: string;
  serviceId: string;
  windowId: string;
  sequence: number;
  payerAddress: string;
  payeeAddress: string;
  amount: number;
  asset: string;
  resourcePath: string;
  receiptHash: string;
  createdAt: string;
}

interface ServiceInfo {
  id: string;
  name: string;
}

interface WindowInfo {
  windowId: string;
}

const PAGE_SIZE = 25;

export default function ReceiptsTable({
  receipts,
  services,
  windows,
}: {
  receipts: Receipt[];
  services: ServiceInfo[];
  windows: WindowInfo[];
}) {
  const [serviceFilter, setServiceFilter] = useState("");
  const [addressFilter, setAddressFilter] = useState("");
  const [windowFilter, setWindowFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  const serviceMap = useMemo(
    () => Object.fromEntries(services.map((s) => [s.id, s.name])),
    [services]
  );

  const filtered = useMemo(() => {
    let result = receipts;

    if (serviceFilter) {
      result = result.filter((r) => r.serviceId === serviceFilter);
    }
    if (addressFilter) {
      const q = addressFilter.toLowerCase();
      result = result.filter(
        (r) =>
          r.payerAddress.toLowerCase().includes(q) ||
          r.payeeAddress.toLowerCase().includes(q)
      );
    }
    if (windowFilter) {
      result = result.filter((r) => r.windowId === windowFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((r) => new Date(r.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400_000;
      result = result.filter((r) => new Date(r.createdAt).getTime() < to);
    }

    return result;
  }, [receipts, serviceFilter, addressFilter, windowFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div>
          <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-1.5">
            Service
          </label>
          <select
            value={serviceFilter}
            onChange={(e) => {
              setServiceFilter(e.target.value);
              setPage(0);
            }}
            className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-none text-sm text-[#0A0A0A] outline-none"
          >
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-1.5">
            Agent Address
          </label>
          <input
            value={addressFilter}
            onChange={(e) => {
              setAddressFilter(e.target.value);
              setPage(0);
            }}
            placeholder="0x..."
            className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-none text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-1.5">
            Window
          </label>
          <select
            value={windowFilter}
            onChange={(e) => {
              setWindowFilter(e.target.value);
              setPage(0);
            }}
            className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-none text-sm text-[#0A0A0A] outline-none"
          >
            <option value="">All windows</option>
            {windows.map((w) => (
              <option key={w.windowId} value={w.windowId}>
                {w.windowId}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-1.5">
            From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-none text-sm text-[#0A0A0A] outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-1.5">
            To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-none text-sm text-[#0A0A0A] outline-none"
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-[11px] font-mono text-[#9CA3AF] mb-3">
        {filtered.length} receipt{filtered.length !== 1 ? "s" : ""} found
      </p>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.1em]">
              <th className="pb-3 font-normal">ID</th>
              <th className="pb-3 font-normal">Service</th>
              <th className="pb-3 font-normal">Amount</th>
              <th className="pb-3 font-normal">Payer</th>
              <th className="pb-3 font-normal">Window</th>
              <th className="pb-3 font-normal">Resource</th>
              <th className="pb-3 font-normal">Time</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.id} className="border-t border-[#E5E7EB]">
                <td className="py-2.5 text-[#6B7280] font-mono text-xs">
                  {r.id.slice(0, 8)}...
                </td>
                <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">
                  {serviceMap[r.serviceId] ?? "—"}
                </td>
                <td className="py-2.5 text-[#0A0A0A] font-mono text-xs">
                  ${r.amount.toFixed(4)}
                </td>
                <td className="py-2.5 text-[#9CA3AF] font-mono text-xs">
                  {r.payerAddress.slice(0, 6)}...{r.payerAddress.slice(-4)}
                </td>
                <td className="py-2.5 text-[#6B7280] font-mono text-xs">
                  {r.windowId}
                </td>
                <td className="py-2.5 text-[#6B7280] font-mono text-xs">
                  {r.resourcePath}
                </td>
                <td className="py-2.5 text-[#9CA3AF] font-mono text-xs whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleString("en-US", {
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E5E7EB]">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs font-mono text-[#6B7280] border border-[#E5E7EB] rounded-none hover:border-[#D1D5DB] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-[11px] font-mono text-[#9CA3AF]">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-xs font-mono text-[#6B7280] border border-[#E5E7EB] rounded-none hover:border-[#D1D5DB] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
