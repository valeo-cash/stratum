import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-none border border-[#E5E7EB] bg-white p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
