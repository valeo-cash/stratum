# Prompt 03 — Merkle Tree + Integrity Anchoring

@STRATUM_CONTEXT.md

Build `@valeo/stratum-merkle` and `@valeo/stratum-anchor`.

## @valeo/stratum-merkle

Implement an RFC 6962-style append-only Merkle tree for receipt integrity. This is how we prove that every receipt exists in the settlement record without putting them on-chain individually.

### Hashing Rules (RFC 6962 compliant)
- **Leaf hash**: `SHA-256(0x00 || leaf_data)` — the 0x00 prefix distinguishes leaves from nodes
- **Node hash**: `SHA-256(0x01 || left_child || right_child)` — the 0x01 prefix prevents second-preimage attacks
- For non-power-of-2 leaf counts, promote the last unpaired node upward

### Core Class

```typescript
export class StratumMerkleTree {
  constructor(leaves: Uint8Array[])

  get root(): Uint8Array
  get size(): number

  // Prove that leaf at `index` is included in this tree
  getInclusionProof(index: number): InclusionProof

  // Prove that tree of size `previousSize` is a prefix of this tree
  // This is the append-only guarantee — history cannot be rewritten
  getConsistencyProof(previousSize: number): ConsistencyProof

  // Static verification (anyone can verify without the full tree)
  static verifyInclusion(
    proof: InclusionProof, leaf: Uint8Array, root: Uint8Array, treeSize: number
  ): boolean

  static verifyConsistency(
    proof: ConsistencyProof, oldRoot: Uint8Array, newRoot: Uint8Array,
    oldSize: number, newSize: number
  ): boolean
}
```

### Signed Window Head

The Window Head is a signed commitment to a complete settlement window. Window Heads chain together via `previous_window_head_hash`, forming an append-only log.

```typescript
export function createSignedWindowHead(params: {
  windowId: WindowId
  receiptCount: number
  merkleRoot: Uint8Array
  totalVolumeGross: bigint
  totalVolumeNet: bigint
  compressionRatio: number
  previousWindowHeadHash: Uint8Array
  signerPrivateKey: Uint8Array
}): Promise<SignedWindowHead>

export function verifyWindowHead(head: SignedWindowHead, signerPublicKey: Uint8Array): Promise<boolean>
```

### Tests
- Build tree from 10 receipts, verify all 10 inclusion proofs pass
- Build tree from 100 receipts, verify randomly sampled proofs
- Tamper with one leaf, prove inclusion fails
- Build tree size 50, then extend to 100, verify consistency proof
- Verify consistency between windows (chained heads)
- Empty tree (0 leaves): should handle gracefully
- Single leaf tree: inclusion proof works
- Performance: build tree from 100,000 leaves, measure time (target: <2 seconds)
- Window head signing and verification round-trip

## @valeo/stratum-anchor

Chain-agnostic interface for posting Merkle roots on-chain + Solana reference implementation.

### Interface

```typescript
export interface ChainAnchor {
  // Post a Merkle root on-chain. Returns the transaction hash.
  anchor(record: AnchorRecord): Promise<AnchorResult>

  // Verify that an anchor exists on-chain and matches the record.
  verify(record: AnchorRecord): Promise<boolean>

  // Look up an anchor by window ID.
  getAnchor(windowId: WindowId): Promise<AnchorRecord | null>
}

export interface AnchorResult {
  txHash: string
  blockNumber: number
  chain: string
  timestamp: number
  confirmed: boolean
}
```

### Solana Adapter

Create a Solana implementation. The anchor is a simple program that stores:
- window_id (string, max 64 bytes)
- merkle_root (32 bytes)
- receipt_count (u64)
- timestamp (i64)
- authority (Pubkey — who signed this anchor)

Store anchors in PDAs derived from `["stratum", window_id]`.

For v1, this can be a direct instruction using `@solana/web3.js` writing to an account (no Anchor framework needed yet). Keep it minimal.

Write the TypeScript client:
```typescript
export class SolanaAnchor implements ChainAnchor {
  constructor(config: { rpcUrl: string, programId: string, keypair: Keypair })
  anchor(record: AnchorRecord): Promise<AnchorResult>
  verify(record: AnchorRecord): Promise<boolean>
  getAnchor(windowId: WindowId): Promise<AnchorRecord | null>
}
```

### MockAnchor

Also create `MockAnchor` that stores everything in-memory. Used for testing and local development.

```typescript
export class MockAnchor implements ChainAnchor { ... }
```

### Tests
- MockAnchor: anchor + verify round-trip
- MockAnchor: getAnchor returns null for unknown window
- MockAnchor: duplicate window_id handling
- SolanaAnchor: unit test with mocked RPC (don't require live devnet)
