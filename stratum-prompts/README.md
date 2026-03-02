# Valeo Stratum — Cursor Build Prompts

## How to Use

### Step 1: Set Up Context
Copy `00_STRATUM_CONTEXT.md` into your project root as `STRATUM_CONTEXT.md`. This is the master context document that every prompt references. Add it to Cursor with `@STRATUM_CONTEXT.md` at the top of every prompt.

### Step 2: Run Prompts in Order
Each prompt builds on the output of previous ones. **Do not skip prompts.** After each prompt, verify the output compiles and runs before moving to the next.

### Prompt Order

| # | File | What It Builds | Estimated Time |
|---|------|---------------|----------------|
| 00 | `00_STRATUM_CONTEXT.md` | Master context (save as `STRATUM_CONTEXT.md` in root) | — |
| 01 | `01_scaffold.md` | Monorepo, configs, shared UI, Docker | 20 min |
| 02 | `02_core_types_receipts.md` | `@valeo/stratum-core` types + `@valeo/stratum-receipts` | 30 min |
| 03 | `03_merkle_anchoring.md` | `@valeo/stratum-merkle` + `@valeo/stratum-anchor` | 30 min |
| 04 | `04_netting_ledger.md` | `@valeo/stratum-netting` + `@valeo/stratum-ledger` | 30 min |
| 05 | `05_settlement_adapter.md` | Settlement state machine + x402 adapter | 30 min |
| 06 | `06_website_hero.md` | Marketing site: nav, hero, problem section | 25 min |
| 07 | `07_website_how_comparison.md` | Marketing site: interactive viz, comparison, analogy | 35 min |
| 08 | `08_website_integration_footer.md` | Marketing site: integration tabs, architecture, footer | 30 min |
| 09 | `09_console_core.md` | Console: auth, database, dashboard, services pages | 40 min |
| 10 | `10_console_realtime.md` | Console: live feed, windows page, receipt explorer | 35 min |
| 11 | `11_gateway.md` | Gateway clearing engine (Fastify runtime) | 45 min |
| 12 | `12_explorer.md` | Standalone explorer with client-side verification | 30 min |
| 13 | `13_integration_simulator.md` | Wire everything together + demo simulator | 40 min |

**Total estimated build time: ~7 hours**

### Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                    PROMPT 01: Scaffold                    │
│  Monorepo · Turborepo · Shared UI · Docker               │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│              PROMPTS 02-05: SDK Packages               │
│                                                        │
│  02: Core Types ──── 03: Merkle ──── 04: Netting      │
│      Receipts          Anchoring        Ledger         │
│                                                        │
│                 05: Settlement State Machine            │
│                     x402 Adapter                       │
└───────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│             PROMPTS 06-08: Marketing Site              │
│                                                        │
│  06: Hero ──── 07: How It Works ──── 08: Integration  │
│   Problem        Comparison            Architecture    │
│                  Analogy               Footer          │
└───────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│             PROMPTS 09-10: Console Dashboard           │
│                                                        │
│  09: Auth ──── Services ──── Dashboard                 │
│  10: Live Feed ──── Windows ──── Receipt Explorer      │
└───────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│            PROMPT 11: Gateway (The Engine)              │
│                                                        │
│  Reverse Proxy · Clearing API · Settlement Loop        │
│  Facilitator Client · Admin API · SSE Feed             │
└───────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│            PROMPT 12: Explorer (Public)                 │
│                                                        │
│  Receipt Search · Signature Verification               │
│  Merkle Proof Visualization · On-Chain Anchor          │
└───────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│          PROMPT 13: Integration + Simulator            │
│                                                        │
│  Console↔Gateway · Explorer↔Gateway · Docker Compose  │
│  Mock Agents · Mock Facilitator · One-Command Demo     │
└───────────────────────────────────────────────────────┘
```

### Critical Design Principle

**Stratum is NOT a facilitator.** It never touches money. It never settles on-chain. The architecture is:

```
Agent → Stratum (clearing) → Facilitator (settlement) → Chain
```

Stratum records receipts, computes netting, and sends settlement INSTRUCTIONS to the real facilitator (Coinbase, Circle). The facilitator moves the money. Stratum separately anchors a Merkle root on-chain for auditability — that's just a data hash, not a payment.

This is what makes Stratum:
- Not a money transmitter (no custody)
- Not a competitor to Coinbase (it's their customer)
- Chain-agnostic (works on any chain the facilitator supports)
