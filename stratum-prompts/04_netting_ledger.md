# Prompt 04 — Netting Engine + Ledger

@STRATUM_CONTEXT.md

Build `@valeo/stratum-netting` and `@valeo/stratum-ledger`.

## @valeo/stratum-netting

This is the core financial algorithm. Given all receipts in a window, compute the minimum number of on-chain transfers needed to settle everyone's positions.

### Multilateral Netting Algorithm

```typescript
export interface NettingInput {
  window_id: WindowId
  // Map of payer → payee → gross amount owed
  positions: Map<string, Map<string, bigint>>
}

export interface NettingOutput {
  window_id: WindowId
  net_positions: Map<string, bigint>     // participant → net balance (positive = owed money, negative = owes money)
  transfers: SettlementInstruction[]      // minimal transfer set to settle all positions
  gross_transaction_count: number         // how many individual receipts
  transfer_count: number                  // how many on-chain transfers needed
  compression_ratio: number               // gross_transaction_count / transfer_count
  gross_volume: bigint                    // total value of all receipts
  net_volume: bigint                      // total value of net transfers

  // Invariant proofs — these MUST be true or the algorithm is broken
  sum_of_nets_is_zero: boolean            // conservation: all net positions sum to exactly 0
  all_positions_resolved: boolean         // every participant's net is covered by transfers
}

export function computeMultilateralNetting(input: NettingInput): NettingOutput
```

**Algorithm:**
1. For each participant, sum all amounts they are owed (credits) and all amounts they owe (debits) across ALL counterparties
2. Compute net position = total_credits - total_debits for each participant
3. **Invariant check**: sum of all net positions MUST equal 0 (conservation of money). If not, throw — the data is corrupt.
4. Separate participants into creditors (net > 0) and debtors (net < 0)
5. Sort creditors descending, debtors by absolute value descending
6. Pair largest debtor with largest creditor. Transfer amount = min(|debit|, credit). Reduce both. Repeat until all are zero.
7. Return the minimal transfer set.

### Bilateral Fallback

When only two parties are involved or when the multilateral graph is partitioned:

```typescript
export function computeBilateralNetting(
  partyA: string,
  partyB: string,
  aToB: bigint,     // total A owes B
  bToA: bigint      // total B owes A
): SettlementInstruction | null  // null if net is zero (they cancel out)
```

### Settlement Batch Creation

```typescript
export function createSettlementBatch(
  netting: NettingOutput,
  windowId: WindowId,
  merkleRoot: Uint8Array,
  facilitatorId: string
): SettlementBatch
```

### Tests
- **2 participants, symmetric**: A→B $100, B→A $100 → 0 transfers (perfect cancellation)
- **2 participants, asymmetric**: A→B $100, B→A $40 → 1 transfer: A→B $60
- **4 participants, complex flows**: verify sum-to-zero, verify compression > 1
- **10 participants, random flows**: property-based test — sum ALWAYS equals zero, no matter the input
- **Edge cases**: participant with zero net, single participant, no flows, single receipt
- **Large scale**: 1,000 participants with 100,000 receipt positions — netting completes in <1 second
- **Conservation invariant**: fuzz test — randomly generated positions NEVER produce non-zero sum

## @valeo/stratum-ledger

Event-sourced clearing ledger with WAL for crash recovery.

### Clearing Ledger

```typescript
export class ClearingLedger {
  // Record a receipt as a ledger entry (debit payer, credit payee)
  append(receipt: SignedReceipt): ClearingLedgerEntry

  // Get all entries for a settlement window
  getWindowEntries(windowId: WindowId): ClearingLedgerEntry[]

  // Compute positions for netting input
  getPositions(windowId: WindowId): NettingInput

  // Get a single participant's position in a window
  getParticipantPosition(participantId: string, windowId: WindowId): NetPosition

  // Check if an idempotency key has been used (duplicate detection)
  hasIdempotencyKey(key: string): boolean
}
```

### Write-Ahead Log

Every mutation is written to the WAL before being applied. On crash recovery, replay the WAL from the last checkpoint to restore state.

```typescript
export class StratumWAL {
  constructor(storage: WALStorage)  // abstract storage for testability

  // Write a record to the WAL before performing the operation
  append(record: WALRecord): Promise<void>

  // Replay all records after a checkpoint
  replaySince(checkpoint: Checkpoint): AsyncIterable<WALRecord>

  // Create a snapshot of current state
  createCheckpoint(windowId: WindowId, stateHash: Uint8Array): Checkpoint

  // Remove WAL records that are before the checkpoint (compaction)
  compact(checkpoint: Checkpoint): Promise<void>
}

// Abstract storage interface (Postgres in prod, in-memory for tests)
export interface WALStorage {
  write(record: WALRecord): Promise<void>
  readAfter(sequence: number): AsyncIterable<WALRecord>
  deleteBelow(sequence: number): Promise<void>
}
```

### Idempotency

- Every receipt has a deterministic `idempotency_key`
- The ledger maintains a set of used keys per window
- Duplicate receipts (same key) are rejected, not errored — the original receipt_id is returned
- Replaying the WAL is safe: duplicates are idempotently ignored

### Tests
- Append 100 receipts, verify positions match expected bilateral sums
- Idempotency: append same receipt twice, second returns original receipt_id without double-counting
- WAL: write 50 entries → simulate crash → recover from checkpoint → state matches pre-crash
- Checkpoint + compact: records before checkpoint are removed, recovery still works from checkpoint
- Cross-window isolation: receipts in window A don't appear in window B positions
