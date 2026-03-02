# Prompt 05 — Settlement Window State Machine + x402 Adapter

@STRATUM_CONTEXT.md

Build the settlement window protocol and x402 adapter.

## Settlement Window State Machine

Add to `@valeo/stratum-core`. This is a deterministic state machine that governs the lifecycle of a clearing window.

### States

```
OPEN → ACCUMULATING → PRE_CLOSE → NETTING → INSTRUCTING → ANCHORING → FINALIZED
```

- **OPEN**: Window created, ready to accept receipts
- **ACCUMULATING**: Actively receiving and recording signed receipts
- **PRE_CLOSE**: Cutoff reached (timer or receipt count). No new receipts accepted. Existing receipts finalized.
- **NETTING**: Computing multilateral net positions from all receipts
- **INSTRUCTING**: Sending settlement instructions to the facilitator. The FACILITATOR settles on-chain. Stratum does NOT.
- **ANCHORING**: Posting Merkle root on-chain (this is just a data hash, not a payment)
- **FINALIZED**: Window head signed, chained to previous window. Immutable.

Note: the state is called INSTRUCTING not SETTLING because Stratum instructs the facilitator to settle. Stratum never moves money.

### Implementation

```typescript
export class SettlementWindow {
  readonly windowId: WindowId
  readonly openedAt: number
  state: WindowState

  // State transitions — each validates preconditions and throws if invalid
  open(): void
  accumulate(receipt: SignedReceipt): { entry: ClearingLedgerEntry; sequence: number }
  preClose(): { receiptCount: number; cutoffSequence: number }
  computeNetting(): NettingOutput
  instruct(batch: SettlementBatch): void     // NOT settle — instruct the facilitator
  anchor(record: AnchorRecord): void
  finalize(signerKey: Uint8Array): Promise<SignedWindowHead>

  // Queries
  getReceiptCount(): number
  getReceipts(): SignedReceipt[]
  getState(): WindowState

  // Failure handling
  retryInstruction(): void       // If facilitator is unreachable
  retryAnchoring(): void         // If chain is congested
  rollbackToPreClose(): void     // If netting computation fails
}
```

### Rules
- Sequence numbers are assigned BY the window in `accumulate()`, not by the client
- Once PRE_CLOSE, `accumulate()` throws — no new receipts
- If instruction fails: retry with exponential backoff (max 3), then mark window as FAILED and carry forward receipts to next window
- If anchoring fails: the settlement is still valid (facilitator already settled), anchor in next block. The window stays in ANCHORING state until confirmed.
- Windows chain via `previous_window_head_hash` in the SignedWindowHead

### Window Manager

Manages the continuous lifecycle of windows:

```typescript
export class WindowManager {
  constructor(config: StratumConfig, ledger: ClearingLedger, wal: StratumWAL)

  // Get the current active window (always one open)
  getCurrentWindow(): SettlementWindow

  // Submit a receipt to the current window
  submitReceipt(receipt: SignedReceipt): Promise<{ receiptId: ReceiptId; sequence: number }>

  // Trigger settlement cycle (called by timer or threshold)
  closeAndSettle(anchor: ChainAnchor, facilitator: FacilitatorClient): Promise<SignedWindowHead>
  // This method:
  // 1. Closes current window (preClose)
  // 2. Opens next window immediately (zero downtime)
  // 3. Computes netting on closed window
  // 4. Sends settlement instructions to facilitator
  // 5. Builds Merkle tree, anchors root
  // 6. Signs window head
  // 7. Returns the finalized head
}
```

## @valeo/stratum-adapter-x402

The adapter layer that makes Stratum compatible with x402 protocol semantics.

### FacilitatorClient (outbound — Stratum talks TO the facilitator)

Stratum sends settlement instructions to the real facilitator (Coinbase, Circle, etc.):

```typescript
export interface FacilitatorClient {
  // Send a batch of net settlement instructions to the facilitator
  submitSettlementBatch(batch: SettlementBatch): Promise<SettlementResult>

  // Check the status of a submitted batch
  getSettlementStatus(batchId: string): Promise<SettlementStatus>
}

export class CoinbaseFacilitatorClient implements FacilitatorClient {
  constructor(config: { facilitatorUrl: string })
  // Translates Stratum's SettlementBatch into x402 facilitator /settle calls
  // Sends one /settle per SettlementInstruction in the batch
}
```

### Proxy Handler (inbound — agents talk TO Stratum)

Stratum acts as a reverse proxy that intercepts x402 flows:

```typescript
export class StratumProxyHandler {
  constructor(config: {
    ledger: ClearingLedger
    windowManager: WindowManager
    serviceRegistry: ServiceRegistry  // looks up registered services
  })

  // Handle an incoming agent request
  async handleRequest(req: IncomingRequest): Promise<ProxyResponse>
  // Logic:
  // 1. Look up service by slug
  // 2. If no X-PAYMENT header → return 402 with payment requirements
  // 3. If X-PAYMENT header present:
  //    a. Verify Ed25519 signature on payment intent
  //    b. Check idempotency key (reject dupes)
  //    c. Create receipt and submit to WindowManager
  //    d. Forward original request to service's target URL
  //    e. Return service response + X-STRATUM-RECEIPT header
}
```

### Service Registry

```typescript
export class ServiceRegistry {
  // Register a new service (called from Console)
  register(service: ServiceRegistration): Promise<{ slug: string; endpoint: string }>

  // Look up service by its Stratum slug
  getBySlug(slug: string): Promise<ServiceRegistration | null>

  // Get pricing for a specific route
  getPricing(serviceId: string, path: string): Promise<RoutePricing | null>
}
```

### Tests
- Window state machine: valid transitions succeed, invalid throw
- Window lifecycle: open → accumulate 100 receipts → preClose → netting → instruct → anchor → finalize
- WindowManager: continuous operation — close window, verify next window immediately accepts receipts
- Proxy handler: mock agent request → 402 → payment → receipt → forwarded response
- Idempotency: same payment intent twice → second returns same receipt_id
- FacilitatorClient: mock test that settlement instructions are correctly translated to x402 /settle calls
