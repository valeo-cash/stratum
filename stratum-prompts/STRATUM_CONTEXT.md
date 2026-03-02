# Valeo Stratum — Project Context

> Save this file as `STRATUM_CONTEXT.md` in your project root. Reference it in every Cursor prompt with `@STRATUM_CONTEXT.md`.

---

## What Stratum Is

Valeo Stratum is a **clearing and netting layer** for x402 AI agent payments. It is NOT a facilitator. It never touches money. It never settles payments on-chain. It never holds custody of anything.

Stratum solves the problem Stripe identified in their 2025 Annual Letter: current blockchains cannot handle the 1M–1B transactions per second that AI agents will generate. Rather than building a new blockchain (like Stripe's Tempo at $5B), Stratum applies the same clearing/netting model that traditional finance has used for decades (DTCC, CLS Bank, Visa) to compress millions of logical transactions into minimal on-chain settlements.

## The Core Problem

In x402 today, every API call by an AI agent is a separate on-chain payment. At scale:
- 1M API calls/sec × $0.005 gas = $5,000/sec = $432M/day in gas alone
- No blockchain can handle 1B TPS (Solana: ~4K, Tempo target: 100K)
- Chain congestion causes payment delays and fee spikes (Stripe documented a 35× fee spike)
- Every payment is publicly visible on-chain (no privacy)

## Critical Architecture: Stratum is NOT a Facilitator

```
Agent → Stratum (clearing layer) → Facilitator (Coinbase/Circle) → Chain (Solana/Base)
```

Stratum does exactly three things:

1. **Intercepts and defers.** When an agent sends a payment, Stratum does NOT settle it. It records a signed receipt — a cryptographic IOU. The money has not moved.

2. **Nets.** At settlement window close, Stratum computes net positions across all counterparties. 1M bilateral IOUs collapse into a handful of net transfers.

3. **Instructs.** Stratum sends settlement instructions to the REAL facilitator (Coinbase, Circle, etc.). The facilitator executes the actual on-chain USDC transfers. Stratum separately anchors a Merkle root on-chain for auditability — but that's a data hash, not a payment.

**Why this matters:**
- If Stratum IS a facilitator → money transmitter, custody risk, competes with Coinbase. Bad.
- If Stratum INSTRUCTS facilitators → clearing/netting service, minimal regulatory surface, no custody, Coinbase is a customer not competitor. Good.

This mirrors traditional finance exactly. DTCC doesn't hold your stocks — it tells brokers what to settle. CLS Bank doesn't hold dollars — it instructs banks.

## How It Works End-to-End

1. Agent calls a Stratum-proxied API endpoint
2. Stratum returns x402 payment-required headers (price, asset, payee)
3. Agent signs a payment intent
4. Stratum verifies signature, records a signed Ed25519 receipt OFF-CHAIN (microseconds, zero gas)
5. Stratum forwards the request to the real API service
6. Service responds normally to the agent
7. Every N minutes (settlement window), Stratum:
   a. Closes the current window, opens a new one (zero downtime)
   b. Computes NET positions across all counterparties (netting)
   c. Sends settlement INSTRUCTIONS to the facilitator (Coinbase settles on-chain)
   d. Builds a Merkle tree of all receipts in the window
   e. Anchors the Merkle root on Solana (1 transaction — just a hash, not payments)
   f. Signs and publishes a Window Head that chains to the previous window
8. Any receipt can be cryptographically proven against the on-chain root

Result: 1,000,000 logical payments → ~50 on-chain transactions. Compression ratio >1,000,000:1.

## Product Surfaces

### 1. Stratum Gateway (`gateway.stratum.valeo.com`)
The core runtime. A reverse proxy + clearing engine. Service providers register their API, agents hit the proxied endpoint, Stratum handles payment clearing automatically.

### 2. Stratum Console (`console.stratum.valeo.com`)
Web dashboard where service providers:
- Register APIs and set per-route pricing (no-code, 30 seconds)
- Monitor real-time receipt flow and earnings
- View netting ratios and gas savings
- Verify receipts, browse settlement windows
- Configure facilitator and withdrawal settings

### 3. Stratum Explorer (`explorer.stratum.valeo.com`)
Public receipt verification tool. Paste a receipt hash, see the full Merkle proof path, verify against the on-chain anchor. Anyone can audit.

### 4. Stratum SDK (npm packages)
For developers wanting deeper integration or self-hosting:
- `@valeo/stratum-core` — types, interfaces, constants
- `@valeo/stratum-receipts` — receipt signing/verification
- `@valeo/stratum-merkle` — tree construction + proofs
- `@valeo/stratum-netting` — netting algorithms
- `@valeo/stratum-ledger` — event-sourced ledger, WAL
- `@valeo/stratum-anchor` — chain-agnostic anchoring
- `@valeo/stratum-adapter-x402` — x402 integration adapter

## Integration Tiers

### No-Code (primary path, 30 seconds)
1. Sign up at console.stratum.valeo.com
2. Paste your API URL
3. Set pricing per route
4. Get your Stratum endpoint
5. Share endpoint with agents
→ Zero code. Zero blockchain knowledge.

### One-Line (existing x402 services)
Add Stratum as middleware between your service and your facilitator. Same facilitator, same chain, but receipts are now cleared and netted before settlement.

### Full SDK (enterprises/self-hosting)
Install packages, run your own clearing node, configure custom settlement windows and netting logic.

## Relationship to x402 Ecosystem

- Stratum is NOT a competitor to Coinbase, Circle, or any facilitator
- Stratum WRAPS facilitators — it's a clearing layer that sits in front of them
- Coinbase benefits: receives 50 batched net transfers instead of 50M individual settlements
- Stratum is chain-agnostic: Solana, Base, Ethereum, Tempo — doesn't matter
- Stratum makes every chain and every facilitator more efficient

## Key Advantages
1. **1,000,000:1 transaction compression** via multilateral netting
2. **Sub-cent per-transaction cost** ($0.000005 vs $0.005)
3. **Zero-latency cryptographic auditability** (async Merkle proofs, not in the hot path)
4. **Pluggable pre-flight risk controls** (optional budget enforcement interface)
5. **Facilitator-agnostic settlement** (works with any x402 facilitator, any chain)

## Tech Stack
- **Monorepo**: pnpm workspaces + turborepo
- **Web/Console/Explorer**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Gateway**: Node.js + Fastify (high-performance runtime)
- **Database**: PostgreSQL (Prisma ORM) for console state, Redis for real-time
- **Blockchain**: Solana (@solana/web3.js) for Merkle anchoring
- **Crypto**: Ed25519 (@noble/ed25519) for receipts, SHA-256 for Merkle trees
- **Settlement**: USDC via facilitator (Coinbase x402 facilitator as default)

## Design System
- Dark theme throughout (slate-950 `#020617` base)
- Text: slate-100 headers, slate-400 body
- Primary: blue-400 `#60A5FA`
- Success/savings: green-400 `#34D399`
- Warning: amber-400 `#FBBF24`
- Error: red-400 `#F87171`
- Code font: JetBrains Mono / SF Mono
- UI font: system sans-serif stack
- Borders: subtle slate-800, rounded-lg default
- Aesthetic: Stripe docs meets Linear UI. Technical, premium, minimal. No fluff.
