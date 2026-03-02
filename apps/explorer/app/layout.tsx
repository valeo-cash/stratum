import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const gcNorth = localFont({
  src: [
    { path: "./fonts/GCNorthSans-ExtraLight.ttf", weight: "200", style: "normal" },
    { path: "./fonts/GCNorthSans-Light.ttf", weight: "300", style: "normal" },
    { path: "./fonts/GCNorthSans-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/GCNorthSans-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/GCNorthSans-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-gcnorth",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stratum Explorer",
  description: "Verify any agent payment receipt against its on-chain Merkle root.",
  other: { "theme-color": "#ffffff" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={gcNorth.variable}>
      <body className="bg-white text-[#0A0A0A] font-sans font-light antialiased min-h-screen">
        <header className="px-6 lg:px-12 py-5 flex items-center justify-between max-w-[1000px] mx-auto">
          <a href="/" className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-none bg-[#003FFF] flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="text-[14px] font-medium text-[#0A0A0A]">Stratum Explorer</span>
          </a>
          <a
            href="https://stratum.valeo.com"
            className="text-[12px] text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
          >
            stratum.valeo.com
          </a>
        </header>
        <main className="max-w-[1000px] mx-auto px-6 lg:px-12 pb-16">
          {children}
        </main>
      </body>
    </html>
  );
}
