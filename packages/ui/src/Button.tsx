import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#003FFF] text-white hover:bg-[#0033CC] active:bg-[#002DB3]",
  secondary:
    "bg-transparent text-[#6B7280] border border-[#E5E7EB] hover:border-[#D1D5DB] hover:text-[#0A0A0A]",
  ghost:
    "bg-transparent text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#0A0A0A]",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-none px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
