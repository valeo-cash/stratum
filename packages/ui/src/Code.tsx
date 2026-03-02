import React from "react";

interface InlineCodeProps {
  children: React.ReactNode;
  className?: string;
}

export function InlineCode({ children, className = "" }: InlineCodeProps) {
  return (
    <code
      className={`rounded bg-slate-800 px-1.5 py-0.5 text-sm font-mono text-blue-300 ${className}`}
    >
      {children}
    </code>
  );
}

interface CodeBlockProps {
  children: string;
  className?: string;
}

export function CodeBlock({ children, className = "" }: CodeBlockProps) {
  return (
    <pre
      className={`rounded-[12px] border border-slate-800 bg-slate-900 p-4 overflow-x-auto ${className}`}
    >
      <code className="text-sm font-mono text-slate-300">{children}</code>
    </pre>
  );
}
