import React from "react";

interface StatProps {
  label: string;
  value: string | number;
  detail?: string;
  className?: string;
}

export function Stat({ label, value, detail, className = "" }: StatProps) {
  return (
    <div
      className={`rounded-[12px] border border-slate-800 bg-slate-900 p-5 ${className}`}
    >
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}
