import type {
  WindowId,
  ReceiptId,
  AccountId,
  ServiceId,
  FacilitatorId,
  CaseId,
  BatchId,
  InstructionId,
  OperationId,
  CheckpointId,
} from "./brands";

// ──────────────────────────────────────────────────────
// Identity
// ──────────────────────────────────────────────────────

/** A participant in the Stratum network. */
export interface StratumIdentity {
  version: number;
  role: "agent" | "service" | "facilitator" | "auditor";
  /** Ed25519 public key of this participant. */
  publicKey: Uint8Array;
  metadata: Record<string, string>;
}

/** A registered account bound to an identity. */
export interface StratumAccount {
  version: number;
  accountId: AccountId;
  identity: StratumIdentity;
  status: "active" | "suspended" | "closed";
  /** Unix ms. */
  createdAt: number;
}

// ──────────────────────────────────────────────────────
// x402 Payment Flow
// ──────────────────────────────────────────────────────

/**
 * A signed intent from an agent to pay for a resource.
 * amount is in the smallest unit of the asset (e.g. micro-USDC).
 */
export interface PaymentIntent {
  version: number;
  /** Smallest-unit amount; never floating point. */
  amount: bigint;
  asset: string;
  payer: AccountId;
  payee: AccountId;
  /** SHA-256 of the requested resource descriptor. */
  resource_hash: Uint8Array;
  /** Unix ms after which this intent is void. */
  expiry: number;
  /** Client-supplied nonce for idempotency derivation. */
  nonce: string;
}

/**
 * The 402 response payload a Stratum-proxied service returns
 * so the agent knows what to pay.
 */
export interface PaymentRequirements {
  version: number;
  /** Price in smallest asset unit. */
  price: bigint;
  asset: string;
  payee: AccountId;
  network: string;
  /** Unix ms. */
  expiry: number;
}

// ──────────────────────────────────────────────────────
// Receipts
// ──────────────────────────────────────────────────────

/**
 * An unsigned receipt — the core clearing primitive.
 * Records that payer owes payee `amount` for a specific resource
 * within a settlement window. No money has moved on-chain.
 */
export interface Receipt {
  version: number;
  receipt_id: ReceiptId;
  window_id: WindowId;
  /** Monotonically increasing within a window, assigned by Stratum. */
  sequence: number;
  payer: AccountId;
  payee: AccountId;
  /** Smallest-unit amount. */
  amount: bigint;
  asset: string;
  /** SHA-256 of the resource being paid for. */
  resource_hash: Uint8Array;
  /**
   * SHA-256 of (payer + payee + resource_hash + amount + nonce).
   * Deterministic — replays yield the same key and are rejected.
   */
  idempotency_key: Uint8Array;
  /** Logical clock timestamp (Unix ms). */
  timestamp: number;
  facilitator_id: FacilitatorId;
  /** Client-supplied nonce used for idempotency derivation. */
  nonce: string;
  /** How the payer's funds are secured for this payment. */
  authorizationType?: "none" | "balance-check" | "token-approval" | "eip-3009";
  /** Solana SPL Token approve() tx signature granting delegate authority. */
  approvalTxSignature?: string;
  /** EIP-3009 TransferWithAuthorization signature for Base USDC. */
  eip3009Auth?: {
    v: number;
    r: string;
    s: string;
    validAfter: number;
    validBefore: number;
    nonce: string;
  };
}

/** A receipt with an Ed25519 signature from the Stratum node. */
export interface SignedReceipt {
  version: number;
  receipt: Receipt;
  /** Ed25519 signature over the canonical encoding of the receipt. */
  signature: Uint8Array;
  /** Public key of the signer (Stratum node). */
  signer_public_key: Uint8Array;
}

/** A batch of receipts within a single window. */
export interface ReceiptBatch {
  version: number;
  window_id: WindowId;
  receipts: SignedReceipt[];
  /** SHA-256 over the concatenation of all receipt hashes. */
  batch_hash: Uint8Array;
}

/**
 * The signed head of a completed settlement window.
 * Chains to the previous window, forming an append-only log.
 */
export interface SignedWindowHead {
  version: number;
  window_id: WindowId;
  receipt_count: number;
  /** Merkle root of all receipt hashes in this window. */
  merkle_root: Uint8Array;
  /** Gross volume before netting (smallest-unit). */
  total_volume_gross: bigint;
  /** Net volume after netting (smallest-unit). */
  total_volume_net: bigint;
  /** gross / net — higher is better. */
  compression_ratio: number;
  /** Hash of the previous window's SignedWindowHead; null for genesis. */
  previous_window_head_hash: Uint8Array | null;
  signer_id: AccountId;
  signature: Uint8Array;
}

// ──────────────────────────────────────────────────────
// Merkle
// ──────────────────────────────────────────────────────

/** Commitment to a Merkle tree anchored on-chain. */
export interface MerkleTreeCommitment {
  version: number;
  root_hash: Uint8Array;
  tree_size: number;
  algorithm: "sha256";
}

/** Proof that a specific leaf is included in a Merkle tree. */
export interface InclusionProof {
  version: number;
  leaf_index: number;
  leaf_hash: Uint8Array;
  sibling_hashes: Uint8Array[];
  tree_size: number;
  root_hash: Uint8Array;
}

/** Proof that a smaller tree is a prefix of a larger tree. */
export interface ConsistencyProof {
  version: number;
  old_size: number;
  new_size: number;
  proof_hashes: Uint8Array[];
  old_root: Uint8Array;
  new_root: Uint8Array;
}

