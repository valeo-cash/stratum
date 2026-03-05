import type { Metadata } from "next";
import Link from "next/link";
import Footer from "../../components/Footer";
import ApiKeyForm from "../../components/ApiKeyForm";
import CodeBlock from "../../components/CodeBlock";

const QUICKSTART_CODE = `npm install @valeostratum/facilitator

import express from 'express';
import { StratumFacilitator } from '@valeostratum/facilitator';

const app = express();

const facilitator = new StratumFacilitator({
  apiKey: 'sk_live_your_key_here',
  webhookSecret: 'whsec_your_secret',
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY,
});

app.post('/settle', express.raw({ type: '*/*' }), facilitator.handler());
app.listen(3200, () => console.log('Facilitator ready on port 3200'));`;

export const metadata: Metadata = {
  title: "Facilitators — Valeo Stratum",
  description:
    "Process 50 settlements instead of 500,000. Stratum compresses AI agent payments into minimal batch instructions.",
};

const valueProps = [
  {
    title: "10,000× fewer transactions",
    description:
      "Multilateral netting reduces millions of payments to the minimum transfer set.",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
  {
    title: "Real-time batches",
    description:
      "Settlement windows close every 60 seconds. Receive structured batch instructions via webhook.",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Multi-chain",
    description:
      "Support Solana and Base from a single integration. More chains coming.",
    icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  },
];

const steps = [
  {
    n: 1,
    title: "Agents make payments",
    description:
      "AI agents call APIs through Stratum. Each call generates a cryptographic receipt.",
  },
  {
    n: 2,
    title: "Stratum batches and nets",
    description:
      "Receipts are collected into 60-second windows. Multilateral netting compresses the transfer set.",
  },
  {
    n: 3,
    title: "You receive a webhook",
    description:
      "A single POST with the net transfers, Merkle root, and on-chain anchor hash.",
  },
  {
    n: 4,
    title: "Execute and confirm",
    description:
      "Execute the USDC transfers on-chain and confirm back to Stratum with transaction hashes.",
  },
];

export default function FacilitatorsPage() {
  return (
    <>
      <main>
        {/* Hero */}
        <section className="pt-24 pb-20 px-6 lg:px-16">
          <div className="max-w-3xl">
            <p className="text-[11px] font-mono text-[#3B82F6] uppercase tracking-[0.2em] mb-6">
              For Facilitators
            </p>
            <h1 className="text-[#0A0A0A] text-4xl lg:text-5xl font-medium leading-tight mb-6">
              Process 50 settlements
              <br />
              instead of 500,000
            </h1>
            <p className="text-[#6B7280] text-lg leading-relaxed max-w-2xl mb-10">
              Stratum compresses millions of AI agent payments into minimal
              batch settlement instructions. Less infrastructure. Same revenue.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/docs/facilitators"
                className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] transition-colors"
              >
                Read the integration guide →
              </Link>
              <a
                href="mailto:valeobank@gmail.com"
                className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium text-[#6B7280] border border-[#E5E7EB] hover:text-[#0A0A0A] hover:border-[#D1D5DB] transition-colors"
              >
                Contact us
              </a>
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
                  2 chains
                </p>
                <p className="text-[#6B7280] text-sm">
                  Solana + Base, more coming
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Get Your API Key */}
        <section className="py-20 px-6 lg:px-16 border-t border-[#F3F4F6]">
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

        {/* Integrate in 10 Lines */}
        <section className="py-20 px-6 lg:px-16 border-t border-[#F3F4F6] bg-[#FAFAFA]">
          <div className="max-w-3xl">
            <p className="text-[11px] font-mono text-[#9CA3AF] uppercase tracking-[0.2em] mb-10">
              Integration
            </p>
            <h2 className="text-[#0A0A0A] text-2xl font-medium mb-3">
              Integrate in 10 lines
            </h2>
            <p className="text-[#6B7280] text-sm leading-relaxed mb-8">
              Install the SDK, paste the snippet, and deploy. Settlement batches
              arrive automatically every 60 seconds.
            </p>
            <CodeBlock code={QUICKSTART_CODE} />
            <div className="mt-10 space-y-6">
              {[
                { n: 1, text: "Get your API key above" },
                { n: 2, text: "npm install and paste the code" },
                { n: 3, text: "Deploy — settlement batches arrive every 60 seconds" },
              ].map((s) => (
                <div key={s.n} className="flex gap-4 items-start">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-none bg-[#003FFF] text-white text-xs font-medium shrink-0 mt-0.5">
                    {s.n}
                  </span>
                  <p className="text-[#0A0A0A] text-sm">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 lg:px-16 border-t border-[#F3F4F6]">
          <div className="max-w-3xl">
            <h2 className="text-[#0A0A0A] text-2xl font-medium mb-4">
              Ready to integrate?
            </h2>
            <p className="text-[#6B7280] text-sm leading-relaxed mb-8">
              The integration takes less than a day. Register a webhook, handle
              the settlement payloads, and confirm execution.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/docs/facilitators"
                className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium bg-[#003FFF] text-white hover:bg-[#0033CC] transition-colors"
              >
                Read the integration guide →
              </Link>
              <a
                href="mailto:valeobank@gmail.com"
                className="inline-flex items-center justify-center rounded-none px-6 py-3 text-sm font-medium text-[#6B7280] border border-[#E5E7EB] hover:text-[#0A0A0A] hover:border-[#D1D5DB] transition-colors"
              >
                Contact us
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
