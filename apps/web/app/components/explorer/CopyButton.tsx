"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
      title="Copy"
    >
      {copied ? <Check size={14} className="text-[#10B981]" /> : <Copy size={14} />}
    </button>
  );
}
