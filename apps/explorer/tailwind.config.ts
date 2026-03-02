import type { Config } from "tailwindcss";
import { stratumPreset } from "@valeo/ui/tailwind";

const config: Config = {
  presets: [stratumPreset],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-gcnorth)", "system-ui", "sans-serif"],
      },
    },
  },
};
export default config;
