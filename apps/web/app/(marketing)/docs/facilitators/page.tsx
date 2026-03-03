import type { Metadata } from "next";
import Link from "next/link";
import Footer from "../../../components/Footer";
import FacilitatorDocsSidebar from "./FacilitatorDocsSidebar";

export const metadata: Metadata = {
  title: "Facilitator Integration Guide — Valeo Stratum",
  description:
    "Technical guide for facilitators integrating with Valeo Stratum to process batched AI agent settlements.",
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
    <pre className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-5 overflow-x-auto mb-6">
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
              ← Back to Docs
            </Link>
          </div>

          <h1 className="text-[#0A0A0A] text-3xl font-medium mb-2">
            Facilitator Integration Guide
          </h1>
          <p className="text-[#9CA3AF] text-sm font-mono mb-12">
            v1.0 — Settlement API
          </p>

          {/* Overview */}
          <SectionTitle id="overview">Overview</SectionTitle>
          <P>
            Stratum is a clearing layer that sits between AI agents and API
            providers. Instead of processing millions of individual payments,
            facilitators receive batched settlement instructions — typically 50
            batch settlements instead of 500,000 individual ones.
          </P>
          <P>As a facilitator, you:</P>
          <ol className="list-decimal list-inside text-sm text-[#6B7280] leading-relaxed mb-6 space-y-2 pl-2">
            <li>Register a webhook endpoint with Stratum</li>
            <li>
              Receive settlement batches when windows close (every 60 seconds)
            </li>
            <li>Execute the USDC transfers on Solana and/or Base</li>
            <li>Confirm execution back to Stratum</li>
          </ol>

          {/* Authentication */}
          <SectionTitle id="authentication">Authentication</SectionTitle>
          <P>
            Request an API key from Stratum with the{" "}
            <InlineCode>facilitator</InlineCode> role. Include it in all
            requests using either header format:
          </P>
          <Code>{`X-API-KEY: sk_live_your_key

// or

Authorization: Bearer sk_live_your_key`}</Code>

          {/* Quick Start */}
          <SectionTitle id="quickstart">Quick Start</SectionTitle>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={1} />
              Register your webhook
            </span>
          </SubTitle>
          <Code>{`POST https://gateway.stratum.valeo.com/v1/settle/webhook
Content-Type: application/json
X-API-KEY: sk_live_your_key

{
  "url": "https://your-service.com/stratum/settle",
  "chains": ["solana", "base"],
  "secret": "whsec_your_webhook_secret"
}`}</Code>
          <P>
            The <InlineCode>secret</InlineCode> is used to sign webhook payloads
            via HMAC-SHA256 so you can verify authenticity.
          </P>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={2} />
              Receive settlement batches
            </span>
          </SubTitle>
          <P>
            When a settlement window closes, Stratum POSTs a batch payload to
            your webhook URL:
          </P>
          <Code>{`{
  "batchId": "batch-abc123",
  "windowId": "win-mm8jlizk-hrhj-1",
  "chain": "solana",
  "transfers": [
    {
      "from": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "to": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "amount": "470000",
      "chain": "solana"
    },
    {
      "from": "3kP9...",
      "to": "9WzD...",
      "amount": "120000",
      "chain": "solana"
    }
  ],
  "totalVolume": "1250000"
}`}</Code>
          <P>
            The <InlineCode>X-Stratum-Signature</InlineCode> header contains the
            HMAC-SHA256 signature for verification.
          </P>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={3} />
              Verify the webhook signature
            </span>
          </SubTitle>
          <Code>{`const crypto = require('crypto');

const signature = req.headers['x-stratum-signature'];
const body = JSON.stringify(req.body);
const expected = crypto
  .createHmac('sha256', webhookSecret)
  .update(body)
  .digest('hex');

if (signature !== expected) {
  throw new Error('Invalid webhook signature');
}`}</Code>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={4} />
              Execute transfers
            </span>
          </SubTitle>
          <P>
            For each transfer in the batch, execute the on-chain USDC transfer:
          </P>
          <ul className="list-disc list-inside text-sm text-[#6B7280] leading-relaxed mb-6 space-y-2 pl-2">
            <li>
              <strong className="text-[#0A0A0A]">Solana:</strong> SPL Token{" "}
              <InlineCode>transferChecked</InlineCode> for each item
            </li>
            <li>
              <strong className="text-[#0A0A0A]">Base:</strong> ERC-20{" "}
              <InlineCode>USDC.transfer()</InlineCode> for each item
            </li>
          </ul>
          <P>
            Amounts are in USDC base units (6 decimals).{" "}
            <InlineCode>470000</InlineCode> = $0.47 USDC.
          </P>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={5} />
              Confirm execution
            </span>
          </SubTitle>
          <P>
            After executing all transfers, confirm back to Stratum with the
            transaction hashes:
          </P>
          <Code>{`POST https://gateway.stratum.valeo.com/v1/settle/batches/{batch_id}/confirm
Content-Type: application/json
X-API-KEY: sk_live_your_key

{
  "txHashes": ["5xKr3...", "9mWq7..."],
  "chain": "solana"
}`}</Code>

          {/* API Reference */}
          <SectionTitle id="api">API Reference</SectionTitle>
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
                  path="/v1/settle/webhook"
                  desc="Register a webhook for settlement notifications"
                />
                <EndpointRow
                  method="GET"
                  path="/v1/settle/batches"
                  desc="List recent settlement batches"
                />
                <EndpointRow
                  method="GET"
                  path="/v1/settle/batches/:id"
                  desc="Get details of a specific batch"
                />
                <EndpointRow
                  method="POST"
                  path="/v1/settle/batches/:id/confirm"
                  desc="Confirm settlement execution with tx hashes"
                />
              </tbody>
            </table>
          </div>

          {/* Supported Chains */}
          <SectionTitle id="chains">Supported Chains</SectionTitle>
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
                  <th className="py-3 pr-4 text-xs font-mono text-[#9CA3AF] uppercase tracking-wider">
                    Transfer Method
                  </th>
                  <th className="py-3 text-xs font-mono text-[#9CA3AF] uppercase tracking-wider">
                    Testnet
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#E5E7EB]">
                  <td className="py-3 pr-4 text-sm text-[#0A0A0A] font-medium">
                    Solana
                  </td>
                  <td className="py-3 pr-4 text-sm text-[#6B7280]">USDC</td>
                  <td className="py-3 pr-4 text-sm font-mono text-[#374151]">
                    SPL Token transferChecked
                  </td>
                  <td className="py-3 text-sm text-[#6B7280]">Devnet</td>
                </tr>
                <tr className="border-b border-[#E5E7EB]">
                  <td className="py-3 pr-4 text-sm text-[#0A0A0A] font-medium">
                    Base
                  </td>
                  <td className="py-3 pr-4 text-sm text-[#6B7280]">USDC</td>
                  <td className="py-3 pr-4 text-sm font-mono text-[#374151]">
                    ERC-20 transfer
                  </td>
                  <td className="py-3 text-sm text-[#6B7280]">Base Sepolia</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Batch Lifecycle */}
          <SectionTitle id="lifecycle">Batch Lifecycle</SectionTitle>
          <P>Settlement batches progress through the following states:</P>
          <div className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-6 mb-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="px-2 py-1 bg-[#FEF3C7] text-[#92400E] text-xs">
                pending
              </span>
              <span className="text-[#9CA3AF]">→</span>
              <span className="px-2 py-1 bg-[#DBEAFE] text-[#1E40AF] text-xs">
                webhook_sent
              </span>
              <span className="text-[#9CA3AF]">→</span>
              <span className="px-2 py-1 bg-[#D1FAE5] text-[#065F46] text-xs">
                settled
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="px-2 py-1 bg-[#FEF3C7] text-[#92400E] text-xs">
                pending
              </span>
              <span className="text-[#9CA3AF]">→</span>
              <span className="px-2 py-1 bg-[#DBEAFE] text-[#1E40AF] text-xs">
                webhook_sent
              </span>
              <span className="text-[#9CA3AF]">→</span>
              <span className="px-2 py-1 bg-[#FEE2E2] text-[#991B1B] text-xs">
                failed
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="px-2 py-1 bg-[#FEF3C7] text-[#92400E] text-xs">
                pending
              </span>
              <span className="text-[#9CA3AF]">→</span>
              <span className="px-2 py-1 bg-[#D1FAE5] text-[#065F46] text-xs">
                settled
              </span>
              <span className="text-[#9CA3AF] text-xs ml-2">
                (direct settlement, no webhook)
              </span>
            </div>
          </div>

          {/* Error Handling */}
          <SectionTitle id="errors">Error Handling</SectionTitle>
          <ul className="list-disc list-inside text-sm text-[#6B7280] leading-relaxed mb-6 space-y-2 pl-2">
            <li>
              Webhook delivery retries 3 times with exponential backoff (1s, 5s,
              25s)
            </li>
            <li>
              If all retries fail, the batch stays{" "}
              <InlineCode>pending</InlineCode> and can be retrieved via{" "}
              <InlineCode>GET /v1/settle/batches</InlineCode>
            </li>
            <li>
              Failed transfers should be reported via the confirm endpoint with
              error details
            </li>
          </ul>

          {/* Rate Limits */}
          <SectionTitle id="limits">Rate Limits</SectionTitle>
          <P>
            Default rate limit: <strong className="text-[#0A0A0A]">1,000 requests/minute</strong>{" "}
            per API key. Contact{" "}
            <a
              href="mailto:valeobank@gmail.com"
              className="text-[#3B82F6] hover:underline"
            >
              valeobank@gmail.com
            </a>{" "}
            for higher limits.
          </P>

          {/* Testing */}
          <SectionTitle id="testing">Testing</SectionTitle>
          <ul className="list-disc list-inside text-sm text-[#6B7280] leading-relaxed mb-6 space-y-2 pl-2">
            <li>
              Use testnet chains (Solana Devnet, Base Sepolia) for integration
              testing
            </li>
            <li>
              Request a test API key with{" "}
              <InlineCode>REQUIRE_API_KEYS=true</InlineCode>
            </li>
            <li>
              The Stratum simulator generates test traffic for end-to-end
              testing:{" "}
              <InlineCode>pnpm --filter @valeo/simulator start</InlineCode>
            </li>
          </ul>

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
