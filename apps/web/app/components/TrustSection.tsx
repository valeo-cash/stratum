import FadeIn from "./FadeIn";

const levels = [
  {
    title: "TEE-Secured",
    description: "Netting computation runs inside an Intel TDX Trusted Execution Environment on Phala Cloud. Cryptographic attestation proves the exact code that computed every settlement batch.",
    items: ["Intel TDX hardware enclave", "Cryptographic attestation per window", "Open-source on Phala\u2019s dstack"],
  },
  {
    title: "Verified",
    description: "Every receipt, Merkle proof, and settlement batch is independently verifiable by any third party. Explorer provides real-time verification.",
    items: ["Ed25519 signatures", "Merkle inclusion proofs", "Consistency proofs"],
  },
  {
    title: "On-Chain",
    description: "Stratum settles USDC automatically to service wallets on Solana and Base. Merkle roots are anchored on-chain. Every settlement is independently verifiable.",
    items: ["Automatic USDC settlement", "Merkle root on-chain anchoring", "Public analytics API"],
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

        <FadeIn delay={350} className="mt-16">
          <p className="text-[#6B7280] text-base leading-relaxed max-w-3xl mb-10">
            Three layers of trust: hardware attestation (TEE), mathematical proof (Merkle),
            and on-chain finality (Solana). Circle offers one. Stratum offers all three.
          </p>
        </FadeIn>

        <FadeIn delay={400}>
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
