import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-gcnorth",
});

export const metadata: Metadata = {
  title: "Valeo Stratum — The Clearing Layer for AI Agent Payments",
  description:
    "Compress 1,000,000 agent transactions into 1 on-chain settlement. No new chain required.",
  other: {
    "theme-color": "#ffffff",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="bg-white text-[#0A0A0A] font-sans font-light antialiased">
        {children}
      </body>
    </html>
  );
}
