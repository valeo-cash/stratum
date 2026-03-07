import FadeIn from "./FadeIn";

export default function WhyClearinghouse() {
  return (
    <section className="py-[120px] lg:py-[160px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <FadeIn>
            <div>
              <h2 className="text-[#0A0A0A]" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 500, lineHeight: 1.3 }}>
                Every payment system
              </h2>
              <p className="text-[#6B7280] mt-2" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 300, lineHeight: 1.3 }}>
                hits the same wall
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="space-y-6">
              <p className="text-[#6B7280] text-base lg:text-lg leading-relaxed">
                x402 works beautifully for the first thousand payments. Agent calls API,
                pays, gets response. But at scale &mdash; millions of agents calling
                thousands of APIs every minute &mdash; every single payment becomes an
                on-chain transaction. Facilitators are executing and paying gas on each
                one individually.
              </p>
              <p className="text-[#6B7280] text-base lg:text-lg leading-relaxed">
                This is the same problem Visa solved in 1973, DTCC solved for securities,
                and ACH solved for bank transfers. The answer was never faster rails. It
                was a clearinghouse &mdash; an intermediary that collects all the payments,
                figures out who actually owes what to whom, and outputs the minimum set of
                transfers needed to make everyone whole.
              </p>
              <p className="text-[#6B7280] text-base lg:text-lg leading-relaxed">
                Stratum is that clearinghouse for x402. It doesn&rsquo;t replace facilitators.
                It doesn&rsquo;t change the x402 protocol. It just sits between agents and
                facilitators, compresses the payment stream, and hands facilitators a clean,
                netted batch every 60 seconds.
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
