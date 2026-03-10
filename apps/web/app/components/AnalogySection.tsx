import FadeIn from "./FadeIn";

const analogies = [
  {
    title: "Visa", stat: "150M txns/day",
    description: "Doesn\u2019t send 150M bank wires. Nets and batches into a fraction.",
    logo: "/logos/visalogo.png",
    accent: false,
  },
  {
    title: "DTCC", stat: "$2.4Q/year",
    description: "Clears securities without moving the full value. Net settlement only.",
    logo: "/logos/dtcc.png",
    accent: false,
  },
  {
    title: "Stratum", stat: "1M+ payments/sec",
    description: "Compresses to <50 on-chain settlements. The clearinghouse for x402.",
    logo: "/logos/stratum.png",
    accent: true,
  },
];

export default function AnalogySection() {
  return (
    <section className="py-[120px] lg:py-[160px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
        <FadeIn>
          <h2 className="text-[#0A0A0A] mb-16 lg:mb-20" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 500, lineHeight: 1.3 }}>
            Every high-volume financial system has a clearinghouse.
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analogies.map((item, i) => (
            <FadeIn key={item.title} delay={i * 100}>
              <div className={`rounded-none border p-8 h-full transition-colors ${
                item.accent
                  ? "border-[#3B82F6]/30 bg-[#EFF6FF] hover:border-[#3B82F6]/50"
                  : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
              }`}>
                <div className="mb-5">
                  <img src={item.logo} alt={item.title} className={`object-contain ${item.title === "Stratum" ? "h-8" : "h-6"}`} />
                </div>
                <p className="text-lg font-medium mb-2 text-[#0A0A0A] font-mono">{item.stat}</p>
                <h3 className="text-[#9CA3AF] text-sm font-medium mb-3 uppercase tracking-wider">{item.title}</h3>
                <p className="text-[#6B7280] text-base leading-relaxed">{item.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={400} className="mt-16">
          <p className="text-[#9CA3AF] text-base">The agent economy needs the same infrastructure. Stratum is that infrastructure.</p>
        </FadeIn>
      </div>
    </section>
  );
}
