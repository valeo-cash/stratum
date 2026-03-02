import type { WindowId } from "./brands";
import type {
  SignedReceipt,
  ClearingLedgerEntry,
  SettlementBatch,
  AnchorRecord,
  SignedWindowHead,
} from "./types";

export enum WindowState {
  OPEN = "OPEN",
  ACCUMULATING = "ACCUMULATING",
  PRE_CLOSE = "PRE_CLOSE",
  NETTING = "NETTING",
  INSTRUCTING = "INSTRUCTING",
  ANCHORING = "ANCHORING",
  FINALIZED = "FINALIZED",
  FAILED = "FAILED",
}

/**
 * Deterministic state machine governing the lifecycle of a clearing window.
 *
 * States: OPEN -> ACCUMULATING -> PRE_CLOSE -> NETTING -> INSTRUCTING -> ANCHORING -> FINALIZED
 *
 * INSTRUCTING (not SETTLING) — Stratum sends settlement instructions
 * to the facilitator; it never moves money itself.
 */
export class SettlementWindow {
  readonly windowId: WindowId;
  readonly openedAt: number;

  private _state: WindowState = WindowState.OPEN;
  private receipts: SignedReceipt[] = [];
  private sequence = 0;
  private _nettingResult: unknown = null;
  private _settlementBatch: SettlementBatch | null = null;
  private _anchorRecord: AnchorRecord | null = null;
  private _signedHead: SignedWindowHead | null = null;

  constructor(windowId: WindowId) {
    this.windowId = windowId;
    this.openedAt = Date.now();
  }

  getState(): WindowState {
    return this._state;
  }

  getReceiptCount(): number {
    return this.receipts.length;
  }

  getReceipts(): SignedReceipt[] {
    return [...this.receipts];
  }

  getSignedHead(): SignedWindowHead | null {
    return this._signedHead;
  }

  /** OPEN -> ACCUMULATING */
  open(): void {
    this.assertState(WindowState.OPEN, "open");
    this._state = WindowState.ACCUMULATING;
  }

  /**
   * Record a receipt. Assigns a monotonic sequence number.
   * Only valid in ACCUMULATING state.
   */
  accumulate(receipt: SignedReceipt): { entry: ClearingLedgerEntry; sequence: number } {
    this.assertState(WindowState.ACCUMULATING, "accumulate");
    const seq = this.sequence++;
    this.receipts.push(receipt);

    const entry: ClearingLedgerEntry = {
      version: 1,
      entry_id: `${this.windowId}-entry-${seq}`,
      receipt_id: receipt.receipt.receipt_id,
      debit_account: receipt.receipt.payer,
      credit_account: receipt.receipt.payee,
      amount: receipt.receipt.amount,
      asset: receipt.receipt.asset,
      window_id: this.windowId,
      sequence: seq,
      timestamp: receipt.receipt.timestamp,
    };

    return { entry, sequence: seq };
  }

  /** ACCUMULATING -> PRE_CLOSE. No new receipts accepted after this. */
  preClose(): { receiptCount: number; cutoffSequence: number } {
    this.assertState(WindowState.ACCUMULATING, "preClose");
    this._state = WindowState.PRE_CLOSE;
    return { receiptCount: this.receipts.length, cutoffSequence: this.sequence };
  }

  /**
   * PRE_CLOSE -> NETTING.
   * Caller computes netting externally and passes the result.
   */
  computeNetting(nettingResult: unknown): void {
    this.assertState(WindowState.PRE_CLOSE, "computeNetting");
    this._nettingResult = nettingResult;
    this._state = WindowState.NETTING;
  }

  /** NETTING -> INSTRUCTING. Stores the settlement batch. */
  instruct(batch: SettlementBatch): void {
    this.assertState(WindowState.NETTING, "instruct");
    this._settlementBatch = batch;
    this._state = WindowState.INSTRUCTING;
  }

  /** INSTRUCTING -> ANCHORING. Stores the anchor record. */
  anchor(record: AnchorRecord): void {
    this.assertState(WindowState.INSTRUCTING, "anchor");
    this._anchorRecord = record;
    this._state = WindowState.ANCHORING;
  }

  /**
   * ANCHORING -> FINALIZED.
   * Caller signs the window head externally and passes it in.
   */
  finalize(signedHead: SignedWindowHead): void {
    this.assertState(WindowState.ANCHORING, "finalize");
    this._signedHead = signedHead;
    this._state = WindowState.FINALIZED;
  }

  // ── Failure handling ──────────────────────────────

  /** Reset INSTRUCTING -> NETTING for retry. */
  retryInstruction(): void {
    this.assertState(WindowState.INSTRUCTING, "retryInstruction");
    this._settlementBatch = null;
    this._state = WindowState.NETTING;
  }

  /** Reset ANCHORING -> INSTRUCTING for retry. */
  retryAnchoring(): void {
    this.assertState(WindowState.ANCHORING, "retryAnchoring");
    this._anchorRecord = null;
    this._state = WindowState.INSTRUCTING;
  }

  /** Reset NETTING -> PRE_CLOSE if netting computation fails. */
  rollbackToPreClose(): void {
    this.assertState(WindowState.NETTING, "rollbackToPreClose");
    this._nettingResult = null;
    this._state = WindowState.PRE_CLOSE;
  }

  /** Move to FAILED from any non-FINALIZED state. */
  fail(): void {
    if (this._state === WindowState.FINALIZED) {
      throw new Error("Cannot fail a FINALIZED window");
    }
    this._state = WindowState.FAILED;
  }

  private assertState(expected: WindowState, action: string): void {
    if (this._state !== expected) {
      throw new Error(
        `Invalid state transition: cannot ${action}() in state ${this._state} (expected ${expected})`,
      );
    }
  }
}
