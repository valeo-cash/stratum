# Prompt 02 — Core Types + Receipt System

@STRATUM_CONTEXT.md

Build the `@valeo/stratum-core` and `@valeo/stratum-receipts` packages.

## @valeo/stratum-core

Define TypeScript interfaces for the entire Stratum data model. These are the canonical types shared across ALL packages. Every interface MUST have JSDoc comments explaining invariants.

### Required Interfaces

```typescript
// === Identity ===
StratumIdentity         // role: 'agent' | 'service' | 'facilitator' | 'auditor', publicKey, metadata
StratumAccount          // accountId, identity, status, createdAt

// === x402 Payment Flow ===
PaymentIntent           // x402-aligned: amount (bigint), asset, payer, payee, resource_hash, expiry, nonce
PaymentRequirements     // what the server returns in 402 response: price, asset, payee, network, expiry

// === Receipts (the core primitive) ===
Receipt                 // version, window_id, sequence, payer, payee, amount (bigint), asset,
                        // resource_hash, idempotency_key, timestamp_logical, facilitator_id
SignedReceipt           // Receipt + signature (Uint8Array) + signer_public_key
ReceiptBatch            // window_id, receipts[], batch_hash
SignedWindowHead        // window_id, receipt_count, merkle_root, total_volume_gross (bigint),
                        // total_volume_net (bigint), compression_ratio, previous_window_head_hash,
                        // signer_id, signature

// === Merkle ===
MerkleTreeCommitment    // root_hash, tree_size, algorithm: 'sha256'
InclusionProof          // leaf_index, leaf_hash, sibling_hashes[], tree_size, root_hash
ConsistencyProof        // old_size, new_size, proof_hashes[], old_root, new_root

// === Clearing ===
ClearingLedgerEntry     // entry_id, receipt_id, debit_account, credit_account, amount (bigint),
                        // asset, window_id, sequence, timestamp
NetPosition             // participant_id, window_id, gross_credit (bigint), gross_debit (bigint),
                        // net_balance (bigint), counterparty_count
MultilateralNettingResult // window_id, input_positions[], output_transfers[], gross_volume (bigint),
                          // net_volume (bigint), compression_ratio, sum_of_nets_is_zero (boolean)

// === Settlement ===
SettlementInstruction   // from, to, amount (bigint), asset, chain, facilitator_id, instruction_id
SettlementBatch         // batch_id, window_id, instructions[], merkle_root, status, facilitator_id
AnchorRecord            // chain, tx_hash, block_number, window_id, merkle_root, receipt_count, timestamp

// === Facilitator Interop ===
FacilitatorRegistration // facilitator_id, name, public_key, endpoints, supported_chains[]
FacilitatorPositionReport // facilitator_id, window_id, net_positions[], signature, timestamp

// === Disputes ===
DisputeCase             // case_id, type, claimant, respondent, window_id, status, created_at
DisputeEvidence         // case_id, signed_receipts[], merkle_proofs[], window_heads[]
DisputeOutcome          // case_id, resolution: 'upheld' | 'rejected' | 'adjusted', adjustments[], resolved_at

// === Operations ===
WALRecord               // operation_id, type, payload, sequence, checksum
Checkpoint              // checkpoint_id, window_id, sequence, state_hash, timestamp
RecoveryState           // last_checkpoint, pending_wal_count, recovery_status

// === Configuration ===
StratumConfig           // settlement_window_seconds, chain, asset, facilitator_url, risk_controls_enabled
ServiceRegistration     // service_id, name, target_url, stratum_slug, pricing: RoutePricing[]
RoutePricing            // path_pattern (glob), amount_per_request (bigint), asset
```

### Critical Rules
- ALL monetary amounts as `bigint` — never floating point, never `number` for money
- ALL timestamps as Unix milliseconds (`number`)
- ALL hashes and signatures as `Uint8Array`
- Every type MUST have a `version: number` field for forward compatibility
- Use branded types to prevent confusion:
```typescript
type WindowId = string & { readonly __brand: unique symbol }
type ReceiptId = string & { readonly __brand: unique symbol }
type AccountId = string & { readonly __brand: unique symbol }
```
- Export helper functions to create branded types: `createWindowId(value: string): WindowId`

## @valeo/stratum-receipts

Implement the receipt lifecycle.

### 1. Canonical Encoding

Use deterministic JSON (sorted keys, no whitespace, BigInt serialized as string with "n" suffix). This is chosen over CBOR/protobuf because: (a) human-readable for debugging, (b) no schema dependency for verification, (c) any language can verify without special libraries.

```typescript
export function canonicalEncode(receipt: Receipt): Uint8Array
export function canonicalDecode(bytes: Uint8Array): Receipt
```

### 2. Receipt Signing (Ed25519)

Use `@noble/ed25519` — no native dependency, audited, fast.

```typescript
export function signReceipt(receipt: Receipt, privateKey: Uint8Array): Promise<SignedReceipt>
export function verifyReceipt(signed: SignedReceipt): Promise<boolean>
```

### 3. Anti-Replay

- `idempotency_key`: SHA-256 of (payer + payee + resource_hash + amount + nonce) — deterministic, so replays produce the same key and get rejected
- `sequence`: monotonic per window, assigned by Stratum (NOT the client)
- `window_id`: receipts are bound to a window and cannot cross windows

### 4. Receipt Hashing (for Merkle leaves)

```typescript
export function hashReceipt(signed: SignedReceipt): Uint8Array
// SHA-256 of (canonical encoding bytes + signature bytes)
```

### Tests (vitest)
- Sign and verify round-trip: sign a receipt, verify it passes
- Canonical encoding determinism: same receipt always produces identical bytes (test 1000 times)
- Idempotency key uniqueness: different receipts produce different keys
- Idempotency key determinism: same logical payment always produces same key
- Invalid signature rejection: tamper with any field, verify fails
- Wrong key rejection: verify with different public key fails
- Replay detection: duplicate idempotency_key is caught
