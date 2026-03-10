import type { Metadata } from "next";
import Link from "next/link";
import Footer from "../../../components/Footer";
import FacilitatorDocsSidebar from "./FacilitatorDocsSidebar";
import CopyButton from "./CopyButton";

export const metadata: Metadata = {
  title: "Integration Guide — Valeo Stratum",
  description:
    "Register your service and receive automatic USDC settlement every 60 seconds. No webhooks, no servers, no code.",
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
        : method === "DELETE"
          ? "text-[#EF4444]"
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
            Integration Guide
          </h1>
          <p className="text-[#9CA3AF] text-sm font-mono mb-12">
            v2.0 — Automatic Settlement
          </p>

          {/* Overview */}
          <SectionTitle id="overview">Overview</SectionTitle>
          <P>
            Stratum is a clearing and settlement layer for AI agent payments.
            It automatically collects payments, computes multilateral netting,
            and settles USDC to your wallet. No webhooks. No servers. No code.
          </P>
          <P>To start receiving USDC, you:</P>
          <ol className="list-decimal list-inside text-sm text-[#6B7280] leading-relaxed mb-6 space-y-2 pl-2">
            <li>Get an API key</li>
            <li>Register your service with a wallet address</li>
            <li>USDC arrives every 60 seconds</li>
          </ol>

          {/* Authentication */}
          <SectionTitle id="authentication">Authentication</SectionTitle>
          <P>
            Get an API key at{" "}
            <Link href="/facilitators" className="text-[#3B82F6] hover:underline">
              /facilitators
            </Link>
            . Include it in all requests using either header format:
          </P>
          <Code>{`X-API-KEY: sk_live_your_key

// or

Authorization: Bearer sk_live_your_key`}</Code>

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
              Register your service
            </span>
          </SubTitle>
          <P>
            Tell Stratum about your API and where to send USDC:
          </P>
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
            The <InlineCode>pricePerRequest</InlineCode> is in USDC base units
            (6 decimals). <InlineCode>5000</InlineCode> = $0.005 USDC per request.
          </P>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={3} />
              Agents start paying
            </span>
          </SubTitle>
          <P>
            AI agents call your API through Stratum. Each call generates a
            cryptographic receipt. Stratum collects these receipts into
            60-second settlement windows.
          </P>

          <SubTitle>
            <span className="flex items-center">
              <StepNumber n={4} />
              USDC arrives in your wallet
            </span>
          </SubTitle>
          <P>
            Every 60 seconds, Stratum computes multilateral netting across all
            payments, anchors a Merkle root on-chain, and executes USDC
            transfers directly to your registered wallet. No action required
            from you.
          </P>

          {/* How It Works */}
          <SectionTitle id="how-it-works">How It Works</SectionTitle>
          <P>
            When a settlement window closes, Stratum automatically:
          </P>
          <ol className="list-decimal list-inside text-sm text-[#6B7280] leading-relaxed mb-6 space-y-2 pl-2">
            <li>Collects all Ed25519-signed payment receipts from the window</li>
            <li>Computes multilateral netting — 1,000 payments become ~10 transfers</li>
            <li>Builds a Merkle proof tree (RFC 6962) over all receipts</li>
            <li>Anchors the Merkle root on Solana mainnet</li>
            <li>Executes USDC transfers to service wallets on Solana or Base</li>
          </ol>
          <P>
            Every receipt, Merkle proof, and on-chain anchor is publicly
            verifiable. View live data at{" "}
            <a
              href="https://gateway.stratumx402.com/v1/analytics"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3B82F6] hover:underline"
            >
              gateway.stratumx402.com/v1/analytics
            </a>
          </P>

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
                  path="/admin/services"
                  desc="Register a service (slug, name, wallet, price)"
                />
                <EndpointRow
                  method="GET"
                  path="/v1/analytics"
                  desc="Public analytics — volume, netting, chains"
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
                  method="GET"
                  path="/v1/settle/pending"
                  desc="List unsettled pending batches"
                />
                <EndpointRow
                  method="POST"
                  path="/v1/settle/batches/:id/confirm"
                  desc="Confirm settlement execution with tx hashes"
                />
              </tbody>
            </table>
          </div>

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

          <SubTitle>Settlement Parameters</SubTitle>
          <div className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-6 mb-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B7280]">Settlement frequency</span>
              <span className="font-mono text-[#0A0A0A]">Every 60 seconds</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B7280]">Fee</span>
              <span className="font-mono text-[#0A0A0A]">0.1% of netted volume</span>
            </div>
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
              Use Solana Devnet or Base Sepolia for integration testing
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

          {/* Advanced */}
          <SectionTitle id="advanced">Advanced: Custom Settlement Flows</SectionTitle>
          <P>
            For most users, automatic settlement is all you need. For custom
            workflows, Stratum also supports manual settlement flows:
          </P>

          <details className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-6 mb-6">
            <summary className="text-sm text-[#0A0A0A] font-medium cursor-pointer">
              Webhook-based settlement
            </summary>
            <div className="mt-4 space-y-4">
              <P>
                Register a webhook to receive settlement batches and execute
                transfers yourself:
              </P>
              <Code>{`POST /v1/settle/webhook
{
  "url": "https://your-service.com/stratum/settle",
  "chains": ["solana", "base"],
  "secret": "whsec_your_webhook_secret"
}`}</Code>
              <P>
                Stratum signs webhook payloads via HMAC-SHA256. Verify with the{" "}
                <InlineCode>X-Stratum-Signature</InlineCode> header.
              </P>
            </div>
          </details>

          <details className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-6 mb-6">
            <summary className="text-sm text-[#0A0A0A] font-medium cursor-pointer">
              Dashboard settlement (Phantom wallet)
            </summary>
            <div className="mt-4">
              <P>
                Use the{" "}
                <Link href="/dashboard" className="text-[#3B82F6] hover:underline">
                  Settlement Dashboard
                </Link>{" "}
                to settle batches manually using your Phantom wallet directly
                in the browser. No private key sharing required.
              </P>
            </div>
          </details>

          <details className="rounded-none border border-[#E5E7EB] bg-[#FAFAFA] p-6 mb-6">
            <summary className="text-sm text-[#0A0A0A] font-medium cursor-pointer">
              Polling API
            </summary>
            <div className="mt-4">
              <P>
                Poll <InlineCode>GET /v1/settle/pending</InlineCode> for
                unsettled batches. After executing transfers, confirm with{" "}
                <InlineCode>POST /v1/settle/batches/:id/confirm</InlineCode>.
              </P>
            </div>
          </details>

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
