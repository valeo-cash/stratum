"use client";

import CountUp from "./CountUp";

const stats = [
  { label: "Logical TPS", value: 1000000, suffix: "+", live: true },
  { label: "Compression Ratio", value: 54256, suffix: ":1" },
  { label: "Cost per Txn", prefix: "$", value: 0.000005, decimals: 6 },
  { label: "Gas Saved", prefix: "$", value: 847, suffix: "K+" },
];

export default function StatsRow() {
  return (
    <section>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8 lg:gap-6">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
                {stat.live && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                )}
                {stat.label}
              </p>
              <p className="font-mono text-[#0A0A0A]" style={{ fontSize: "clamp(1.2rem, 2vw, 1.75rem)" }}>
                <CountUp
                  target={stat.value}
                  duration={2200}
                  prefix={stat.prefix || ""}
                  suffix={stat.suffix || ""}
                  decimals={stat.decimals || 0}
                />
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
