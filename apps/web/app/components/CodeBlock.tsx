"use client";

import { useState } from "react";

export default function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative rounded-xl bg-[#111827] overflow-hidden">
      <button
        onClick={copy}
        className="absolute top-3 right-3 px-3 py-1.5 text-xs font-medium text-[#9CA3AF] border border-[#374151] rounded bg-[#1F2937] hover:bg-[#374151] hover:text-white transition-colors"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="p-6 overflow-x-auto text-sm leading-relaxed font-mono text-[#E5E7EB]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
