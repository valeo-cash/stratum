import type { Metadata } from "next";
import Footer from "../../components/Footer";
import FadeIn from "../../components/FadeIn";

export const metadata: Metadata = {
  title: "Security — Valeo Stratum",
  description: "Trust model, threat model, and cryptographic primitives used by Valeo Stratum.",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[#0A0A0A] text-3xl font-medium mt-20 mb-6 first:mt-0">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[#6B7280] text-base leading-relaxed mb-4">{children}</p>;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded-none bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.5 text-sm font-mono text-[#3B82F6]">{children}</code>;
}

export default function SecurityPage() {
  return (
    <>
      <main className="min-h-screen pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-12">
          <FadeIn>
            <h1 className="text-[#0A0A0A] text-4xl font-medium mb-4">Security</h1>
            <P>
              Stratum is designed so that trust is minimized and verification is maximized.
              This page explains what is trusted, what is verified, and what is anchored on-chain.
            </P>
          </FadeIn>

          <FadeIn delay={100}>
            <SectionTitle>Trust Model</SectionTitle>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-6">
                <h3 className="font-mono text-[#3B82F6] text-xs font-medium mb-3 uppercase tracking-wider">TEE-Secured (Hardware)</h3>
                <P>
                  The Stratum node runs inside an Intel TDX enclave on Phala Cloud.
                  Cryptographic attestation (TDX Quote) proves exactly what code executed
                  the netting computation. Even the operator cannot tamper with execution
                  or extract keys.
                </P>
              </div>
              <div className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-6">
                <h3 className="font-mono text-[#10B981] text-xs font-medium mb-3 uppercase tracking-wider">Verified</h3>
                <P>
                  Every receipt signature is independently verifiable.
                  Merkle inclusion proofs confirm receipt existence.
                  The sum-to-zero netting invariant is mathematically guaranteed.
                </P>
              </div>
              <div className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-6">
                <h3 className="font-mono text-[#D97706] text-xs font-medium mb-3 uppercase tracking-wider">On-Chain</h3>
                <P>
                  Only Merkle roots are anchored on-chain &mdash; one 32-byte hash per settlement window.
                  This is a data commitment, not a payment. Anyone can verify.
                </P>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <SectionTitle>Threat Model</SectionTitle>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="space-y-6 mb-8">
              <div>
                <h4 className="text-[#0A0A0A] text-sm font-medium mb-2">Malicious Agent (replay attack)</h4>
                <P>
                  Every receipt contains an idempotency key: <InlineCode>SHA-256(payer + payee + resource_hash + amount + nonce)</InlineCode>.
                  Duplicate keys are rejected at ingestion. An agent cannot replay a receipt to extract extra value.
                </P>
              </div>
              <div>
                <h4 className="text-[#0A0A0A] text-sm font-medium mb-2">Compromised Facilitator</h4>
                <P>
                  Stratum&apos;s Merkle proofs are independently verifiable. If a facilitator claims a receipt
                  does not exist, any party can produce the inclusion proof from the on-chain root.
                  The facilitator cannot deny settlements that Stratum has committed to.
                </P>
              </div>
              <div>
                <h4 className="text-[#0A0A0A] text-sm font-medium mb-2">Stratum Node Failure</h4>
                <P>
                  The write-ahead log (WAL) ensures crash recovery. All mutations are logged before execution.
                  On restart, pending operations replay from the last checkpoint. No funds are at risk because
                  Stratum never holds custody &mdash; unfinalized windows simply resume.
                </P>
              </div>
              <div>
                <h4 className="text-[#0A0A0A] text-sm font-medium mb-2">Receipt Forgery</h4>
                <P>
                  Receipts are Ed25519 signed by the Stratum node. Forging a receipt requires the node&apos;s
                  private key. Verification requires only the public key, which is published.
                  Canonical encoding ensures signatures cannot be transferred between different receipt data.
                </P>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <SectionTitle>Cryptographic Primitives</SectionTitle>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="text-left py-2 pr-6 text-[11px] text-[#9CA3AF] uppercase tracking-wider">Primitive</th>
                    <th className="text-left py-2 pr-6 text-[11px] text-[#9CA3AF] uppercase tracking-wider">Usage</th>
                    <th className="text-left py-2 text-[11px] text-[#9CA3AF] uppercase tracking-wider">Library</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  <tr>
                    <td className="py-3 pr-6 font-mono text-[#3B82F6] text-sm">Ed25519</td>
                    <td className="py-3 pr-6 text-[#6B7280]">Receipt signing, window head signing</td>
                    <td className="py-3 font-mono text-[#9CA3AF] text-sm">@noble/ed25519</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 font-mono text-[#3B82F6] text-sm">SHA-256</td>
                    <td className="py-3 pr-6 text-[#6B7280]">Merkle tree hashing, receipt hashing, idempotency keys</td>
                    <td className="py-3 font-mono text-[#9CA3AF] text-sm">@noble/hashes</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 font-mono text-[#3B82F6] text-sm">SHA-512</td>
                    <td className="py-3 pr-6 text-[#6B7280]">Ed25519 internal hashing</td>
                    <td className="py-3 font-mono text-[#9CA3AF] text-sm">@noble/hashes</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 font-mono text-[#3B82F6] text-sm">RFC 6962</td>
                    <td className="py-3 pr-6 text-[#6B7280]">Merkle tree structure (0x00 leaf, 0x01 node prefixes)</td>
                    <td className="py-3 font-mono text-[#9CA3AF] text-sm">Custom implementation</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 font-mono text-[#3B82F6] text-sm">Canonical Encoding</td>
                    <td className="py-3 pr-6 text-[#6B7280]">Deterministic JSON serialization for signing</td>
                    <td className="py-3 font-mono text-[#9CA3AF] text-sm">Custom (sorted keys, BigInt/Uint8Array encoding)</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-6 font-mono text-[#3B82F6] text-sm">Intel TDX Quote</td>
                    <td className="py-3 pr-6 text-[#6B7280]">TEE attestation, netting computation integrity</td>
                    <td className="py-3 font-mono text-[#9CA3AF] text-sm">@phala/dstack-sdk</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <SectionTitle>Audit Trail</SectionTitle>
          </FadeIn>

          <FadeIn delay={150}>
            <P>Any receipt can be independently verified through the following chain:</P>
            <div className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-6 font-mono text-sm text-[#374151] leading-loose mb-6">
              <span className="text-[#3B82F6]">Receipt</span>
              <span className="text-[#D1D5DB]"> &rarr; </span>
              <span className="text-[#3B82F6]">SHA-256 Hash</span>
              <span className="text-[#D1D5DB]"> &rarr; </span>
              <span className="text-[#3B82F6]">Merkle Leaf</span>
              <span className="text-[#D1D5DB]"> &rarr; </span>
              <span className="text-[#3B82F6]">Inclusion Proof</span>
              <span className="text-[#D1D5DB]"> &rarr; </span>
              <span className="text-[#10B981]">On-Chain Root</span>
            </div>
            <P>
              The on-chain Merkle root is the ultimate source of truth. Given a receipt and its inclusion proof,
              anyone can recompute the path to the root and verify it matches the on-chain commitment.
              No trust in Stratum is required for verification.
            </P>
          </FadeIn>

          <FadeIn delay={100}>
            <SectionTitle>Three Layers of Trust</SectionTitle>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="rounded-none border border-[#3B82F6]/30 bg-[#EFF6FF] p-6">
                <h3 className="font-mono text-[#3B82F6] text-xs font-medium mb-3 uppercase tracking-wider">Layer 1: Hardware Attestation</h3>
                <P>
                  Intel TDX enclave proves the code ran correctly and was not tampered with.
                  Attestation quotes are publicly verifiable at{" "}
                  <InlineCode>proof.phala.network</InlineCode>.
                </P>
              </div>
              <div className="rounded-none border border-[#10B981]/30 bg-[#ECFDF5] p-6">
                <h3 className="font-mono text-[#10B981] text-xs font-medium mb-3 uppercase tracking-wider">Layer 2: Mathematical Proof</h3>
                <P>
                  Every receipt is hashed into an RFC 6962 Merkle tree. Inclusion proofs
                  let anyone verify a receipt exists in a settlement window without trusting
                  the operator.
                </P>
              </div>
              <div className="rounded-none border border-[#D97706]/30 bg-[#FFFBEB] p-6">
                <h3 className="font-mono text-[#D97706] text-xs font-medium mb-3 uppercase tracking-wider">Layer 3: On-Chain Finality</h3>
                <P>
                  Merkle roots are anchored on Solana. The chain is the ultimate source of truth.
                  Anyone can verify any receipt against the on-chain commitment.
                </P>
              </div>
            </div>
            <P>Most payment systems offer one of these. Stratum offers all three.</P>
          </FadeIn>

          <FadeIn delay={200}>
            <div className="mt-12 rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-8 text-center">
              <h3 className="text-[#0A0A0A] text-xl font-medium mb-3">Verify a receipt now</h3>
              <P>
                The Stratum Explorer lets you paste any receipt hash and see the full Merkle proof path,
                verified against the on-chain anchor.
              </P>
              <a
                href="https://explorer.stratum.valeo.com"
                className="inline-flex items-center justify-center rounded-none px-6 py-2.5 text-sm font-medium transition-colors border border-[#E5E7EB] text-[#6B7280] hover:text-[#0A0A0A] hover:border-[#D1D5DB] mt-2"
              >
                Open Explorer &rarr;
              </a>
            </div>
          </FadeIn>

          <div className="h-20" />
        </div>
      </main>
      <Footer />
    </>
  );
}
