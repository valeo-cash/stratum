import type { Metadata } from "next";
import Link from "next/link";
import Footer from "../../../components/Footer";
import FacilitatorDocsSidebar from "./FacilitatorDocsSidebar";
import CopyButton from "./CopyButton";

export const metadata: Metadata = {
  title: "Integration Guide — Valeo Stratum",
  description:
    "Submit verified payments via the SDK or API. Stratum batches, nets, and settles USDC on-chain every 60 seconds.",
};

function SectionTitle({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-[#0A0A0A] text-2xl font-medium mt-20 mb-6 scroll-mt-20 first:mt-0"
    >
      {children}
    </h2>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[#0A0A0A] text-lg font-medium mt-10 mb-4">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[#6B7280] text-sm leading-relaxed mb-4">{children}</p>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="relative rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-5 pr-16 overflow-x-auto mb-6">
      <CopyButton text={children} />
      <code className="text-sm font-mono text-[#374151] leading-relaxed">
        {children}
      </code>
    </pre>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-none bg-[#F3F4F6] border border-[#E5E7EB] px-1.5 py-0.5 text-sm font-mono text-[#3B82F6]">
      {children}
    </code>
  );
}

function EndpointRow({
  method,
  path,
  desc,
}: {
  method: string;
  path: string;
  desc: string;
}) {
  const color =
    method === "GET"
      ? "text-[#10B981]"
      : method === "POST"
        ? "text-[#3B82F6]"
        : "text-[#D97706]";
  return (
    <tr className="border-b border-[#E5E7EB]">
      <td className={`py-3 pr-4 font-mono text-sm font-medium ${color}`}>
        {method}
      </td>
      <td className="py-3 pr-4 font-mono text-sm text-[#374151]">{path}</td>
      <td className="py-3 text-sm text-[#6B7280]">{desc}</td>
    </tr>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-none bg-[#003FFF] text-white text-sm font-medium mr-3 shrink-0">
      {n}
    </span>
  );
}

export default function FacilitatorDocsPage() {
  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto flex">
        <FacilitatorDocsSidebar />

        <main className="flex-1 max-w-3xl px-8 py-12 lg:px-16">
          <div className="mb-6">
            <Link
              href="/docs"
              className="text-sm text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
            >
              &larr; Back to Docs
            </Link>
          </div>

          <h1 className="text-[#0A0A0A] text-3xl font-medium mb-2">
            Integration Guide
          </h1>
          <p className="text-[#9CA3AF] text-sm font-mono mb-12">
            v3.0 &mdash; SDK + Automatic Settlement
          </p>

          {/* Overview */}
          <SectionTitle id="overview">Overview</SectionTitle>
          <P>
            Stratum handles settlement so you don&apos;t have to. Submit verified
            payments via the SDK or API. Stratum batches, nets, and settles USDC
            on-chain every 60 seconds. You get a txHash proving every payment settled.
          </P>

          {/* Authentication */}
          <SectionTitle id="authentication">Authentication</SectionTitle>
          <P>
            Get an API key at{" "}
            <Link href="/facilitators" className="text-[#3B82F6] hover:underline">
              stratumx402.com/facilitators
            </Link>
            . Include it in all requests:
          </P>
          <Code>{`X-API-KEY: sk_live_your_key`}</Code>

          {/* Quick Start */}
          <SectionTitle id="quickstart">Quick Start</SectionTitle>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={1} />
              Get your API key
            </span>
          </SubTitle>
          <P>
            Generate an API key instantly at{" "}
            <Link href="/facilitators" className="text-[#3B82F6] hover:underline">
              stratumx402.com/facilitators
            </Link>
            . No approval required.
          </P>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={2} />
              Install the SDK
            </span>
          </SubTitle>
          <Code>{`npm install @v402valeo/facilitator`}</Code>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={3} />
              Submit a payment
            </span>
          </SubTitle>
          <Code>{`const { Stratum } = require('@v402valeo/facilitator');
const stratum = new Stratum({ apiKey: 'sk_live_...' });

await stratum.submit({
  from: 'agent_wallet_address',
  to: 'service_wallet_address',
  amount: '5000',
  chain: 'solana',
  reference: 'payment-001'
});`}</Code>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={4} />
              Check status
            </span>
          </SubTitle>
          <Code>{`const result = await stratum.status('payment-001');
console.log(result.status);  // 'settled'
console.log(result.txHash);  // '4PxAjvFrj...'`}</Code>

          {/* API Reference */}
          <SectionTitle id="api">API Reference</SectionTitle>
          <P>
            Base URL: <InlineCode>https://gateway.stratumx402.com</InlineCode>
          </P>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="py-3 pr-4 text-xs font-mono text-[#9CA3AF] uppercase tracking-wider">
                    Method
                  </th>
                  <th className="py-3 pr-4 text-xs font-mono text-[#9CA3AF] uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th className="py-3 text-xs font-mono text-[#9CA3AF] uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                <EndpointRow
                  method="POST"
                  path="/v1/settle/submit"
                  desc="Submit 1-500 payments per call"
                />
                <EndpointRow
                  method="GET"
                  path="/v1/settle/status/:reference"
                  desc="Payment status + txHash"
                />
                <EndpointRow
                  method="POST"
                  path="/v1/settle/batch-status"
                  desc="Check up to 500 references"
                />
                <EndpointRow
                  method="GET"
                  path="/v1/settle/recent"
                  desc="Last 50 payments"
                />
                <EndpointRow
                  method="POST"
                  path="/admin/services"
                  desc="Register a service"
                />
                <EndpointRow
                  method="GET"
                  path="/v1/analytics"
                  desc="Public stats"
                />
              </tbody>
            </table>
          </div>

          {/* Submit Payload */}
          <SubTitle>Submit Payload</SubTitle>
          <Code>{`POST /v1/settle/submit
Content-Type: application/json
X-API-KEY: sk_live_your_key

{
  "payments": [
    {
      "from": "agent_wallet",
      "to": "service_wallet",
      "amount": "5000",
      "chain": "solana",
      "reference": "your-id"
    }
  ]
}`}</Code>
          <P>
            Single payment shorthand is also accepted &mdash; send{" "}
            <InlineCode>from</InlineCode>, <InlineCode>to</InlineCode>,{" "}
            <InlineCode>amount</InlineCode> directly without the{" "}
            <InlineCode>payments</InlineCode> array.
          </P>

          {/* Status Response */}
          <SubTitle>Status Response</SubTitle>
          <Code>{`{
  "reference": "your-id",
  "status": "settled",
  "txHash": "4PxAjvFrjExWoKo...",
  "settledAt": "2026-03-10T03:30:58Z",
  "from": "agent_wallet",
  "to": "service_wallet",
  "amount": "5000",
  "chain": "solana"
}`}</Code>
          <P>
            Statuses: <InlineCode>queued</InlineCode> &rarr;{" "}
            <InlineCode>batched</InlineCode> &rarr;{" "}
            <InlineCode>settled</InlineCode> (or{" "}
            <InlineCode>failed</InlineCode> with error message).
          </P>

          {/* Configuration */}
          <SectionTitle id="config">Configuration</SectionTitle>

          <SubTitle>Supported Chains</SubTitle>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="py-3 pr-4 text-xs font-mono text-[#9CA3AF] uppercase tracking-wider">
                    Chain
                  </th>
                  <th className="py-3 pr-4 text-xs font-mono text-[#9CA3AF] uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="py-3 text-xs font-mono text-[#9CA3AF] uppercase tracking-wider">
                    Transfer Method
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#E5E7EB]">
                  <td className="py-3 pr-4 text-sm text-[#0A0A0A] font-medium">
                    Solana
                  </td>
                  <td className="py-3 pr-4 text-sm text-[#6B7280]">USDC</td>
                  <td className="py-3 text-sm font-mono text-[#374151]">
                    SPL Token transferChecked
                  </td>
                </tr>
                <tr className="border-b border-[#E5E7EB]">
                  <td className="py-3 pr-4 text-sm text-[#0A0A0A] font-medium">
                    Base
                  </td>
                  <td className="py-3 pr-4 text-sm text-[#6B7280]">USDC</td>
                  <td className="py-3 text-sm font-mono text-[#374151]">
                    ERC-20 transfer
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <SubTitle>Settlement Parameters</SubTitle>
          <div className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-6 mb-6 space-y-3">
            {[
              ["Settlement frequency", "Every 60 seconds"],
              ["Fee", "0.1% (10 bps) of netted volume"],
              ["Rate limit", "100 submissions/minute per API key"],
              ["Max batch size", "500 payments per submit call"],
              ["Duplicate protection", "Same reference ID returns existing record"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">{label}</span>
                <span className="font-mono text-[#0A0A0A]">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B7280]">Public analytics</span>
              <a
                href="https://gateway.stratumx402.com/v1/analytics"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[#3B82F6] hover:underline"
              >
                /v1/analytics
              </a>
            </div>
          </div>

          {/* What Stratum Does Automatically */}
          <SectionTitle id="automatic">What Stratum Does Automatically</SectionTitle>
          <ol className="list-decimal list-inside text-sm text-[#6B7280] leading-relaxed mb-6 space-y-2 pl-2">
            <li>Creates destination token accounts if they don&apos;t exist</li>
            <li>Compresses payments through multilateral netting</li>
            <li>Executes USDC transfers on Solana and Base</li>
            <li>Anchors Merkle proofs on-chain</li>
            <li>Tracks per-payment status with txHash</li>
            <li>Monitors settlement wallet balance</li>
            <li>Recovers queued payments after restart</li>
          </ol>

          {/* Sellers */}
          <SectionTitle id="sellers">For Sellers / API Providers</SectionTitle>
          <P>
            If you&apos;re a seller, you don&apos;t need the SDK. Register your service
            and USDC arrives automatically.
          </P>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={1} />
              Get an API key
            </span>
          </SubTitle>
          <P>
            Generate at{" "}
            <Link href="/facilitators" className="text-[#3B82F6] hover:underline">
              stratumx402.com/facilitators
            </Link>
            .
          </P>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={2} />
              Register your service
            </span>
          </SubTitle>
          <Code>{`POST https://gateway.stratumx402.com/admin/services
Content-Type: application/json
X-API-KEY: sk_live_your_key

{
  "slug": "my-api",
  "name": "My API",
  "walletAddress": "your_solana_wallet_address",
  "pricePerRequest": 5000
}`}</Code>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={3} />
              Done
            </span>
          </SubTitle>
          <P>
            USDC arrives in your wallet every 60 seconds. No code changes needed.
            Your facilitator handles the rest.
          </P>

          {/* Testing */}
          <SectionTitle id="testing">Testing</SectionTitle>
          <P>
            Use Solana Devnet or Base Sepolia for integration testing.
            Request a test API key at{" "}
            <Link href="/facilitators" className="text-[#3B82F6] hover:underline">
              stratumx402.com/facilitators
            </Link>
            .
          </P>
          <P>
            Check settlement status at{" "}
            <a
              href="https://stratumx402.com/console"
              className="text-[#3B82F6] hover:underline"
            >
              stratumx402.com/console
            </a>{" "}
            or via the{" "}
            <a
              href="https://stratumx402.com/explorer"
              className="text-[#3B82F6] hover:underline"
            >
              Explorer
            </a>
            .
          </P>

          <div className="mt-16 pt-8 border-t border-[#E5E7EB]">
            <P>
              Questions? Contact{" "}
              <a
                href="mailto:valeobank@gmail.com"
                className="text-[#3B82F6] hover:underline"
              >
                valeobank@gmail.com
              </a>
            </P>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
