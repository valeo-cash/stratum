"use client";

import dynamic from "next/dynamic";

const GenerativeArt = dynamic(() => import("./GenerativeArt"), { ssr: false });

export default function HeroSection() {
  return (
    <section className="relative pt-24 lg:pt-32 pb-20 lg:pb-28 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-end pointer-events-none opacity-60">
        <div className="w-[800px] h-[600px] -mr-20 lg:mr-0">
          <GenerativeArt type="hero" width={800} height={600} animate colors={["#003FFF", "#003FFF"]} />
        </div>
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-12">
        <h1
          className="fade-in-title text-[#0A0A0A] max-w-4xl"
          style={{
            fontWeight: 500,
            fontSize: "clamp(2.4rem, 5.5vw, 4.5rem)",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          The Clearing Layer Between
          <br />
          Agents and Facilitators
        </h1>

        <p
          className="fade-in-subtitle mt-8 max-w-2xl"
          style={{
            fontSize: "clamp(1rem, 1.5vw, 1.25rem)",
            color: "#6B7280",
            lineHeight: 1.7,
          }}
        >
          Agents generate millions of payments. Facilitators settle them on-chain.
          Stratum sits in the middle &mdash; compressing 10,000 payment instructions
          into 50 net transfers before they ever hit the chain.
        </p>

        <div className="fade-in-cta flex flex-col sm:flex-row items-start gap-3 mt-10">
          <a
            href="/facilitators"
            className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] transition-colors"
          >
            I&rsquo;m a facilitator
          </a>
          <a
            href="/docs/facilitators"
            className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-[#0A0A0A] hover:border-[#D1D5DB] transition-colors"
          >
            I&rsquo;m a seller
          </a>
        </div>
      </div>
    </section>
  );
}
