# Prompt 08 — Website: Integration + Technical + Footer

@STRATUM_CONTEXT.md

Continue building `apps/web`. Add sections 7-11 (final sections).

### 7. Integration — "Start in 30 seconds"

Title: "Integration so easy it feels wrong" — slate-100, centered

Three tabs (use a clean tab component, not browser tabs):

**Tab 1: "No Code" (default, highlighted with blue-400 indicator)**

An animated mockup showing the Console onboarding flow. Build this as a self-contained styled component (NOT a screenshot — build the actual UI elements):

Step 1: Input field with placeholder "https://api.yourservice.com/v1" and a "Next →" button
Step 2: Dropdown showing "$0.002 per request" with USDC icon
Step 3: Result card showing:
```
Your Stratum endpoint:
https://stratum.valeo.com/s/your-service/v1
```
With a copy button.
Step 4: Green checkmark with "Share this URL with agents. You're done."

Animate through the steps automatically (2s per step) or let users click through. Caption below: "No blockchain knowledge. No code changes. No SDK. 30 seconds."

**Tab 2: "One Line"**

Syntax-highlighted code block (dark theme, JetBrains Mono):
```typescript
// Before — every API call settles on-chain
const paywall = createPaywall({
  facilitatorUrl: 'https://x402.coinbase.com'
})

// After — Stratum clears, nets, and batch-settles
const paywall = createPaywall({
  facilitatorUrl: 'https://stratum.valeo.com/v1/facilitate'
})
```

Caption: "Already using x402? Change one URL. Same facilitator settles. Stratum just clears the traffic first."

Note the precision: "Same facilitator settles" — because Stratum is NOT a facilitator.

**Tab 3: "Full SDK"**

```typescript
import { StratumGateway } from '@valeo/stratum'

const gateway = new StratumGateway({
  facilitator: 'https://x402.coinbase.com',  // YOUR facilitator
  settlementWindow: '5m',
  chain: 'solana',
  asset: 'USDC',
})

// Stratum clears + nets. Facilitator settles.
app.use('/api', gateway.middleware())
```

Caption: "Self-host your own clearing node. Full control. Your facilitator, your chain."

### 8. Architecture — "Under the hood"

Title: "Under the hood" — slate-100, centered

A clean SVG system diagram (NOT the particle visualization — a proper architecture diagram):

```
┌─────────┐     ┌──────────────────────────────────┐     ┌──────────┐
│  Agent   │────▶│         Stratum Gateway           │────▶│ Service  │
│  (pays)  │     │                                    │     │  (API)   │
└─────────┘     │  ┌──────────┐  ┌───────────────┐  │     └──────────┘
                │  │ Receipt   │  │   Netting      │  │
                │  │ Ledger    │  │   Engine       │  │
                │  └──────────┘  └───────────────┘  │
                │          │              │          │
                │          ▼              ▼          │
                │  ┌──────────────────────────┐     │
                │  │   Settlement Instructions │     │
                │  └────────────┬─────────────┘     │
                └───────────────┼────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌─────────────┐        ┌──────────────┐
            │ Facilitator  │        │   Solana      │
            │ (settles $)  │        │ (Merkle root) │
            └─────────────┘        └──────────────┘
```

Build this as an SVG with subtle animations (nodes fade in sequentially on scroll). Color-code: Stratum components in blue, external services in slate, Solana in green.

Below the diagram, four detail cards in a 2×2 grid:

Card 1 — **Receipts**: "Ed25519 signed. Deterministic canonical encoding. Microsecond issuance. No chain interaction."
Card 2 — **Merkle Trees**: "RFC 6962 compliant. Inclusion + consistency proofs. Append-only window chaining."
Card 3 — **Netting**: "Multilateral. Sum-to-zero invariant. Compresses N×N positions into minimal transfers."
Card 4 — **Anchoring**: "Chain-agnostic. Solana reference implementation. One transaction per window. Data only — not payments."

Each card: monospace title (blue-400), body in slate-400, slate-900 bg.

### 9. For Facilitators

Title: "We don't replace facilitators. We make them 1,000,000× more efficient." — slate-100

Two paragraphs, max-width 640px, centered:

"Coinbase processes 500K x402 transactions per week. At agent scale, that will be 500K per second. No facilitator can settle each one individually. Stratum sits in front of facilitators, clears and nets the traffic, and delivers clean batch settlement instructions. Coinbase receives 50 transfers instead of 50 million."

"Stratum is chain-agnostic and facilitator-agnostic. Coinbase, Circle, Stripe's Tempo — it doesn't matter. We make every facilitator and every chain more efficient."

CTA button: "Integrate as a facilitator →" (ghost button, links to docs)

### 10. Trust + Open Source

Title: "Verify everything." — slate-100

Three items, horizontal layout with large monospace numbers:

"01" — "Every receipt is Ed25519 signed and independently verifiable by any party."
"02" — "Every window has a Merkle root anchored on-chain. History cannot be rewritten."
"03" — "The protocol spec is open. The proofs are public. Run your own auditor."

CTA row:
- "Read the protocol spec →" (ghost button)
- "Open receipt explorer →" (ghost button, links to explorer)

### 11. Footer

Dark (slate-950), minimal:

Left: "Valeo Stratum" in JetBrains Mono + "Built by Valeo · Lisbon"
Right: Links in columns:
- Product: Console, Explorer, SDK, Docs
- Protocol: Spec, GitHub, Security
- Company: About Valeo, Careers, Contact

Bottom: "© 2026 Valeo" in slate-600

No newsletter signup. No social icons. Clean.
