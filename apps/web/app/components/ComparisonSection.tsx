import FadeIn from "./FadeIn";

const withoutItems = [
  "Every API call = an on-chain transaction",
  "$5,000/sec in gas fees",
  "Chain congestion \u2192 35\u00d7 fee spikes",
  "Every payment publicly visible",
  "Single chain dependency",
  "Single point of failure",
];

const withItems = [
  "1M calls settle as ~20 transfers",
  "$0.25/sec in gas fees (99.99% less)",
  "Payments clear instantly off-chain",
  "Only net settlements visible (private)",
  "Works on any chain",
  "Facilitator-agnostic",
];

export default function ComparisonSection() {
  return (
    <section id="comparison" className="py-[120px] lg:py-[160px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FadeIn>
            <div className="rounded-none bg-[#F3F4F6] p-8 h-full">
              <h3 className="text-[#9CA3AF] text-xl font-medium mb-8">Without Stratum</h3>
              <ul className="space-y-5">
                {withoutItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-base text-[#9CA3AF]">
                    <span className="mt-0.5 shrink-0">&times;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
          <FadeIn delay={150}>
            <div className="rounded-none bg-[#003FFF] p-8 h-full">
              <h3 className="text-white text-xl font-medium mb-8">With Stratum</h3>
              <ul className="space-y-5">
                {withItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-base text-white">
                    <span className="mt-0.5 shrink-0">{"\u2713"}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
