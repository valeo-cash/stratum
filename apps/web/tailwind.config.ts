import type { Config } from "tailwindcss";
import { stratumPreset } from "@valeo/ui/tailwind";

const config: Config = {
  presets: [stratumPreset as Config],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      ...stratumPreset.theme?.extend,
      fontFamily: {
        ...stratumPreset.theme?.extend?.fontFamily,
        sans: [
          "var(--font-gcnorth)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        headline: [
          "Quera",
          "var(--font-gcnorth)",
          "sans-serif",
        ],
      },
      colors: {
        ...stratumPreset.theme?.extend?.colors,
      },
    },
  },
};

export default config;
