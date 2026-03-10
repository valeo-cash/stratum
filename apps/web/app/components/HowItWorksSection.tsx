"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import CountUp from "./CountUp";

const StratumScene = dynamic(() => import("./StratumScene"), { ssr: false });

const panels = [
  { step: "Step 1", title: "The chaos", number: 1247891, label: "API calls / 5 min", description: "AI agents generate millions of API calls per second. Today, every single one is a separate on-chain transaction — $5,000/sec in gas.", badge: { text: "$5,000/sec in gas", color: "red" as const } },
  { step: "Step 2", title: "Receipts, not transactions", number: 0, label: "on-chain transactions", description: "Stratum intercepts each payment and signs a cryptographic receipt off-chain. Microseconds. Zero gas. The money hasn't moved.", badge: { text: "0 on-chain · $0 gas", color: "green" as const } },
  { step: "Step 3", title: "Debts cancel out", number: 73.4, decimals: 1, suffix: "%", label: "eliminated through netting", description: "At settlement time, bilateral obligations cancel out. 847 positions become 23 net transfers. $137K never needs to move.", badge: { text: "$187K → $49K net", color: "neutral" as const } },
  { step: "Step 4", title: "One slab on-chain", number: 24, label: "total on-chain operations", description: "23 USDC transfers via facilitator. 1 Merkle root anchored on Solana. From 1.2 million transactions to 24.", badge: { text: "54,256 : 1 compression", color: "neutral" as const } },
];

const badgeColors = {
  red: "bg-[#FEE2E2] border-[#FECACA] text-[#EF4444]",
  green: "bg-[#D1FAE5] border-[#A7F3D0] text-[#059669]",
  neutral: "bg-[#F3F4F6] border-[#E5E7EB] text-[#6B7280]",
};

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight - window.innerHeight;
      setProgress(Math.max(0, Math.min(1, -rect.top / sectionHeight)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activePanel = useMemo(() => {
    if (progress < 0.25) return 0;
    if (progress < 0.5) return 1;
    if (progress < 0.75) return 2;
    return 3;
  }, [progress]);

  const panelOpacity = useMemo(() => {
    const phase = progress * 4;
    const idx = Math.floor(phase);
    const t = phase - idx;
    return panels.map((_, i) => {
      if (i === idx) return Math.min(t * 4, 1);
      if (i === idx - 1 && t < 0.15) return 1 - t / 0.15;
      if (i === activePanel) return 1;
      return 0;
    });
  }, [progress, activePanel]);

  const panel = panels[activePanel];

  return (
    <section id="how-it-works" ref={sectionRef} className="relative" style={{ height: "400vh" }}>
      <div className="sticky top-0 h-screen flex items-center overflow-hidden bg-white">
        <div className="absolute inset-0 z-0">
          <StratumScene progress={progress} />
        </div>

        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="hidden lg:block" />
            <div
              className="rounded-none border border-[#E5E7EB] bg-white/90 backdrop-blur-xl p-8 sm:p-10 max-w-lg ml-auto shadow-sm"
              style={{ opacity: Math.max(panelOpacity[activePanel], progress > 0.02 ? 0.3 : 0) }}
            >
              <p className="text-[#9CA3AF] text-[11px] font-mono uppercase tracking-[0.15em] mb-3">{panel.step}</p>
              <h3 className="text-[#0A0A0A] text-3xl mb-5" style={{ fontWeight: 500 }}>{panel.title}</h3>
              <div className="mb-5">
                <p className="text-[#0A0A0A] font-mono" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1 }}>
                  {activePanel === 0 && <CountUp target={1247891} duration={2000} />}
                  {activePanel === 1 && <span>0</span>}
                  {activePanel === 2 && <CountUp target={73.4} duration={1500} decimals={1} suffix="%" />}
                  {activePanel === 3 && <CountUp target={24} duration={1200} />}
                </p>
                <p className="text-[#9CA3AF] text-sm mt-2">{panel.label}</p>
              </div>
              <p className="text-[#6B7280] text-base leading-relaxed mb-5">{panel.description}</p>
              <div className={`inline-flex items-center gap-2 rounded-none border px-4 py-1.5 ${badgeColors[panel.badge.color]}`}>
                {panel.badge.color === "red" && <span className="w-1.5 h-1.5 rounded-none bg-[#EF4444] animate-pulse" />}
                {panel.badge.color === "green" && <span className="w-1.5 h-1.5 rounded-none bg-[#10B981]" />}
                <span className="text-xs font-mono">{panel.badge.text}</span>
              </div>
              <div className="flex gap-2 mt-8">
                {panels.map((_, i) => (
                  <div key={i} className={`h-1 rounded-none transition-all duration-500 ${i <= activePanel ? "bg-[#0A0A0A] w-6" : "bg-[#E5E7EB] w-3"}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
