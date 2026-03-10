"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2 py-1 text-[11px] font-mono bg-[#F3F4F6] border border-[#E5E7EB] text-[#9CA3AF] hover:text-[#374151] hover:border-[#D1D5DB] transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
