import FadeIn from "./FadeIn";

export default function FacilitatorsSection() {
  return (
    <section className="py-[120px] lg:py-[160px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <FadeIn>
            <div>
              <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">For Service Providers</p>
              <h2 className="text-[#0A0A0A] mb-6" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 500, lineHeight: 1.2 }}>
                Automatic USDC settlement
              </h2>
              <p className="text-[#6B7280] text-lg leading-relaxed mb-8">
                Register your service. Stratum collects agent payments, nets them, and settles USDC directly to your wallet every 60 seconds.
              </p>
              <a href="/facilitators" className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] transition-colors">
                Register your service &rarr;
              </a>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF] text-sm">Weekly agent payments</span>
                <span className="text-[#0A0A0A] font-mono text-xl font-medium">500,000</span>
              </div>
              <div className="w-full h-px" />
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF] text-sm">Net USDC settlements</span>
                <span className="text-[#0A0A0A] font-mono text-xl font-medium">50</span>
              </div>
              <div className="w-full h-px" />
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF] text-sm">Your infrastructure cost</span>
                <span className="text-[#059669] font-mono text-xl font-medium">$0</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
