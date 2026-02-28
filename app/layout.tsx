import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const gcNorth = localFont({
  src: "./fonts/GCNorthSans-Light.ttf",
  weight: "300",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Valeo Stratum",
  description: "Valeo Stratum — March 3, 2026",
  other: {
    "theme-color": "#0040FF",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={gcNorth.className}>
        {children}
      </body>
    </html>
  );
}
