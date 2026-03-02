import React from "react";

type BadgeStatus = "active" | "pending" | "finalized" | "error";

interface BadgeProps {
  status: BadgeStatus;
  children: React.ReactNode;
  className?: string;
}

const statusClasses: Record<BadgeStatus, string> = {
  active: "bg-green-400/15 text-green-400 border-green-400/25",
  pending: "bg-amber-400/15 text-amber-400 border-amber-400/25",
  finalized: "bg-blue-400/15 text-blue-400 border-blue-400/25",
  error: "bg-red-400/15 text-red-400 border-red-400/25",
};

export function Badge({ status, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClasses[status]} ${className}`}
    >
      {children}
    </span>
  );
}
