"use client";

import { useState } from "react";
import FadeIn from "./FadeIn";
import ConsoleMockup from "./ConsoleMockup";
import CodeSnippet from "./CodeSnippet";

const tabs = [
  { id: "nocode", label: "No Code", badge: "Live" },
  { id: "oneline", label: "One Line", badge: null },
  { id: "sdk", label: "Full SDK", badge: null },
];

const oneLineCode = `// Before — every API call settles on-chain
const paywall = createPaywall({
  facilitatorUrl: 'https://x402.coinbase.com'
})

// After — Stratum clears, nets, and batch-settles
const paywall = createPaywall({
  facilitatorUrl: 'https://stratum.valeo.com/v1/facilitate'
})`;

const sdkCode = `import { StratumGateway } from '@valeo/stratum'

const gateway = new StratumGateway({
  facilitator: 'https://x402.coinbase.com',  // YOUR facilitator
  settlementWindow: '5m',
  chain: 'solana',
  asset: 'USDC',
})

// Stratum clears + nets. Facilitator settles.
app.use('/api', gateway.middleware())`;

export default function IntegrationSection() {
  const [active, setActive] = useState("nocode");

  return (
    <section id="integration" className="py-[120px] lg:py-[160px]">
      <div className="max-w-[900px] mx-auto px-6 lg:px-12">
        <FadeIn>
          <h2 className="text-[#0A0A0A] mb-4" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 500 }}>
            Integration so easy it feels wrong
          </h2>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="flex gap-1 mb-10 mt-10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`px-5 py-2 rounded-none text-sm font-medium transition-all flex items-center gap-2 ${
                  active === tab.id
                    ? "bg-[#F3F4F6] text-[#0A0A0A] border border-[#E5E7EB]"
                    : "text-[#9CA3AF] hover:text-[#6B7280] border border-transparent"
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className="text-[10px] font-mono bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] rounded-none px-2 py-0.5 leading-none">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={200}>
          <div>
            {active === "nocode" && (
              <div>
                <ConsoleMockup />
                <p className="text-[#9CA3AF] text-sm mt-6">No blockchain knowledge. No code changes. No SDK. Real endpoint in 30 seconds.</p>
              </div>
            )}
            {active === "oneline" && (
              <div>
                <CodeSnippet code={oneLineCode} />
                <p className="text-[#9CA3AF] text-sm mt-6">Already using x402? Change one URL. Same facilitator settles. Stratum just clears the traffic first.</p>
              </div>
            )}
            {active === "sdk" && (
              <div>
                <CodeSnippet code={sdkCode} />
                <p className="text-[#9CA3AF] text-sm mt-6">Self-host your own clearing node. Full control. Your facilitator, your chain.</p>
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
