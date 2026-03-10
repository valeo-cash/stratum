"use client";

import { useState } from "react";
import FadeIn from "./FadeIn";

const tabs = [
  { id: "facilitator", label: "I\u2019m a facilitator" },
  { id: "seller", label: "I\u2019m a seller / API provider" },
];

export default function IntegrationSection() {
  const [active, setActive] = useState("facilitator");

  return (
    <section id="integration" className="py-[120px] lg:py-[160px]">
      <div className="max-w-[900px] mx-auto px-6 lg:px-12">
        <FadeIn>
          <h2 className="text-[#0A0A0A] mb-4" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 500 }}>
            Two paths, one result
          </h2>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="flex gap-1 mb-10 mt-10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`px-5 py-2 rounded-none text-sm font-medium transition-all border ${
                  active === tab.id
                    ? "bg-[#F3F4F6] text-[#0A0A0A] border-[#E5E7EB]"
                    : "text-[#9CA3AF] hover:text-[#6B7280] border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={200}>
          <div>
            {active === "facilitator" && (
              <div className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-8 lg:p-10">
                <h3 className="text-[#0A0A0A] text-xl font-medium mb-4">
                  Submit payments. Stratum settles.
                </h3>
                <p className="text-[#6B7280] text-base leading-relaxed mb-6">
                  Install the SDK, call <code className="text-[#3B82F6] bg-[#F3F4F6] px-1 text-sm font-mono">stratum.submit()</code> where
                  you currently settle on-chain. Stratum batches, nets, and executes USDC
                  transfers automatically. You get a txHash for every payment.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3 text-base text-[#6B7280]">
                    <span className="mt-1 w-1.5 h-1.5 bg-[#3B82F6] rounded-full shrink-0" />
                    <code className="text-[#374151] bg-[#F3F4F6] px-1 text-sm font-mono">npm install @v402valeo/facilitator</code> &mdash; one package, zero dependencies
                  </li>
                  <li className="flex items-start gap-3 text-base text-[#6B7280]">
                    <span className="mt-1 w-1.5 h-1.5 bg-[#3B82F6] rounded-full shrink-0" />
                    3 lines of code to integrate &mdash; submit, check status, done
                  </li>
                  <li className="flex items-start gap-3 text-base text-[#6B7280]">
                    <span className="mt-1 w-1.5 h-1.5 bg-[#3B82F6] rounded-full shrink-0" />
                    Real USDC settlement every 60 seconds with on-chain proof
                  </li>
                </ul>
                <a
                  href="/docs/facilitators"
                  className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] transition-colors"
                >
                  Integration guide &rarr;
                </a>
              </div>
            )}

            {active === "seller" && (
              <div className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-8 lg:p-10">
                <h3 className="text-[#0A0A0A] text-xl font-medium mb-4">
                  Register your service and wallet
                </h3>
                <p className="text-[#6B7280] text-base leading-relaxed mb-6">
                  USDC arrives every 60 seconds. You don&rsquo;t need to understand
                  clearing &mdash; your facilitator handles it. Nothing changes on your
                  side.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3 text-base text-[#6B7280]">
                    <span className="mt-1 w-1.5 h-1.5 bg-[#9CA3AF] rounded-full shrink-0" />
                    One API call to register your service
                  </li>
                  <li className="flex items-start gap-3 text-base text-[#6B7280]">
                    <span className="mt-1 w-1.5 h-1.5 bg-[#9CA3AF] rounded-full shrink-0" />
                    Provide a wallet address for Solana or Base
                  </li>
                  <li className="flex items-start gap-3 text-base text-[#6B7280]">
                    <span className="mt-1 w-1.5 h-1.5 bg-[#9CA3AF] rounded-full shrink-0" />
                    USDC settles automatically every 60 seconds
                  </li>
                </ul>
                <a
                  href="/facilitators#get-started"
                  className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] transition-colors"
                >
                  Register your service &rarr;
                </a>
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
