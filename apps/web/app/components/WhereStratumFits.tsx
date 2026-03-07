import FadeIn from "./FadeIn";

function FlowArrow() {
  return (
    <div className="flex items-center justify-center py-1">
      <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
        <path d="M10 0 L10 18 M4 14 L10 20 L16 14" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function FlowHArrow() {
  return (
    <div className="hidden md:flex items-center justify-center px-1">
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <path d="M0 10 L24 10 M20 4 L28 10 L20 16" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function FlowBox({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div className={`rounded-none border px-4 py-3 text-center text-sm font-mono ${
      accent
        ? "border-[#3B82F6]/40 bg-[#EFF6FF] text-[#1D4ED8]"
        : "border-[#E5E7EB] bg-[#FAFAFA] text-[#374151]"
    }`}>
      {label}
    </div>
  );
}

export default function WhereStratumFits() {
  return (
    <section className="py-[120px] lg:py-[160px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
        <FadeIn>
          <h2 className="text-[#0A0A0A] mb-4" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 500, lineHeight: 1.3 }}>
            Where Stratum fits
          </h2>
          <p className="text-[#6B7280] text-lg max-w-2xl mb-16 lg:mb-20">
            Stratum sits between the payment event and the on-chain settlement. It compresses the work a facilitator has to do.
          </p>
        </FadeIn>

        {/* Flow diagram */}
        <FadeIn delay={100}>
          <div className="flex flex-col md:flex-row items-center justify-center gap-0 mb-20">
            <FlowBox label="Agent" />
            <FlowHArrow />
            <div className="md:hidden"><FlowArrow /></div>
            <FlowBox label="x402 payment" />
            <FlowHArrow />
            <div className="md:hidden"><FlowArrow /></div>
            <FlowBox label="Stratum" accent />
            <FlowHArrow />
            <div className="md:hidden"><FlowArrow /></div>
            <FlowBox label="Netted batch" accent />
            <FlowHArrow />
            <div className="md:hidden"><FlowArrow /></div>
            <FlowBox label="Facilitator" />
            <FlowHArrow />
            <div className="md:hidden"><FlowArrow /></div>
            <FlowBox label="On-chain" />
          </div>
        </FadeIn>

        {/* Before / After comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <FadeIn delay={200}>
            <div className="rounded-none bg-[#F3F4F6] p-8 h-full">
              <h3 className="text-[#9CA3AF] text-lg font-medium mb-6">Without Stratum</h3>
              <div className="space-y-4 text-sm text-[#9CA3AF]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">&times;</span>
                  <span>Agent pays &rarr; Facilitator receives <strong className="text-[#6B7280]">10,000</strong> individual payment instructions</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">&times;</span>
                  <span>Facilitator executes <strong className="text-[#6B7280]">10,000</strong> on-chain transfers</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">&times;</span>
                  <span className="font-mono text-[#EF4444]">$5,000 in gas</span>
                </div>
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={300}>
            <div className="rounded-none bg-[#003FFF] p-8 h-full">
              <h3 className="text-white text-lg font-medium mb-6">With Stratum</h3>
              <div className="space-y-4 text-sm text-white">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">{"\u2713"}</span>
                  <span>Agent pays &rarr; Stratum collects <strong>10,000</strong> receipts</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">{"\u2713"}</span>
                  <span>Stratum nets to <strong>50</strong> transfers &rarr; Facilitator executes <strong>50</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">{"\u2713"}</span>
                  <span className="font-mono text-[#86EFAC]">$2.50 in gas</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Clarification */}
        <FadeIn delay={400}>
          <div className="rounded-none border border-[#E5E7EB] bg-white p-8 max-w-3xl">
            <p className="text-[#6B7280] text-sm leading-relaxed">
              <strong className="text-[#0A0A0A]">Stratum is not a facilitator.</strong>{" "}
              It doesn&rsquo;t verify x402 payments or sit in the HTTP request path. Stratum
              is a clearing coordinator &mdash; it receives signed payment receipts, compresses
              them through multilateral netting, and outputs the minimum set of transfers a
              facilitator needs to execute. The facilitator&rsquo;s job doesn&rsquo;t change.
              They just get better input.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
