import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Sidebar from "./components/Sidebar";

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
  title: "Stratum Console",
  description: "Valeo Stratum — Service Provider Dashboard",
  other: { "theme-color": "#ffffff" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={gcNorth.variable}>
      <body className="bg-white text-[#0A0A0A] font-sans font-light antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 lg:ml-[260px] min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
