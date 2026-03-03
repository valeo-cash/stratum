"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export default function AddServiceButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("0.002");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, targetUrl: url, pricePerReq: parseFloat(price) }),
    });
    setLoading(false);
    setOpen(false);
    setName("");
    setUrl("");
    setPrice("0.002");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#003FFF] text-white text-sm font-medium rounded-none hover:bg-[#0033CC] transition-colors"
      >
        <Plus size={16} />
        Add Service
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white border border-[#E5E7EB] rounded-none p-6 w-full max-w-[440px] mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#0A0A0A] text-lg" style={{ fontWeight: 500 }}>
                Add Service
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[#9CA3AF] hover:text-[#0A0A0A]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">
                  Service Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My API Service"
                  className="w-full px-4 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-none text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none focus:border-[#003FFF] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">
                  Target URL
                </label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-4 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-none text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none focus:border-[#003FFF] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">
                  Price per Request (USDC)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-none text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none focus:border-[#003FFF] transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 px-4 py-2.5 bg-[#003FFF] text-white text-sm font-medium rounded-none hover:bg-[#0033CC] transition-colors disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Service"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