// ──────────────────────────────────────────────────────
// Clearing
// ──────────────────────────────────────────────────────

/** A double-entry ledger row produced from a receipt. */
export interface ClearingLedgerEntry {
  version: number;
  entry_id: string;
  receipt_id: ReceiptId;
  debit_account: AccountId;
  credit_account: AccountId;
  amount: bigint;
  asset: string;
  window_id: WindowId;
  sequence: number;
  /** Unix ms. */
  timestamp: number;
}

/** Aggregated position of a single participant within a window. */
export interface NetPosition {
  version: number;
  participant_id: AccountId;
  window_id: WindowId;
  gross_credit: bigint;
  gross_debit: bigint;
  /** gross_credit - gross_debit; positive = net receiver. */
  net_balance: bigint;
  counterparty_count: number;
}

/**
 * Result of multilateral netting across all participants.
 * Invariant: sum of all net_balance values === 0.
 */
export interface MultilateralNettingResult {
  version: number;
  window_id: WindowId;
  input_positions: NetPosition[];
  output_transfers: SettlementInstruction[];
  gross_volume: bigint;
  net_volume: bigint;
  compression_ratio: number;
  /** Must always be true; acts as a self-check. */
  sum_of_nets_is_zero: boolean;
}

// ──────────────────────────────────────────────────────
// Settlement
// ──────────────────────────────────────────────────────

/** A single transfer that the facilitator must execute on-chain. */
export interface SettlementInstruction {
  version: number;
  instruction_id: InstructionId;
  from: AccountId;
  to: AccountId;
  amount: bigint;
  asset: string;
  chain: string;
  facilitator_id: FacilitatorId;
}

/** A batch of settlement instructions sent to a facilitator. */
export interface SettlementBatch {
  version: number;
  batch_id: BatchId;
  window_id: WindowId;
  instructions: SettlementInstruction[];
  merkle_root: Uint8Array;
  status: "pending" | "submitted" | "confirmed" | "failed";
  facilitator_id: FacilitatorId;
}

/** Record of a Merkle root anchored on-chain. */
export interface AnchorRecord {
  version: number;
  chain: string;
  tx_hash: Uint8Array;
  block_number: number;
  window_id: WindowId;
  merkle_root: Uint8Array;
  receipt_count: number;
  /** Unix ms. */
  timestamp: number;
}

// ──────────────────────────────────────────────────────
// Facilitator Interop
// ──────────────────────────────────────────────────────

/** Registration record for a facilitator that executes on-chain transfers. */
export interface FacilitatorRegistration {
  version: number;
  facilitator_id: FacilitatorId;
  name: string;
  public_key: Uint8Array;
  endpoints: Record<string, string>;
  supported_chains: string[];
}

/** A facilitator's signed report of net positions for a window. */
export interface FacilitatorPositionReport {
  version: number;
  facilitator_id: FacilitatorId;
  window_id: WindowId;
  net_positions: NetPosition[];
  signature: Uint8Array;
  /** Unix ms. */
  timestamp: number;
}

// ──────────────────────────────────────────────────────
// Disputes
// ──────────────────────────────────────────────────────

/** A dispute case raised by a participant. */
export interface DisputeCase {
  version: number;
  case_id: CaseId;
  type: string;
  claimant: AccountId;
  respondent: AccountId;
  window_id: WindowId;
  status: "open" | "under_review" | "resolved";
  /** Unix ms. */
  created_at: number;
}

/** Evidence bundle submitted for a dispute. */
export interface DisputeEvidence {
  version: number;
  case_id: CaseId;
  signed_receipts: SignedReceipt[];
  merkle_proofs: InclusionProof[];
  window_heads: SignedWindowHead[];
}

/** Final resolution of a dispute. */
export interface DisputeOutcome {
  version: number;
  case_id: CaseId;
  resolution: "upheld" | "rejected" | "adjusted";
  adjustments: SettlementInstruction[];
  /** Unix ms. */
  resolved_at: number;
}

// ──────────────────────────────────────────────────────
// Operations (WAL + Recovery)
// ──────────────────────────────────────────────────────

/** Write-ahead log record for crash recovery. */
export interface WALRecord {
  version: number;
  operation_id: OperationId;
  type: string;
  payload: Uint8Array;
  sequence: number;
  checksum: Uint8Array;
}

/** A snapshot of system state at a point in time. */
export interface Checkpoint {
  version: number;
  checkpoint_id: CheckpointId;
  window_id: WindowId;
  sequence: number;
  state_hash: Uint8Array;
  /** Unix ms. */
  timestamp: number;
}

/** Current recovery state after a crash. */
export interface RecoveryState {
  version: number;
  last_checkpoint: Checkpoint | null;
  pending_wal_count: number;
  recovery_status: "idle" | "recovering" | "recovered" | "failed";
}

// ──────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────

/** Global Stratum node configuration. */
export interface StratumConfig {
  version: number;
  settlement_window_seconds: number;
  chain: string;
  asset: string;
  facilitator_url: string;
  risk_controls_enabled: boolean;
}

/** A service registered with Stratum for proxied payments. */
export interface ServiceRegistration {
  version: number;
  service_id: ServiceId;
  name: string;
  target_url: string;
  stratum_slug: string;
  pricing: RoutePricing[];
}

/** Per-route pricing for a registered service. */
export interface RoutePricing {
  version: number;
  /** Glob pattern matching request paths. */
  path_pattern: string;
  /** Price per request in smallest asset unit. */
  amount_per_request: bigint;
  asset: string;
}
