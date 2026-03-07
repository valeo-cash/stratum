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
                <h3 className="text-[#0A0A0A] text-lg font-medium mb-4">
                  Point your payment pipeline at Stratum&rsquo;s output
                </h3>
                <p className="text-[#6B7280] text-sm leading-relaxed mb-6">
                  Receive 50 netted transfers instead of 10,000 raw ones. Same settlement
                  logic you already run. Stratum compresses your input &mdash; your
                  infrastructure doesn&rsquo;t change.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3 text-sm text-[#6B7280]">
                    <span className="mt-1 w-1.5 h-1.5 bg-[#3B82F6] rounded-full shrink-0" />
                    Register for netted batches via webhook or polling API
                  </li>
                  <li className="flex items-start gap-3 text-sm text-[#6B7280]">
                    <span className="mt-1 w-1.5 h-1.5 bg-[#3B82F6] rounded-full shrink-0" />
                    Execute the minimum transfer set on Solana or Base
                  </li>
                  <li className="flex items-start gap-3 text-sm text-[#6B7280]">
                    <span className="mt-1 w-1.5 h-1.5 bg-[#3B82F6] rounded-full shrink-0" />
                    Or let Stratum settle automatically &mdash; zero work on your end
                  </li>
                </ul>
                <a
                  href="/facilitators"
                  className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] transition-colors"
                >
                  Facilitator integration &rarr;
                </a>
              </div>
            )}

            {active === "seller" && (
              <div className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-8 lg:p-10">
                <h3 className="text-[#0A0A0A] text-lg font-medium mb-4">
                  Register your service and wallet
                </h3>
                <p className="text-[#6B7280] text-sm leading-relaxed mb-6">
                  USDC arrives every 60 seconds. You don&rsquo;t need to understand
                  clearing &mdash; your facilitator handles it. Nothing changes on your
                  side.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3 text-sm text-[#6B7280]">
                    <span className="mt-1 w-1.5 h-1.5 bg-[#9CA3AF] rounded-full shrink-0" />
                    One API call to register your service
                  </li>
                  <li className="flex items-start gap-3 text-sm text-[#6B7280]">
                    <span className="mt-1 w-1.5 h-1.5 bg-[#9CA3AF] rounded-full shrink-0" />
                    Provide a wallet address for Solana or Base
                  </li>
                  <li className="flex items-start gap-3 text-sm text-[#6B7280]">
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
