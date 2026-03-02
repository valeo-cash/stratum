"use client";

import { useState } from "react";

function tokenize(code: string) {
  const tokens: { type: string; text: string }[] = [];
  const regex = /(\/\/[^\n]*|'[^']*'|"[^"]*"|`[^`]*`|\b(?:import|from|const|let|var|function|return|export|default|new|await|async)\b|\b(?:true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|[{}()[\],;:.=+\-*/<>!&|?@]|\s+|\w+)/g;
  let match;
  while ((match = regex.exec(code))) {
    const text = match[0];
    let type = "text";
    if (/^\/\//.test(text)) type = "comment";
    else if (/^['"`]/.test(text)) type = "string";
    else if (/^(import|from|const|let|var|function|return|export|default|new|await|async)$/.test(text)) type = "keyword";
    else if (/^(true|false|null|undefined)$/.test(text)) type = "literal";
    else if (/^\d/.test(text)) type = "number";
    else if (/^[{}()[\],;:.=+\-*/<>!&|?@]$/.test(text)) type = "punctuation";
    else if (/^\s+$/.test(text)) type = "whitespace";
    tokens.push({ type, text });
  }
  return tokens;
}

const tokenColors: Record<string, string> = {
  comment: "#9CA3AF",
  string: "#059669",
  keyword: "#3B82F6",
  literal: "#3B82F6",
  number: "#D97706",
  punctuation: "#9CA3AF",
  text: "#374151",
  whitespace: "",
};

export default function CodeSnippet({ code, className = "" }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const tokens = tokenize(code);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-none border border-[#E5E7EB] bg-[#FAFAFA] overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-none bg-[#E5E7EB]" />
          <div className="w-3 h-3 rounded-none bg-[#E5E7EB]" />
          <div className="w-3 h-3 rounded-none bg-[#E5E7EB]" />
        </div>
        <button onClick={handleCopy} className="text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors font-mono">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-5 text-sm font-mono leading-relaxed overflow-x-auto">
        <code>
          {tokens.map((token, i) =>
            token.type === "whitespace" ? (
              <span key={i}>{token.text}</span>
            ) : (
              <span key={i} style={{ color: tokenColors[token.type] || "#374151" }}>{token.text}</span>
            )
          )}
        </code>
      </pre>
    </div>
  );
}
