import FadeIn from "./FadeIn";

export default function ProblemSection() {
  return (
    <section id="problem" className="py-[120px] lg:py-[160px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <FadeIn>
            <div>
              <h2 className="text-[#0A0A0A]" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 500, lineHeight: 1.3 }}>
                The Problem
              </h2>
              <p className="text-[#6B7280] mt-2" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 300, lineHeight: 1.3 }}>
                AI agents will generate 1M+ payments per second. Current chains can&rsquo;t clear that.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <div>
              <p className="text-[#6B7280] text-base lg:text-lg leading-relaxed mb-6">
                Stripe&rsquo;s 2025 Annual Letter identified the core constraint: blockchains need to support
                1M&ndash;1B transactions per second for the agent economy. At $0.005 gas per call,
                that&rsquo;s $432M/day in fees alone.
              </p>
              <p className="text-[#6B7280] text-base lg:text-lg leading-relaxed">
                The answer isn&rsquo;t a faster chain. It&rsquo;s a clearinghouse &mdash; the same
                infrastructure that powers every high-volume financial system.
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
