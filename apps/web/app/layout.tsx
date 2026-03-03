import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const gcNorth = localFont({
  src: [
    { path: "./fonts/GCNorthSans-ExtraLight.ttf", weight: "200" },
    { path: "./fonts/GCNorthSans-Light.ttf", weight: "300" },
    { path: "./fonts/GCNorthSans-Medium.ttf", weight: "500" },
    { path: "./fonts/GCNorthSans-SemiBold.ttf", weight: "600" },
    { path: "./fonts/GCNorthSans-Bold.ttf", weight: "700" },
  ],
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
    <html lang="en" className={gcNorth.variable}>
      <body className="bg-white text-[#0A0A0A] font-sans font-light antialiased">
        {children}
      </body>
    </html>
  );
}
