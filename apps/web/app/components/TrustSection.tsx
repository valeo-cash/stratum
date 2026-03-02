import FadeIn from "./FadeIn";

const levels = [
  {
    title: "Trusted",
    description: "Stratum is trusted to clear correctly. The gateway signs receipts and computes netting. Operators can run their own clearing node for full independence.",
    items: ["Receipt signing", "Netting computation", "Window management"],
  },
  {
    title: "Verified",
    description: "Every receipt, Merkle proof, and settlement batch is independently verifiable by any third party. Explorer provides real-time verification.",
    items: ["Ed25519 signatures", "Merkle inclusion proofs", "Consistency proofs"],
  },
  {
    title: "On-Chain",
    description: "Settlement instructions are executed by the facilitator. Merkle roots are anchored on Solana. Finality is on-chain.",
    items: ["USDC transfers via facilitator", "Merkle root anchoring", "On-chain audit trail"],
  },
];

export default function TrustSection() {
  return (
    <section id="trust" className="py-[120px] lg:py-[160px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
        <FadeIn>
          <h2 className="text-[#0A0A0A] mb-4" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 500 }}>Trust and verification</h2>
          <p className="text-[#6B7280] text-lg max-w-2xl mb-16 lg:mb-20">Stratum is designed so you don&apos;t have to trust Stratum.</p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {levels.map((level, i) => (
            <FadeIn key={level.title} delay={i * 100}>
              <div className="rounded-none border border-[#E5E7EB] bg-white p-8 h-full hover:border-[#D1D5DB] transition-colors">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-8 h-8 rounded-none bg-[#F3F4F6] flex items-center justify-center text-[#0A0A0A] font-mono text-sm font-bold">{i + 1}</span>
                  <h3 className="text-[#0A0A0A] font-medium">{level.title}</h3>
                </div>
                <p className="text-[#6B7280] text-sm leading-relaxed mb-5">{level.description}</p>
                <ul className="space-y-2">
                  {level.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-[#9CA3AF]">
                      <span className="w-1 h-1 rounded-full bg-[#D1D5DB]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={400} className="mt-16">
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <a href="https://explorer.stratum.valeo.com" className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] transition-colors">
              Open Explorer &rarr;
            </a>
            <a href="/security" className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-[#0A0A0A] hover:border-[#D1D5DB] transition-colors">
              Security Details
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
