import type { Config } from "tailwindcss";

export const stratumPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        card: "#FAFAFA",
        primary: "#3B82F6",
        "primary-hover": "#2563EB",
        secondary: "#6B7280",
        success: "#10B981",
        warning: "#FBBF24",
        error: "#EF4444",
        border: "#E5E7EB",
      },
      borderRadius: {
        DEFAULT: "0px",
        card: "0px",
        modal: "0px",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
};
