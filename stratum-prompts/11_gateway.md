# Prompt 11 — Gateway: The Clearing Engine Runtime

@STRATUM_CONTEXT.md

Build the Stratum Gateway at `apps/gateway`. This is the core runtime — the actual clearing engine that processes x402 payments. It is a Fastify server, NOT a Next.js app.

**CRITICAL REMINDER: Stratum is NOT a facilitator. It never touches money. It never settles on-chain. It records receipts, computes netting, and sends settlement INSTRUCTIONS to the real facilitator (Coinbase/Circle). The facilitator moves the money.**

## Server Setup

Fastify + TypeScript. High-performance, low-overhead.

```
apps/gateway/
├── src/
│   ├── index.ts              # Server entry point
│   ├── config.ts             # Environment config
│   ├── routes/
│   │   ├── proxy.ts          # Reverse proxy handler (no-code integration)
│   │   ├── clearing.ts       # Clearing API (receipt submission, window info)
│   │   ├── proofs.ts         # Merkle proof endpoints
│   │   └── admin.ts          # Console-facing API (stats, services, windows)
│   ├── services/
│   │   ├── clearing-engine.ts    # Orchestrates the full clearing cycle
│   │   ├── receipt-processor.ts  # Validates and records incoming receipts
│   │   ├── settlement-loop.ts    # Background loop: close window → net → instruct → anchor
│   │   ├── facilitator-client.ts # Sends settlement instructions to facilitator
│   │   └── service-registry.ts   # Manages registered API services
│   ├── middleware/
│   │   ├── x402.ts           # x402 payment flow middleware
│   │   └── auth.ts           # API key auth for admin routes
│   └── utils/
│       └── logger.ts         # Structured logging (pino, already built into Fastify)
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Reverse Proxy Mode (the no-code integration path)

This is how most users interact with Stratum. They register an API in the Console, get a Stratum endpoint, and agents hit that endpoint.

### Route: `GET/POST/PUT/DELETE /s/:slug/*`

```typescript
// 1. Agent sends request to https://gateway.stratum.valeo.com/s/weather-api/v1/forecast
// 2. Gateway looks up service by slug "weather-api"
// 3. Check for X-PAYMENT or Authorization header with payment proof

// If NO payment:
//   → Return 402 Payment Required
//   → Headers include: X-PAYMENT-REQUIRED with base64 PaymentRequirements
//     (price, asset, payee address, network, facilitator, expiry)
//   → Agent reads this header and knows how to pay

// If payment header IS present:
//   → Verify Ed25519 signature on the payment intent
//   → Check idempotency key (reject duplicates, return original receipt if seen)
//   → Check optional budget guard (if configured)
//   → Create Receipt object, sign it with Stratum's key
//   → Submit receipt to WindowManager (gets sequence number)
//   → Forward the ORIGINAL request to service's target URL
//     (strip payment headers, forward everything else)
//   → Return service's response to agent
//   → Add X-STRATUM-RECEIPT header with receipt_id
//   → Add X-STRATUM-WINDOW header with current window_id
```

Important: The agent gets the API response immediately. The receipt is recorded but NOT settled. Settlement happens asynchronously in the background.

### Route: `POST /v1/clear`

For the one-line integration path. Existing x402 services call this instead of the facilitator's /settle endpoint:

```typescript
// Service sends: { paymentPayload, paymentRequirements }
// Gateway:
//   1. Verifies payment signature
//   2. Creates and signs receipt
//   3. Submits to WindowManager
//   4. Returns: { receipt_id, window_id, status: 'cleared' }
//
// Note: 'cleared' means recorded in the clearing ledger.
// It does NOT mean settled on-chain. Settlement happens at window close.
```

## Clearing API (public)

```
GET  /v1/receipt/:id                    → Receipt details + signed receipt
GET  /v1/receipt/:id/proof              → Merkle inclusion proof for this receipt
GET  /v1/window/current                 → Current window: id, state, receipt count, time remaining
GET  /v1/window/:id                     → Window details: state, volumes, merkle root, anchor
GET  /v1/window/:id/head                → SignedWindowHead (the signed commitment)
GET  /v1/window/:id/consistency/:fromId → Consistency proof between two windows
```

## Admin API (authenticated, for Console)

```
GET    /admin/stats                → Dashboard stats (earnings, savings, counts)
GET    /admin/services             → List services for authenticated user
POST   /admin/services             → Register new service
GET    /admin/services/:id         → Service detail
PATCH  /admin/services/:id         → Update service (pricing, status)
DELETE /admin/services/:id         → Deactivate service
GET    /admin/services/:id/receipts → Receipts for a service (paginated)
GET    /admin/windows              → List settlement windows (paginated)
GET    /admin/windows/:id          → Window detail with netting breakdown
GET    /admin/feed                 → SSE stream of real-time receipts
```

## Settlement Loop

The background process that runs continuously:

```typescript
async function settlementLoop(config: StratumConfig) {
  const windowManager = new WindowManager(config, ledger, wal)
  const facilitatorClient = new CoinbaseFacilitatorClient(config.facilitatorUrl)
  const anchor = new SolanaAnchor(config.solanaRpc, config.anchorProgramId, config.keypair)

  while (true) {
    await sleep(config.settlementWindowSeconds * 1000)

    try {
      // 1. Close current window + open new one (zero downtime)
      const closedWindow = windowManager.getCurrentWindow()
      closedWindow.preClose()
      windowManager.openNextWindow()  // New window accepts receipts immediately

      // 2. Compute netting on the closed window
      const positions = ledger.getPositions(closedWindow.windowId)
      const netting = computeMultilateralNetting(positions)
      closedWindow.computeNetting()

      logger.info({
        windowId: closedWindow.windowId,
        receipts: netting.gross_transaction_count,
        transfers: netting.transfer_count,
        compression: netting.compression_ratio,
        grossVolume: netting.gross_volume.toString(),
        netVolume: netting.net_volume.toString(),
      }, 'Netting computed')

      // 3. Send settlement INSTRUCTIONS to the facilitator
      // The facilitator (Coinbase) does the actual on-chain USDC transfers
      // Stratum does NOT move money
      const batch = createSettlementBatch(netting, closedWindow.windowId, merkleRoot, config.facilitatorId)
      const settlementResult = await facilitatorClient.submitSettlementBatch(batch)
      closedWindow.instruct(batch)

      // 4. Build Merkle tree from all receipts in the window
      const receipts = closedWindow.getReceipts()
      const leaves = receipts.map(r => hashReceipt(r))
      const tree = new StratumMerkleTree(leaves)

      // 5. Anchor Merkle root on Solana (this is just a data hash, NOT a payment)
      const anchorRecord = await anchor.anchor({
        windowId: closedWindow.windowId,
        merkleRoot: tree.root,
        receiptCount: tree.size,
        chain: 'solana',
        timestamp: Date.now(),
      })
      closedWindow.anchor(anchorRecord)

      // 6. Sign and publish window head
      const head = await closedWindow.finalize(config.signingKey)

      logger.info({
        windowId: closedWindow.windowId,
        anchorTx: anchorRecord.tx_hash,
        merkleRoot: Buffer.from(tree.root).toString('hex'),
      }, 'Window finalized')

    } catch (error) {
      logger.error({ error }, 'Settlement loop error')
      // Error handling:
      // - If netting fails: log, carry forward receipts to next window
      // - If facilitator unreachable: retry 3x with backoff, then mark window FAILED
      // - If anchor fails: settlement is still valid, retry anchor next block
    }
  }
}
```

## Configuration

```typescript
interface GatewayConfig {
  port: number                      // default 3100
  host: string                      // default '0.0.0.0'
  settlementWindowSeconds: number   // default 300 (5 min)
  facilitatorUrl: string            // default 'https://x402.coinbase.com'
  facilitatorId: string
  solanaRpc: string
  anchorProgramId: string
  signingKey: Uint8Array            // Ed25519 key for signing receipts + window heads
  databaseUrl: string               // Postgres for persistent state
  redisUrl: string                  // Redis for real-time state + SSE
  maxReceiptsPerWindow: number      // optional cap, triggers early settlement
  riskControlsEnabled: boolean      // whether to check budget guards
}
```

## Docker

Create a Dockerfile for the gateway:
```dockerfile
FROM node:20-alpine
WORKDIR /app
# Copy monorepo packages it depends on
# Build and start
CMD ["node", "dist/index.js"]
```

Add to `docker/docker-compose.yml`:
```yaml
gateway:
  build:
    context: ..
    dockerfile: apps/gateway/Dockerfile
  ports:
    - "3100:3100"
  depends_on:
    - postgres
    - redis
  env_file:
    - ../.env
```

## Tests
- Proxy mode end-to-end: mock agent → 402 → payment → receipt → forwarded response → X-STRATUM-RECEIPT header
- Clearing endpoint: submit receipt → verify it's in current window
- Settlement loop: seed 100 receipts → trigger settlement → verify netting output → verify mock facilitator received instructions → verify mock anchor called
- Idempotency: same payment twice → same receipt_id returned, no double-count
- Window transition: receipts during settlement go to new window, not closed one
- SSE feed: connect to /admin/feed, submit receipt, verify event received
