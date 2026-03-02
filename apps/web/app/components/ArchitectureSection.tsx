import FadeIn from "./FadeIn";

const techCards = [
  {
    title: "Cryptographic Receipts",
    description: "Every payment generates an Ed25519-signed receipt with canonical encoding. Tamper-proof, deterministic, independently verifiable.",
    icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#3B82F6]"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>),
  },
  {
    title: "Append-Only Merkle Tree",
    description: "Receipts are stored in an RFC 6962-compliant tree. Inclusion and consistency proofs let anyone verify the full audit trail.",
    icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#3B82F6]"><circle cx="12" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="12" r="2" /><circle cx="4" cy="19" r="2" /><circle cx="8" cy="19" r="2" /><circle cx="16" cy="19" r="2" /><circle cx="20" cy="19" r="2" /><line x1="12" y1="7" x2="6" y2="10" /><line x1="12" y1="7" x2="18" y2="10" /><line x1="6" y1="14" x2="4" y2="17" /><line x1="6" y1="14" x2="8" y2="17" /><line x1="18" y1="14" x2="16" y2="17" /><line x1="18" y1="14" x2="20" y2="17" /></svg>),
  },
  {
    title: "Multilateral Netting",
    description: "Aggregate net positions across all agents. Greedy matching pairs creditors with debtors to produce the minimum transfer set.",
    icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#3B82F6]"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" /></svg>),
  },
  {
    title: "Chain Anchoring",
    description: "One Merkle root per settlement window, anchored on Solana. The bridge from off-chain clearing to on-chain finality.",
    icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#3B82F6]"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>),
  },
];

export default function ArchitectureSection() {
  return (
    <section id="architecture" className="py-[120px] lg:py-[160px]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
        <FadeIn>
          <h2 className="text-[#0A0A0A] mb-4" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 500 }}>Under the hood</h2>
          <p className="text-[#6B7280] text-lg max-w-2xl mb-16 lg:mb-20">Four cryptographic primitives, composed into a clearing pipeline.</p>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="mb-16 lg:mb-20">
            <svg viewBox="0 0 900 160" className="w-full max-w-[800px] mx-auto" fill="none">
              {[
                { x: 0,   label: "Agent\u00a0API\u00a0Call" },
                { x: 225, label: "Receipt" },
                { x: 450, label: "Merkle\u00a0Tree" },
                { x: 675, label: "Settlement" },
              ].map((node, i) => (
                <g key={i}>
                  <rect x={node.x} y="40" width="160" height="70" rx="12" fill="#FAFAFA" stroke="#E5E7EB" strokeWidth="1" />
                  <text x={node.x + 80} y="80" textAnchor="middle" fill="#374151" fontSize="13" fontFamily="monospace">{node.label}</text>
                  {i < 3 && (
                    <>
                      <line x1={node.x + 160} y1="75" x2={node.x + 225} y2="75" stroke="#E5E7EB" strokeWidth="1" />
                      <polygon points={`${node.x + 220},71 ${node.x + 225},75 ${node.x + 220},79`} fill="#D1D5DB" />
                    </>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {techCards.map((card, i) => (
            <FadeIn key={card.title} delay={i * 80}>
              <div className="rounded-none border border-[#E5E7EB] bg-white p-6 h-full hover:border-[#D1D5DB] transition-colors">
                <div className="mb-4">{card.icon}</div>
                <h4 className="text-[#0A0A0A] text-sm font-medium mb-2">{card.title}</h4>
                <p className="text-[#6B7280] text-sm leading-relaxed">{card.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
