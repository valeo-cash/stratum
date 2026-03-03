import type { Metadata } from "next";
import Footer from "../../components/Footer";
import DocsSidebar from "../../components/DocsSidebar";

export const metadata: Metadata = {
  title: "Documentation — Valeo Stratum",
  description: "Technical documentation for Valeo Stratum, the clearing layer for AI agent payments.",
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

function EndpointRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  const color = method === "GET" ? "text-[#10B981]" : method === "POST" ? "text-[#3B82F6]" : "text-[#D97706]";
  return (
    <tr className="border-b border-[#E5E7EB]">
      <td className={`py-3 pr-4 font-mono text-sm font-medium ${color}`}>{method}</td>
      <td className="py-3 pr-4 font-mono text-sm text-[#374151]">{path}</td>
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
          Valeo Stratum is a clearing and netting layer for x402 AI agent payments.
          It is not a facilitator. It never touches money. It never settles payments on-chain. It never holds custody of anything.
        </P>
        <P>
          Stratum solves the problem Stripe identified in their 2025 Annual Letter: current blockchains
          cannot handle the 1M&ndash;1B transactions per second that AI agents will generate. Rather than building
          a new blockchain, Stratum applies the same clearing/netting model that traditional finance has used
          for decades (DTCC, CLS Bank, Visa) to compress millions of logical transactions into minimal on-chain settlements.
        </P>

        <SubTitle>What Stratum Does</SubTitle>
        <P>Stratum does exactly three things:</P>
        <ol className="list-decimal list-inside text-[#6B7280] text-sm space-y-3 mb-6 pl-2">
          <li>
            <strong className="text-[#0A0A0A]">Intercepts and defers.</strong> When an agent sends a payment,
            Stratum records a signed receipt &mdash; a cryptographic IOU. The money has not moved.
          </li>
          <li>
            <strong className="text-[#0A0A0A]">Nets.</strong> At settlement window close, Stratum computes net
            positions across all counterparties. 1M bilateral IOUs collapse into a handful of net transfers.
          </li>
          <li>
            <strong className="text-[#0A0A0A]">Instructs.</strong> Stratum sends settlement instructions to the
            real facilitator (Coinbase, Circle, etc.). The facilitator executes the actual on-chain USDC transfers.
          </li>
        </ol>

        <P>
          Stratum separately anchors a Merkle root on-chain for auditability &mdash; but that is a data hash, not a payment.
          This is the &ldquo;INSTRUCTING&rdquo; model: Stratum instructs facilitators, it never settles.
        </P>

        <SectionTitle id="architecture">Architecture</SectionTitle>
        <P>The system flow:</P>
        <Code>{`Agent → Stratum (clearing layer) → Facilitator (Coinbase/Circle) → Chain (Solana/Base)`}</Code>

        <SubTitle>Core Components</SubTitle>
        <P>
          <strong className="text-[#0A0A0A]">Stratum Gateway</strong> &mdash; A reverse proxy + clearing engine.
          Service providers register their API, agents hit the proxied endpoint,
          Stratum handles payment clearing automatically.
        </P>
        <P>
          <strong className="text-[#0A0A0A]">Receipt Ledger</strong> &mdash; An event-sourced double-entry ledger
          that records every signed receipt within a settlement window. Provides idempotency, position tracking,
          and window-scoped queries.
        </P>
        <P>
          <strong className="text-[#0A0A0A]">Netting Engine</strong> &mdash; Computes multilateral net positions
          across all counterparties. Verifies the sum-to-zero invariant and produces a minimal set of settlement instructions.
        </P>
        <P>
          <strong className="text-[#0A0A0A]">Merkle Tree</strong> &mdash; RFC 6962 compliant append-only tree.
          Every receipt is hashed into a leaf. The root is anchored on-chain for public verifiability.
        </P>
        <P>
          <strong className="text-[#0A0A0A]">Write-Ahead Log</strong> &mdash; Ensures crash recovery.
          Every mutation is logged before execution. Supports checkpoints and compaction.
        </P>

        <SectionTitle id="integration">Integration Guide</SectionTitle>

        <SubTitle>Tier 1: No Code (30 seconds)</SubTitle>
        <ol className="list-decimal list-inside text-[#6B7280] text-sm space-y-2 mb-6 pl-2">
          <li>Sign up at console.stratum.valeo.com</li>
          <li>Paste your API URL</li>
          <li>Set pricing per route (e.g., $0.002 per request)</li>
          <li>Get your Stratum endpoint</li>
          <li>Share the endpoint with agents &mdash; done</li>
        </ol>
        <P>Zero code. Zero blockchain knowledge. Stratum handles clearing, netting, and settlement automatically.</P>

        <SubTitle>Tier 2: One Line (existing x402 services)</SubTitle>
        <P>If you already use x402, change the facilitator URL to route through Stratum:</P>
        <Code>{`// Before
const paywall = createPaywall({
  facilitatorUrl: 'https://x402.coinbase.com'
})

// After
const paywall = createPaywall({
  facilitatorUrl: 'https://stratum.valeo.com/v1/facilitate'
})`}</Code>
        <P>
          Same facilitator settles. Stratum clears the traffic first, reducing on-chain load by orders of magnitude.
        </P>

        <SubTitle>Tier 3: Full SDK (self-hosting)</SubTitle>
        <Code>{`import { StratumGateway } from '@valeo/stratum'

const gateway = new StratumGateway({
  facilitator: 'https://x402.coinbase.com',
  settlementWindow: '5m',
  chain: 'solana',
  asset: 'USDC',
})

app.use('/api', gateway.middleware())`}</Code>
        <P>
          Install packages, run your own clearing node. Full control over settlement windows, netting logic,
          and facilitator selection.
        </P>

        <SectionTitle id="receipts">Receipt Format</SectionTitle>
        <P>
          A receipt is the core clearing primitive. It records that a payer owes a payee a specific amount
          for a resource within a settlement window. No money moves when a receipt is created.
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
              <FieldRow name="facilitator_id" type="FacilitatorId" desc="Which facilitator will settle" />
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
          A settlement window is a time-bounded period during which receipts accumulate.
          At the end of a window, positions are netted, instructions sent, and the Merkle root anchored.
        </P>

        <SubTitle>State Machine</SubTitle>
        <Code>{`OPEN → ACCUMULATING → PRE_CLOSE → NETTING → INSTRUCTING → ANCHORING → FINALIZED
                                                                          ↘ FAILED`}</Code>

        <div className="space-y-3 mb-6">
          {[
            ["OPEN", "Window created, ready to begin accumulating receipts."],
            ["ACCUMULATING", "Actively accepting and sequencing receipts."],
            ["PRE_CLOSE", "No new receipts accepted. Preparing for netting."],
            ["NETTING", "Computing multilateral net positions across all counterparties."],
            ["INSTRUCTING", "Sending settlement instructions to the facilitator. Stratum instructs — it never settles."],
            ["ANCHORING", "Anchoring the Merkle root on-chain (data hash, not a payment)."],
            ["FINALIZED", "Window complete. Signed window head published. Chained to previous window."],
            ["FAILED", "Unrecoverable error. Retry mechanisms available for INSTRUCTING and ANCHORING states."],
          ].map(([state, desc]) => (
            <div key={state} className="flex gap-3 text-sm">
              <span className="font-mono text-[#3B82F6] shrink-0 w-32">{state}</span>
              <span className="text-[#6B7280]">{desc}</span>
            </div>
          ))}
        </div>

        <P>
          The <InlineCode>WindowManager</InlineCode> provides zero-downtime transitions: when a window closes,
          a new one opens immediately. Receipts submitted during settlement of the old window go into the new one.
        </P>

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

Settlement instructions (4 transfers instead of 5):
  Agent A → Service X: $700
  Agent B → Service Z: $400
  Agent B → Service X: $100
  Agent B → Service Y: $200
  Agent C → Service Y: $150`}</Code>

        <P>
          In production, 1M bilateral receipts compress to tens of net transfers.
          The sum-to-zero invariant is always verified before settlement proceeds.
        </P>

        <SectionTitle id="api">API Reference</SectionTitle>
        <P>The Stratum Gateway exposes the following REST endpoints:</P>

        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left py-2 pr-4 text-[11px] text-[#9CA3AF] uppercase tracking-wider">Method</th>
                <th className="text-left py-2 pr-4 text-[11px] text-[#9CA3AF] uppercase tracking-wider">Path</th>
                <th className="text-left py-2 text-[11px] text-[#9CA3AF] uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody>
              <EndpointRow method="POST" path="/v1/receipt" desc="Submit a signed receipt to the current window" />
              <EndpointRow method="GET" path="/v1/receipt/:id" desc="Retrieve a receipt by its ID" />
              <EndpointRow method="GET" path="/v1/window/:id" desc="Get settlement window details and status" />
              <EndpointRow method="GET" path="/v1/window/:id/head" desc="Get the signed window head (after finalization)" />
              <EndpointRow method="GET" path="/v1/proof/:receipt_id" desc="Get Merkle inclusion proof for a receipt" />
              <EndpointRow method="GET" path="/v1/positions/:window_id" desc="Get net positions for a window" />
              <EndpointRow method="GET" path="/v1/health" desc="Health check endpoint" />
            </tbody>
          </table>
        </div>

        <SubTitle>Request Headers</SubTitle>
        <Code>{`X-PAYMENT: <agent-wallet-address>
Content-Type: application/json`}</Code>

        <SubTitle>Response Headers</SubTitle>
        <Code>{`X-STRATUM-RECEIPT: <receipt-id>
X-STRATUM-SEQUENCE: <sequence-number>`}</Code>

        <SubTitle>402 Payment Required Response</SubTitle>
        <P>When a request is missing the payment header, Stratum returns:</P>
        <Code>{`HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "price": "200",
  "asset": "USDC",
  "payee": "svc-ai-inference",
  "network": "solana"
}`}</Code>

        <SectionTitle id="faq">FAQ</SectionTitle>

        {[
          { q: "Is Stratum a blockchain?", a: "No. Stratum is an off-chain clearing layer. It does not produce blocks, run consensus, or maintain a distributed ledger. It uses existing blockchains (Solana, Base, etc.) only to anchor Merkle roots for auditability." },
          { q: "Is Stratum a facilitator?", a: "No. Stratum never touches money, holds custody, or executes on-chain transfers. It sends settlement instructions to real facilitators like Coinbase or Circle. The facilitator moves the funds." },
          { q: "What happens if Stratum goes down?", a: "No funds are at risk. Stratum never holds money. A write-ahead log ensures crash recovery. Unsigned receipts can be replayed. Settlement windows resume from the last checkpoint." },
          { q: "How is privacy handled?", a: "Individual receipts are stored off-chain. Only net settlement amounts and a single Merkle root hash appear on-chain. Bilateral transaction details are not publicly visible." },
          { q: "What chains does Stratum support?", a: "Stratum is chain-agnostic. The reference implementation anchors Merkle roots on Solana, but the architecture supports any chain that can store a 32-byte hash." },
          { q: "What assets does Stratum support?", a: "USDC is the default settlement asset. The protocol is asset-agnostic — any asset supported by the facilitator can be used." },
          { q: "How fast is receipt signing?", a: "Ed25519 signing takes microseconds. There is zero on-chain interaction during receipt creation. Receipts are processed entirely in-memory." },
          { q: "Can receipts be forged or replayed?", a: "No. Every receipt has an idempotency key derived from SHA-256(payer + payee + resource_hash + amount + nonce). Duplicate keys are rejected. Ed25519 signatures prevent forgery." },
          { q: "How do I verify a receipt?", a: "Use the Explorer at explorer.stratum.valeo.com. Paste a receipt hash to see the Merkle inclusion proof path and verify it against the on-chain anchor." },
          { q: "What is the compression ratio?", a: "In production: typically 50,000:1 or higher. 1M bilateral receipts compress to ~20 net settlement transfers, plus 1 Merkle root anchor transaction." },
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
