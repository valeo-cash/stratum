FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# ── Stage 1: Install dependencies ──
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/gateway/package.json apps/gateway/
COPY packages/stratum-core/package.json packages/stratum-core/
COPY packages/stratum-receipts/package.json packages/stratum-receipts/
COPY packages/stratum-merkle/package.json packages/stratum-merkle/
COPY packages/stratum-netting/package.json packages/stratum-netting/
COPY packages/stratum-ledger/package.json packages/stratum-ledger/
COPY packages/stratum-anchor/package.json packages/stratum-anchor/
COPY packages/stratum-settlement/package.json packages/stratum-settlement/
COPY packages/stratum-agent/package.json packages/stratum-agent/
COPY packages/stratum-adapter-x402/package.json packages/stratum-adapter-x402/
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ──
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/gateway/ apps/gateway/
RUN cd apps/gateway && npx prisma generate
RUN pnpm --filter @valeo/gateway... build

# ── Stage 3: Production ──
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/gateway/dist ./apps/gateway/dist
COPY --from=build /app/apps/gateway/node_modules ./apps/gateway/node_modules
COPY --from=build /app/apps/gateway/prisma ./apps/gateway/prisma
COPY --from=build /app/apps/gateway/package.json ./apps/gateway/
COPY --from=build /app/package.json ./
WORKDIR /app/apps/gateway
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3100/health || exit 1
CMD ["node", "dist/index.js"]
