import type { Metadata } from "next";
import Link from "next/link";
import Footer from "../../components/Footer";
import DocsSidebar from "../../components/DocsSidebar";

export const metadata: Metadata = {
  title: "Documentation — Valeo Stratum",
  description: "Technical documentation for Valeo Stratum, the clearing and settlement layer for x402 AI agent payments.",
};

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[#0A0A0A] text-2xl font-medium mt-20 mb-6 scroll-mt-20 first:mt-0">
      {children}
    </h2>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[#0A0A0A] text-lg font-medium mt-10 mb-4">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[#6B7280] text-sm leading-relaxed mb-4">{children}</p>;
}

function Code({ children }: { children: string }) {
  return (
    <pre className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-5 overflow-x-auto mb-6">
      <code className="text-sm font-mono text-[#374151] leading-relaxed">{children}</code>
    </pre>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded-none bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.5 text-sm font-mono text-[#3B82F6]">{children}</code>;
}

function FieldRow({ name, type, desc }: { name: string; type: string; desc: string }) {
  return (
    <tr className="border-b border-[#E5E7EB]">
      <td className="py-3 pr-4 font-mono text-sm text-[#3B82F6]">{name}</td>
      <td className="py-3 pr-4 font-mono text-sm text-[#9CA3AF]">{type}</td>
      <td className="py-3 text-sm text-[#6B7280]">{desc}</td>
    </tr>
  );
}

function EndpointRow({ method, path, auth, desc }: { method: string; path: string; auth: string; desc: string }) {
  const color = method === "GET" ? "text-[#10B981]" : method === "POST" ? "text-[#3B82F6]" : "text-[#D97706]";
  return (
    <tr className="border-b border-[#E5E7EB]">
      <td className={`py-3 pr-4 font-mono text-sm font-medium ${color}`}>{method}</td>
      <td className="py-3 pr-4 font-mono text-sm text-[#374151]">{path}</td>
      <td className="py-3 pr-4 text-sm text-[#9CA3AF]">{auth}</td>
      <td className="py-3 text-sm text-[#6B7280]">{desc}</td>
    </tr>
  );
}

export default function DocsPage() {
  return (
    <>
      <div className="min-h-screen pt-16">
        <div className="max-w-7xl mx-auto flex">
          <DocsSidebar />
          <main className="flex-1 min-w-0 px-6 lg:px-12 py-10">
            <div className="max-w-3xl">

        <SectionTitle id="overview">Overview</SectionTitle>
        <P>
          Valeo Stratum is a clearing and settlement layer for x402 AI agent payments.
          Facilitators submit verified payments to Stratum. Stratum batches them into
          60-second windows, computes multilateral netting, and executes USDC settlements
          on-chain automatically.
        </P>
        <P>
          Stratum solves the problem Stripe identified in their 2025 Annual Letter: current blockchains
          cannot handle the 1M&ndash;1B transactions per second that AI agents will generate. Rather than building
          a new blockchain, Stratum applies the same clearing/netting model that traditional finance has used
          for decades (DTCC, CLS Bank, Visa) to compress millions of logical transactions into minimal on-chain settlements.
        </P>

        <SubTitle>What Stratum Does</SubTitle>
        <ol className="list-decimal list-inside text-[#6B7280] text-sm space-y-3 mb-6 pl-2">
          <li>
            <strong className="text-[#0A0A0A]">Accepts payment instructions.</strong> Facilitators submit verified x402 payments
            via <InlineCode>POST /v1/settle/submit</InlineCode>. Stratum records each as a signed receipt.
          </li>
          <li>
            <strong className="text-[#0A0A0A]">Batches and nets.</strong> Every 60 seconds, Stratum closes a settlement window
            and computes multilateral netting across all counterparties. 10,000 bilateral payments collapse into ~50 net transfers.
          </li>
          <li>
            <strong className="text-[#0A0A0A]">Settles on-chain.</strong> Stratum executes USDC transfers on Solana and Base
            from its own settlement wallet. Each payment is tracked with an on-chain txHash as proof.
          </li>
          <li>
            <strong className="text-[#0A0A0A]">Anchors Merkle proofs.</strong> A Merkle root covering every receipt in the window
            is anchored on Solana for public verifiability.
          </li>
        </ol>

        <SectionTitle id="architecture">Architecture</SectionTitle>
        <P>The system flow:</P>
        <Code>{`Agent → Facilitator (verifies x402 payment) → Stratum (netting + settlement) → Chain (Solana/Base)`}</Code>
        <P>
          Stratum sits behind the facilitator, not in front of the agent. The facilitator verifies
          the x402 payment (signature check, amount check, etc.), then submits it to Stratum for
          batched settlement.
        </P>

        <SubTitle>Core Components</SubTitle>
        <P>
          <strong className="text-[#0A0A0A]">Stratum Gateway</strong> &mdash; The clearing and settlement engine
          at <InlineCode>gateway.stratumx402.com</InlineCode>. Accepts payment submissions, runs netting,
          executes USDC transfers, and anchors Merkle roots.
        </P>
        <P>
          <strong className="text-[#0A0A0A]">Receipt Ledger</strong> &mdash; An event-sourced ledger
          (Redis-backed or in-memory) that records every signed receipt within a settlement window.
          Provides idempotency, position tracking, and window-scoped queries.
        </P>
        <P>
          <strong className="text-[#0A0A0A]">Netting Engine</strong> &mdash; Computes multilateral net positions
          across all counterparties. Verifies the sum-to-zero invariant and produces a minimal set of USDC transfers.
        </P>
        <P>
          <strong className="text-[#0A0A0A]">Merkle Tree</strong> &mdash; RFC 6962 compliant append-only tree.
          Every receipt is hashed into a leaf. The root is anchored on Solana for public verifiability.
        </P>
        <P>
          <strong className="text-[#0A0A0A]">Settlement Executor</strong> &mdash; Executes USDC transfers on Solana
          (SPL Token transferChecked) and Base (ERC-20 transfer) from Stratum&apos;s settlement wallet.
          Creates destination token accounts automatically if they don&apos;t exist.
        </P>

        <SectionTitle id="integration">Integration Guide</SectionTitle>

        <SubTitle>For Facilitators (Primary Integration)</SubTitle>
        <P>Facilitators verify x402 payments, then submit them to Stratum for batched settlement.</P>
        <ol className="list-decimal list-inside text-[#6B7280] text-sm space-y-2 mb-6 pl-2">
          <li>Get an API key at{" "}
            <Link href="/facilitators" className="text-[#3B82F6] hover:underline">stratumx402.com/facilitators</Link>
          </li>
          <li>Install the SDK: <InlineCode>npm install @v402valeo/facilitator</InlineCode></li>
          <li>Submit verified payments to Stratum</li>
          <li>Query settlement status with on-chain txHash proof</li>
        </ol>
        <Code>{`const { Stratum } = require('@v402valeo/facilitator');
const stratum = new Stratum({ apiKey: 'sk_live_...' });

// After you verify an x402 payment, submit it to Stratum:
await stratum.submit({
  from: 'agent_wallet_address',
  to: 'service_wallet_address',
  amount: '5000',  // micro-USDC ($0.005)
  chain: 'solana',
  reference: 'your-internal-id'
});

// Check settlement status:
const status = await stratum.status('your-internal-id');
// { status: 'settled', txHash: '4PxAjv...', settledAt: '...' }`}</Code>

        <SubTitle>For Sellers / API Providers</SubTitle>
        <P>Sellers register their service and receive USDC automatically. No code changes needed.</P>
        <ol className="list-decimal list-inside text-[#6B7280] text-sm space-y-2 mb-6 pl-2">
          <li>Get an API key at{" "}
            <Link href="/facilitators" className="text-[#3B82F6] hover:underline">stratumx402.com/facilitators</Link>
          </li>
          <li>Register your service with a wallet address</li>
          <li>USDC arrives every 60 seconds</li>
        </ol>
        <Code>{`POST https://gateway.stratumx402.com/admin/services
Content-Type: application/json
X-API-KEY: sk_live_your_key

{
  "slug": "my-api",
  "name": "My API",
  "walletAddress": "your_solana_wallet_address",
  "pricePerRequest": 5000
}`}</Code>
        <P>
          The <InlineCode>pricePerRequest</InlineCode> is in USDC base units (6 decimals).{" "}
          <InlineCode>5000</InlineCode> = $0.005 USDC per request.
        </P>

        <SectionTitle id="receipts">Receipt Format</SectionTitle>
        <P>
          A receipt is the core clearing primitive. It records that a payer owes a payee a specific amount
          for a resource within a settlement window.
        </P>

        <SubTitle>Receipt Fields</SubTitle>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left py-2 pr-4 text-[11px] text-[#9CA3AF] uppercase tracking-wider">Field</th>
                <th className="text-left py-2 pr-4 text-[11px] text-[#9CA3AF] uppercase tracking-wider">Type</th>
                <th className="text-left py-2 text-[11px] text-[#9CA3AF] uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody>
              <FieldRow name="version" type="number" desc="Schema version (currently 1)" />
              <FieldRow name="receipt_id" type="ReceiptId" desc="Unique identifier for this receipt" />
              <FieldRow name="window_id" type="WindowId" desc="Settlement window this receipt belongs to" />
              <FieldRow name="sequence" type="number" desc="Monotonically increasing within a window" />
              <FieldRow name="payer" type="AccountId" desc="Account paying for the resource" />
              <FieldRow name="payee" type="AccountId" desc="Account receiving payment" />
              <FieldRow name="amount" type="bigint" desc="Amount in smallest unit (e.g., USDC micro-cents)" />
              <FieldRow name="asset" type="string" desc='Asset identifier (e.g., "USDC")' />
              <FieldRow name="resource_hash" type="Uint8Array" desc="SHA-256 hash of the resource being paid for" />
              <FieldRow name="idempotency_key" type="Uint8Array" desc="SHA-256(payer + payee + resource_hash + amount + nonce)" />
              <FieldRow name="timestamp" type="number" desc="Unix millisecond timestamp" />
              <FieldRow name="facilitator_id" type="FacilitatorId" desc="Which facilitator submitted this payment" />
              <FieldRow name="nonce" type="string" desc="Client-supplied nonce for idempotency" />
            </tbody>
          </table>
        </div>

        <SubTitle>Signed Receipt</SubTitle>
        <P>
          A <InlineCode>SignedReceipt</InlineCode> wraps a receipt with an Ed25519 signature and the signer&apos;s
          public key. The signature is computed over the canonical encoding of the receipt (sorted keys, deterministic
          BigInt and Uint8Array serialization).
        </P>
        <Code>{`interface SignedReceipt {
  version: number
  receipt: Receipt
  signature: Uint8Array     // Ed25519 signature
  signer_public_key: Uint8Array  // 32-byte public key
}`}</Code>

        <SectionTitle id="merkle">Merkle Proofs</SectionTitle>
        <P>
          Stratum uses an RFC 6962 compliant Merkle tree to provide cryptographic proof that every receipt
          in a settlement window is included in the on-chain commitment.
        </P>

        <SubTitle>Hashing Rules</SubTitle>
        <P>
          <strong className="text-[#0A0A0A]">Leaf hash:</strong> <InlineCode>SHA-256(0x00 || leaf_data)</InlineCode><br />
          <strong className="text-[#0A0A0A]">Node hash:</strong> <InlineCode>SHA-256(0x01 || left || right)</InlineCode>
        </P>
        <P>
          The 0x00/0x01 prefix prevents second-preimage attacks by making leaf and internal node hashes
          distinguishable.
        </P>

        <SubTitle>Inclusion Proof</SubTitle>
        <P>
          An inclusion proof demonstrates that a specific receipt hash is a leaf of the Merkle tree
          with a known root. The proof contains the sibling hashes along the path from the leaf to the root.
          Verification recomputes the root by hashing up the path and comparing.
        </P>

        <SubTitle>Consistency Proof</SubTitle>
        <P>
          A consistency proof demonstrates that a smaller tree (from an earlier point in the window)
          is a prefix of the larger tree. This proves the tree is append-only: no receipt can be
          removed or modified after inclusion.
        </P>

        <SectionTitle id="windows">Settlement Windows</SectionTitle>
        <P>
          A settlement window is a 60-second period during which payments accumulate.
          When a window closes, netting runs, USDC settles on-chain, and a Merkle root is anchored.
          A new window opens immediately &mdash; zero downtime.
        </P>
        <P>
          Payments submitted during settlement of the old window go into the new one. No payments are ever dropped.
        </P>

        <SubTitle>Window Lifecycle</SubTitle>
        <div className="space-y-3 mb-6">
          {[
            ["OPEN", "Window is accepting payment submissions."],
            ["NETTING", "Computing multilateral net positions across all counterparties."],
            ["SETTLING", "Executing USDC transfers on Solana and Base."],
            ["ANCHORING", "Anchoring the Merkle root on Solana."],
            ["FINALIZED", "Window complete. All payments settled with on-chain txHash proof."],
          ].map(([state, desc]) => (
            <div key={state} className="flex gap-3 text-sm">
              <span className="font-mono text-[#3B82F6] shrink-0 w-24">{state}</span>
              <span className="text-[#6B7280]">{desc}</span>
            </div>
          ))}
        </div>

        <SectionTitle id="netting">Netting</SectionTitle>
        <P>
          Multilateral netting compresses bilateral obligations into a minimal set of net transfers.
        </P>

        <SubTitle>Worked Example</SubTitle>
        <P>Consider 5 agents making API calls to 3 services during a window:</P>
        <Code>{`Gross bilateral positions:
  Agent A → Service X: $500
  Agent A → Service Y: $200
  Agent B → Service X: $300
  Agent B → Service Z: $400
  Agent C → Service Y: $150

Net positions after aggregation:
  Agent A:    -$700  (owes $700 net)
  Agent B:    -$700  (owes $700 net)
  Agent C:    -$150  (owes $150 net)
  Service X:  +$800  (owed $800 net)
  Service Y:  +$350  (owed $350 net)
  Service Z:  +$400  (owed $400 net)

Sum of all net positions: $0 ✓ (invariant holds)

USDC transfers executed by Stratum (4 instead of 5):
  → Service X: $800
  → Service Y: $350
  → Service Z: $400`}</Code>

        <P>
          In production, 10,000 bilateral payments compress to ~50 net transfers.
          The sum-to-zero invariant is always verified before settlement proceeds.
        </P>

        <SectionTitle id="api">API Reference</SectionTitle>
        <P>
          The Stratum Gateway at <InlineCode>gateway.stratumx402.com</InlineCode> exposes these endpoints:
        </P>

        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left py-2 pr-4 text-[11px] text-[#9CA3AF] uppercase tracking-wider">Method</th>
                <th className="text-left py-2 pr-4 text-[11px] text-[#9CA3AF] uppercase tracking-wider">Path</th>
                <th className="text-left py-2 pr-4 text-[11px] text-[#9CA3AF] uppercase tracking-wider">Auth</th>
                <th className="text-left py-2 text-[11px] text-[#9CA3AF] uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody>
              <EndpointRow method="POST" path="/v1/settle/submit" auth="API Key" desc="Submit payments for batched settlement" />
              <EndpointRow method="GET" path="/v1/settle/status/:reference" auth="API Key" desc="Check settlement status by reference" />
              <EndpointRow method="POST" path="/v1/settle/batch-status" auth="API Key" desc="Check multiple references at once" />
              <EndpointRow method="GET" path="/v1/settle/recent" auth="API Key" desc="Your last 50 settled payments" />
              <EndpointRow method="POST" path="/admin/services" auth="API Key" desc="Register a service" />
              <EndpointRow method="GET" path="/v1/analytics" auth="Public" desc="Live analytics and stats" />
              <EndpointRow method="GET" path="/health" auth="Public" desc="Gateway health check" />
            </tbody>
          </table>
        </div>

        <SubTitle>Request Headers</SubTitle>
        <Code>{`X-API-KEY: sk_live_your_key
Content-Type: application/json`}</Code>

        <SectionTitle id="faq">FAQ</SectionTitle>

        {[
          { q: "Is Stratum a blockchain?", a: "No. Stratum is an off-chain clearing and settlement layer. It does not produce blocks, run consensus, or maintain a distributed ledger. It uses existing blockchains (Solana, Base) to execute USDC transfers and anchor Merkle roots." },
          { q: "Is Stratum a facilitator?", a: "Stratum is a clearing coordinator. It sits behind facilitators, not in front of agents. Facilitators verify x402 payments and submit them to Stratum for batched settlement. Stratum handles netting and on-chain USDC settlement automatically." },
          { q: "What happens if Stratum goes down?", a: "Queued payments are persisted in Redis and recovered on restart. No payments are lost. Settlement resumes from the last checkpoint." },
          { q: "How is privacy handled?", a: "Individual receipts are stored off-chain. Only net settlement amounts and a single Merkle root hash appear on-chain. Bilateral transaction details are not publicly visible." },
          { q: "What chains does Stratum support?", a: "Solana (mainnet) and Base (mainnet) for USDC settlement. Merkle roots are anchored on Solana." },
          { q: "How fast is receipt signing?", a: "Ed25519 signing takes microseconds. There is zero on-chain interaction during receipt creation. Receipts are processed entirely in-memory." },
          { q: "Can receipts be forged or replayed?", a: "No. Every receipt has an idempotency key derived from SHA-256(payer + payee + resource_hash + amount + nonce). Duplicate keys are rejected. Ed25519 signatures prevent forgery." },
          { q: "How do I verify a receipt?", a: "Use the Explorer at stratumx402.com/explorer. Paste a receipt hash to see the Merkle inclusion proof and verify it against the on-chain anchor." },
          { q: "What is the compression ratio?", a: "In production: typically 100:1 to 10,000:1. 10,000 bilateral payments compress to ~50 net USDC transfers, plus 1 Merkle root anchor transaction." },
        ].map((item) => (
          <div key={item.q} className="mb-8">
            <h4 className="text-[#0A0A0A] text-sm font-medium mb-2">{item.q}</h4>
            <P>{item.a}</P>
          </div>
        ))}

        <div className="h-20" />
            </div>
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}
