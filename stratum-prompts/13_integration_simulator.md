# Prompt 13 — End-to-End Integration + Demo Simulator

@STRATUM_CONTEXT.md

Wire everything together. This prompt connects the Gateway, Console, Explorer, and SDK packages into a working system with a demo simulator.

## Integration Wiring

### Console → Gateway Connection

The Console (`apps/console`) needs to talk to the Gateway (`apps/gateway`) for real data:

1. Add `GATEWAY_URL` to the Console's env config (default: `http://localhost:3100`)
2. Create a Gateway API client in `apps/console/lib/gateway-client.ts`:
```typescript
export class GatewayClient {
  constructor(private baseUrl: string)
  
  async getStats(): Promise<DashboardStats>
  async getServices(): Promise<ServiceRegistration[]>
  async registerService(service: CreateServiceInput): Promise<ServiceRegistration>
  async getReceipts(serviceId: string, opts: PaginationOpts): Promise<PaginatedReceipts>
  async getWindows(opts: PaginationOpts): Promise<PaginatedWindows>
  async getWindowDetail(windowId: string): Promise<WindowDetail>
  async getReceiptDetail(receiptId: string): Promise<ReceiptDetail>
  async getInclusionProof(receiptId: string): Promise<InclusionProof>
  async subscribeToFeed(): EventSource  // SSE connection
}
```
3. Replace all mock/Prisma queries in Console pages with GatewayClient calls
4. The Console's Prisma database is now ONLY for auth (users, sessions) and service config
5. All receipt/window/stats data comes from the Gateway

### Explorer → Gateway Connection

The Explorer (`apps/explorer`) fetches all data from the Gateway:

1. Add `GATEWAY_URL` to Explorer's env config
2. Create a similar client in `apps/explorer/lib/gateway-client.ts`
3. Explorer has NO database — it's purely a read-only frontend for the Gateway API

### Service Registration Flow (Console → Gateway)

When a user registers a service in the Console:
1. Console saves service config to its Prisma DB (name, target URL, pricing, user association)
2. Console calls Gateway `POST /admin/services` to register the service in the proxy
3. Gateway creates the proxy route `/s/{slug}/*` pointing to the target URL
4. Console displays the Stratum endpoint URL back to the user

### Real-Time Feed (Gateway → Console)

1. Console's Dashboard page connects to Gateway SSE: `GET /admin/feed`
2. Each event is a new receipt in the current window
3. Console renders receipts in the live feed panel
4. Receipt counter and window stats update in real-time

## Demo Simulator

Create `apps/simulator/` — a CLI tool that generates realistic agent traffic against the Gateway.

### Simulated Agents

```typescript
// apps/simulator/src/index.ts

interface SimulatorConfig {
  gatewayUrl: string          // default: http://localhost:3100
  agentCount: number          // default: 10
  serviceSlug: string         // which service to hit
  requestsPerSecond: number   // default: 50
  durationSeconds: number     // default: 300 (5 minutes, one full settlement window)
}

async function runSimulation(config: SimulatorConfig) {
  // 1. Generate N agent keypairs (Ed25519)
  // 2. Each agent makes requests to the Gateway proxy endpoint
  // 3. Agent sends request without payment → gets 402
  // 4. Agent reads payment requirements from 402 response
  // 5. Agent signs a payment intent with its private key
  // 6. Agent resends request with X-PAYMENT header
  // 7. Agent receives response + X-STRATUM-RECEIPT header
  // 8. Log: receipt_id, amount, latency
  // 9. Repeat at configured rate
  // 10. Some agents call multiple services (bidirectional flow for netting)
}
```

### What the Simulator Demonstrates

Running the simulator with the full stack shows:
1. **Console Dashboard**: Live feed fills with receipts, counters increment, chart updates
2. **Settlement happens**: After 5 minutes, the window closes, netting computes, facilitator gets instructions, Merkle root gets anchored
3. **Explorer works**: Take any receipt_id from the simulation, paste into Explorer, see full verification (signature ✓, inclusion proof ✓, anchor ✓)
4. **Netting compression**: With 10 agents calling multiple services, the netting table shows real compression ratios

### Mock Facilitator

For the demo, create a mock facilitator server that the Gateway talks to:

```typescript
// apps/simulator/src/mock-facilitator.ts
// Fastify server on port 3200
// POST /settle → accepts settlement instructions, returns success
// GET /status/:batchId → returns settlement status
// Logs everything so you can see what the real facilitator would receive
```

### Mock Service

```typescript
// apps/simulator/src/mock-service.ts
// Fastify server on port 3300
// GET/POST /* → returns mock API response with 200ms delay
// Logs requests to show that they're being proxied correctly
```

## Docker Compose (Full Stack)

Update `docker/docker-compose.yml` to run the complete system:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: stratum
      POSTGRES_USER: stratum
      POSTGRES_PASSWORD: stratum_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  gateway:
    build:
      context: ..
      dockerfile: apps/gateway/Dockerfile
    ports:
      - "3100:3100"
    depends_on:
      - postgres
      - redis
    environment:
      PORT: 3100
      DATABASE_URL: postgresql://stratum:stratum_dev@postgres:5432/stratum
      REDIS_URL: redis://redis:6379
      FACILITATOR_URL: http://mock-facilitator:3200
      SETTLEMENT_WINDOW_SECONDS: 60  # 1 min for demo
      SOLANA_RPC_URL: https://api.devnet.solana.com

  console:
    build:
      context: ..
      dockerfile: apps/console/Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - gateway
    environment:
      DATABASE_URL: postgresql://stratum:stratum_dev@postgres:5432/stratum
      GATEWAY_URL: http://gateway:3100
      NEXTAUTH_URL: http://localhost:3000

  explorer:
    build:
      context: ..
      dockerfile: apps/explorer/Dockerfile
    ports:
      - "3001:3001"
    depends_on:
      - gateway
    environment:
      GATEWAY_URL: http://gateway:3100

  mock-facilitator:
    build:
      context: ..
      dockerfile: apps/simulator/Dockerfile.facilitator
    ports:
      - "3200:3200"

  mock-service:
    build:
      context: ..
      dockerfile: apps/simulator/Dockerfile.service
    ports:
      - "3300:3300"

volumes:
  pgdata:
```

### One-Command Demo

Add to root `package.json`:
```json
{
  "scripts": {
    "demo": "docker compose -f docker/docker-compose.yml up -d && sleep 5 && pnpm --filter simulator start",
    "demo:stop": "docker compose -f docker/docker-compose.yml down"
  }
}
```

Running `pnpm demo` should:
1. Start Postgres, Redis, Gateway, Console, Explorer, Mock Facilitator, Mock Service
2. Wait for services to be ready
3. Start the simulator sending agent traffic
4. Open browser to Console dashboard showing live receipts flowing in

## Final Verification Checklist

After this prompt, the full system should demonstrate:

- [ ] Agent hits proxy endpoint → gets 402 → pays → gets response + receipt
- [ ] Console shows live receipt feed updating in real-time
- [ ] Dashboard stats are real (earnings, gas saved, compression ratio)
- [ ] Settlement window closes automatically, netting computes
- [ ] Mock facilitator receives settlement instructions (logged)
- [ ] Merkle root is built and anchor is recorded
- [ ] Explorer can look up any receipt by ID
- [ ] Explorer verifies signature client-side (green checkmark)
- [ ] Explorer shows Merkle inclusion proof visualization
- [ ] Explorer links to anchor transaction
- [ ] Window detail page shows netting table with sum-to-zero invariant
- [ ] Consistency proofs verify between consecutive windows
