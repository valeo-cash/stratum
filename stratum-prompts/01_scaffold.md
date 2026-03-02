# Prompt 01 — Project Scaffold + Monorepo Setup

@STRATUM_CONTEXT.md

Set up the Valeo Stratum monorepo from scratch.

## Structure

Use pnpm workspaces + turborepo. Create this exact structure:

```
valeo-stratum/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── tsconfig.base.json
├── .gitignore
├── .env.example
├── apps/
│   ├── web/                    # Marketing + docs site (Next.js 14)
│   ├── console/                # Service provider dashboard (Next.js 14)
│   ├── explorer/               # Public receipt explorer (Next.js 14)
│   └── gateway/                # Clearing engine runtime (Fastify)
├── packages/
│   ├── ui/                     # Shared UI components (React + Tailwind)
│   ├── stratum-core/           # Core types, interfaces, constants
│   ├── stratum-receipts/       # Receipt encoding, signing, verification
│   ├── stratum-merkle/         # Merkle tree, inclusion/consistency proofs
│   ├── stratum-netting/        # Netting algorithms
│   ├── stratum-ledger/         # Event-sourced ledger, WAL
│   ├── stratum-anchor/         # Chain-agnostic anchoring + Solana adapter
│   └── stratum-adapter-x402/   # x402 integration adapter
└── docker/
    └── docker-compose.yml      # Local dev (Postgres, Redis)
```

## Requirements

1. Every `apps/web`, `apps/console`, `apps/explorer`: Next.js 14, App Router, TypeScript, Tailwind CSS
2. `apps/gateway`: Fastify + TypeScript (NOT Next.js — this is a high-performance runtime server)
3. Every `packages/*`: TypeScript, tsup for bundling, vitest for testing
4. Shared tsconfig extending tsconfig.base.json
5. Turborepo pipeline: build, test, lint, dev
6. Docker compose with Postgres 16 and Redis 7
7. All Next.js apps share the `@valeo/ui` package
8. .env.example with documented variables:
   - DATABASE_URL (Postgres)
   - REDIS_URL
   - SOLANA_RPC_URL
   - FACILITATOR_URL (default: Coinbase x402)
   - SETTLEMENT_WINDOW_SECONDS (default: 300)
   - STRATUM_SIGNING_KEY (Ed25519 private key for receipts)

## Shared UI Package (@valeo/ui)

Create a shared Tailwind config with:
- Dark theme as default
- Color tokens: slate-950 background, slate-900 cards, blue-400 primary, green-400 success, amber-400 warning, red-400 error
- Font: "JetBrains Mono" for code (import via Google Fonts), system sans-serif for UI
- Border radius: 8px default, 12px cards, 16px modals

Create these base components:
- `Button` (primary, secondary, ghost variants)
- `Card` (dark card with border)
- `Input` (dark input with focus ring)
- `Badge` (status badges: active, pending, finalized, error)
- `Code` (inline code + code block with syntax theme)
- `Stat` (number + label card for dashboards)
- `Table` (dark themed data table)

Don't build any pages yet. Just the scaffold, configs, shared UI primitives. Verify `pnpm dev` runs all apps and `pnpm build` succeeds.
