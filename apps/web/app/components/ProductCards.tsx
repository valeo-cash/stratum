"use client";

import dynamic from "next/dynamic";
import FadeIn from "./FadeIn";

const GenerativeArt = dynamic(() => import("./GenerativeArt"), { ssr: false });

const products = [
  { title: "Stratum Gateway", description: "Route agent payment flows through net settlement. One endpoint.", art: "convergence" as const, href: "#how-it-works" },
  { title: "Stratum Console", description: "Track receipts, compression ratios, and net exposure in real time.", art: "grid" as const, href: "/console" },
  { title: "Stratum Explorer", description: "Cryptographically validate any receipt against its settlement proof.", art: "tree" as const, href: "https://explorer.stratum.valeo.com" },
  { title: "Stratum SDK", description: "Run your own clearing node. Full protocol-level access.", art: "matrix" as const, href: "/docs#integration" },
];

export default function ProductCards() {
  return (
    <section className="py-[120px] lg:py-[160px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
        <FadeIn>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-6 mb-16 lg:mb-20">
            <h2 className="text-[#0A0A0A]" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 500, lineHeight: 1.2 }}>
              An Open Clearing Infrastructure for the Agent Economy
            </h2>
            <p className="text-[#6B7280] text-base lg:text-lg leading-relaxed self-end">
              Stratum enables deterministic clearing for AI-native payments.
              No new chain. No protocol changes. One integration endpoint.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product, i) => (
            <FadeIn key={product.title} delay={i * 80}>
              <a href={product.href} className="block group">
                <div className="rounded-none overflow-hidden transition-all duration-300 h-full">
                  <div className="h-[200px] flex items-center justify-center p-4 overflow-hidden bg-[#FAFAFA]">
                    <GenerativeArt type={product.art} width={280} height={180} animate colors={["#3B82F6", "#10B981"]} />
                  </div>
                  <div className="px-0 pb-5 pt-3">
                    <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">
                      {product.title.replace("Stratum ", "")}
                    </p>
                    <p className="text-sm text-[#6B7280] leading-relaxed">{product.description}</p>
                  </div>
                </div>
              </a>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
