import FadeIn from "./FadeIn";

const facilitatorBenefits = [
  "99% fewer on-chain transactions to execute",
  "99% less gas spending",
  "No infrastructure changes \u2014 receive netted batches instead of raw payment streams",
  "Compression ratios of 100:1 to 10,000:1",
];

const sellerBenefits = [
  "Get paid every 60 seconds automatically",
  "Register once with a wallet address \u2014 USDC arrives",
  "Don\u2019t need to understand netting, Merkle proofs, or clearing",
  "Same x402 flow you already use \u2014 nothing changes on your side",
];

export default function WhoBenefits() {
  return (
    <section className="py-[120px] lg:py-[160px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
        <FadeIn>
          <h2 className="text-[#0A0A0A] mb-16 lg:mb-20" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 500, lineHeight: 1.3 }}>
            Who benefits and how
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FadeIn delay={100}>
            <div className="rounded-none border border-[#3B82F6]/30 bg-[#EFF6FF] p-8 h-full">
              <p className="text-[11px] font-mono text-[#3B82F6] uppercase tracking-[0.15em] mb-2">Direct customer</p>
              <h3 className="text-[#0A0A0A] text-xl font-medium mb-6">For Facilitators</h3>
              <ul className="space-y-4 mb-8">
                {facilitatorBenefits.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-base text-[#374151] leading-relaxed">
                    <span className="mt-1 w-1.5 h-1.5 bg-[#3B82F6] rounded-full shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[#6B7280] text-base leading-relaxed italic border-t border-[#3B82F6]/20 pt-6">
                &ldquo;You already settle x402 payments. Stratum makes that 100x cheaper.&rdquo;
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={200}>
            <div className="rounded-none border border-[#E5E7EB] bg-white p-8 h-full">
              <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-2">Indirect beneficiary</p>
              <h3 className="text-[#0A0A0A] text-xl font-medium mb-6">For Sellers / API Providers</h3>
              <ul className="space-y-4 mb-8">
                {sellerBenefits.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-base text-[#374151] leading-relaxed">
                    <span className="mt-1 w-1.5 h-1.5 bg-[#9CA3AF] rounded-full shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[#6B7280] text-base leading-relaxed italic border-t border-[#E5E7EB] pt-6">
                &ldquo;You don&rsquo;t integrate Stratum. Your facilitator does. You just get paid faster.&rdquo;
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
