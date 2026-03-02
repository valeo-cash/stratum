"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Receipt ID, hash, or agent address"
          className="w-full pl-10 pr-4 py-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-none text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none focus:border-[#003FFF] transition-colors font-mono"
        />
      </div>
      <button
        type="submit"
        className="px-5 py-3 bg-[#003FFF] text-white text-sm font-medium rounded-none hover:bg-[#0033CC] transition-colors"
      >
        Search
      </button>
    </form>
  );
}
