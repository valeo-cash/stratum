import type { Metadata } from "next";
import Link from "next/link";
import Footer from "../../components/Footer";
import ApiKeyForm from "../../components/ApiKeyForm";
import CodeBlock from "../../components/CodeBlock";

const REGISTER_EXAMPLE = `curl -X POST https://gateway.stratumx402.com/admin/services \\
  -H "X-API-KEY: sk_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "slug": "my-api",
    "name": "My API",
    "walletAddress": "your_solana_wallet_address",
    "pricePerRequest": 5000
  }'`;

export const metadata: Metadata = {
  title: "Service Providers — Valeo Stratum",
  description:
    "Plug into Stratum. Settlement happens automatically. USDC arrives in your wallet every 60 seconds.",
};

const valueProps = [
  {
    title: "10,000× fewer transactions",
    description:
      "Multilateral netting reduces millions of payments to the minimum transfer set.",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
  {
    title: "Automatic settlement",
    description:
      "Settlement windows close every 60 seconds. USDC arrives in your wallet automatically.",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Solana + Base",
    description:
      "Automatic USDC settlement on both chains. One registration covers everything.",
    icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  },
];

const steps = [
  {
    n: 1,
    title: "Get your API key",
    description:
      "Instant. No approval required. Generate one right here on this page.",
  },
  {
    n: 2,
    title: "Register your services",
    description:
      "Tell Stratum which APIs you're monetizing and your wallet address. One API call.",
  },
  {
    n: 3,
    title: "Done — USDC arrives every 60 seconds",
    description:
      "Stratum collects agent payments, nets them, and settles USDC directly to your service wallets.",
  },
];

const automatedFeatures = [
  "Collects Ed25519-signed payment receipts from AI agents",
  "Batches into 60-second settlement windows",
  "Computes multilateral netting (1,000 payments → ~10 transfers)",
  "Builds Merkle proof tree (RFC 6962)",
  "Anchors Merkle root on Solana mainnet",
  "Produces TEE attestation per settlement window (Intel TDX on Phala Cloud)",
  "Executes USDC transfers to your service wallets",
  "Supports Solana and Base",
];

export default function FacilitatorsPage() {
  return (
    <>
      <main>
        {/* Hero */}
        <section className="pt-24 pb-20 px-6 lg:px-16">
          <div className="max-w-3xl">
            <p className="text-[11px] font-mono text-[#3B82F6] uppercase tracking-[0.2em] mb-6">
              For Service Providers
            </p>
            <h1 className="text-[#0A0A0A] text-4xl lg:text-5xl font-medium leading-tight mb-6">
              Plug into Stratum.
              <br />
              Settlement happens automatically.
            </h1>
            <p className="text-[#6B7280] text-lg leading-relaxed max-w-2xl mb-10">
              Stratum clears, nets, and settles USDC on Solana and Base.
              No webhooks. No servers. No code.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#get-started"
                className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] transition-colors"
              >
                Get your API key
              </a>
              <Link
                href="/docs/facilitators"
                className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium text-[#6B7280] border border-[#E5E7EB] hover:text-[#0A0A0A] hover:border-[#D1D5DB] transition-colors"
              >
                Read the docs
              </Link>
            </div>
          </div>
        </section>

        {/* Value Props */}
        <section className="py-20 px-6 lg:px-16 border-t border-[#F3F4F6]">
          <div className="max-w-5xl">
            <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.2em] mb-10">
              Why Stratum
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {valueProps.map((prop) => (
                <div key={prop.title} className="space-y-4">
                  <div className="w-10 h-10 rounded-none bg-[#F3F4F6] flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={prop.icon} />
                    </svg>
                  </div>
                  <h3 className="text-[#0A0A0A] text-lg font-medium">
                    {prop.title}
                  </h3>
                  <p className="text-[#6B7280] text-sm leading-relaxed">
                    {prop.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-6 lg:px-16 border-t border-[#F3F4F6]">
          <div className="max-w-3xl">
            <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.2em] mb-10">
              How it works
            </p>
            <div className="space-y-10">
              {steps.map((step) => (
                <div key={step.n} className="flex gap-5">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-none bg-[#003FFF] text-white text-sm font-medium shrink-0 mt-0.5">
                    {step.n}
                  </span>
                  <div>
                    <h3 className="text-[#0A0A0A] text-base font-medium mb-2">
                      {step.title}
                    </h3>
                    <p className="text-[#6B7280] text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-20 px-6 lg:px-16 border-t border-[#F3F4F6] bg-[#FAFAFA]">
          <div className="max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-[#0A0A0A] text-3xl font-medium mb-2">
                  60s
                </p>
                <p className="text-[#6B7280] text-sm">
                  Settlement window interval
                </p>
              </div>
              <div>
                <p className="text-[#0A0A0A] text-3xl font-medium mb-2">
                  10,000×
                </p>
                <p className="text-[#6B7280] text-sm">
                  Transaction compression via netting
                </p>
              </div>
              <div>
                <p className="text-[#0A0A0A] text-3xl font-medium mb-2">
                  Solana + Base
                </p>
                <p className="text-[#6B7280] text-sm">
                  Live on both chains
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Get Your API Key */}
        <section id="get-started" className="py-20 px-6 lg:px-16 border-t border-[#F3F4F6] scroll-mt-16">
          <div className="max-w-3xl">
            <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.2em] mb-10">
              Get started
            </p>
            <h2 className="text-[#0A0A0A] text-2xl font-medium mb-3">
              Get your API key
            </h2>
            <p className="text-[#6B7280] text-sm leading-relaxed mb-8">
              Generate a key to start integrating with the Stratum settlement
              network. No approval required.
            </p>
            <ApiKeyForm />
          </div>
        </section>

        {/* Register a Service */}
        <section className="py-20 px-6 lg:px-16 border-t border-[#F3F4F6] bg-[#FAFAFA]">
          <div className="max-w-3xl">
            <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.2em] mb-10">
              Registration
            </p>
            <h2 className="text-[#0A0A0A] text-2xl font-medium mb-3">
              Register a service
            </h2>
            <p className="text-[#6B7280] text-sm leading-relaxed mb-8">
              One API call. Provide your service name, wallet address, and price per request.
            </p>
            <CodeBlock code={REGISTER_EXAMPLE} />
            <p className="text-[#6B7280] text-sm leading-relaxed mt-6">
              That&apos;s it. Stratum handles clearing, netting, Merkle proofs,
              and USDC settlement automatically.
            </p>
          </div>
        </section>

        {/* What Stratum Does Automatically */}
        <section className="py-20 px-6 lg:px-16 border-t border-[#F3F4F6]">
          <div className="max-w-3xl">
            <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.2em] mb-10">
              Under the hood
            </p>
            <h2 className="text-[#0A0A0A] text-2xl font-medium mb-6">
              What Stratum does automatically
            </h2>
            <ul className="space-y-4">
              {automatedFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 bg-[#3B82F6] rounded-full shrink-0" />
                  <span className="text-[#6B7280] text-sm leading-relaxed">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 lg:px-16 border-t border-[#F3F4F6]">
          <div className="max-w-3xl">
            <h2 className="text-[#0A0A0A] text-2xl font-medium mb-4">
              Ready to get started?
            </h2>
            <p className="text-[#6B7280] text-sm leading-relaxed mb-8">
              Register your service and USDC arrives every 60 seconds. No
              servers to run, no webhooks to manage, no code to deploy.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#get-started"
                className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] transition-colors"
              >
                Get your API key
              </a>
              <Link
                href="/docs/facilitators"
                className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium text-[#6B7280] border border-[#E5E7EB] hover:text-[#0A0A0A] hover:border-[#D1D5DB] transition-colors"
              >
                Read the docs
              </Link>
            </div>
          </div>
        </section>

        {/* Advanced */}
        <section className="py-16 px-6 lg:px-16 border-t border-[#F3F4F6] bg-[#FAFAFA]">
          <div className="max-w-3xl">
            <details>
              <summary className="text-[#9CA3AF] text-sm cursor-pointer hover:text-[#6B7280] transition-colors">
                Advanced: Custom settlement flows
              </summary>
              <div className="mt-6 space-y-4">
                <p className="text-[#6B7280] text-sm leading-relaxed">
                  For custom settlement workflows, Stratum also supports:
                </p>
                <ul className="list-disc list-inside text-sm text-[#6B7280] leading-relaxed space-y-2 pl-2">
                  <li>
                    <strong className="text-[#0A0A0A]">Webhook API</strong> — register a webhook to receive settlement batches and execute transfers yourself
                  </li>
                  <li>
                    <strong className="text-[#0A0A0A]">Settlement Dashboard</strong> — settle batches manually using your Phantom wallet at <code className="text-[#3B82F6] bg-[#F3F4F6] px-1">/dashboard</code>
                  </li>
                  <li>
                    <strong className="text-[#0A0A0A]">Polling API</strong> — poll <code className="text-[#3B82F6] bg-[#F3F4F6] px-1">GET /v1/settle/pending</code> for pending batches
                  </li>
                </ul>
                <p className="text-[#6B7280] text-sm leading-relaxed">
                  See the{" "}
                  <Link href="/docs/facilitators#advanced" className="text-[#3B82F6] hover:underline">
                    full documentation
                  </Link>{" "}
                  for details.
                </p>
              </div>
            </details>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
