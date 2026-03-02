import type { WindowId, ReceiptId } from "./brands";
import { createWindowId } from "./brands";
import type {
  StratumConfig,
  SignedReceipt,
  SignedWindowHead,
  SettlementBatch,
  AnchorRecord,
} from "./types";
import { SettlementWindow } from "./window";

/** Parameters injected into closeAndSettle to avoid upstream dependencies. */
export interface CloseAndSettleParams {
  /** Compute netting from the window's receipts. */
  computeNetting: (window: SettlementWindow) => unknown;
  /** Create and submit a settlement batch. Returns the batch. */
  submitBatch: (window: SettlementWindow, nettingResult: unknown) => Promise<SettlementBatch>;
  /** Anchor the Merkle root on-chain. Returns the anchor record. */
  anchorRoot: (window: SettlementWindow) => Promise<AnchorRecord>;
  /** Sign the window head. Returns the signed head. */
  signHead: (window: SettlementWindow) => Promise<SignedWindowHead>;
}

/**
 * Manages continuous window lifecycle with zero-downtime transitions.
 * Always maintains one active window ready to accept receipts.
 */
export class WindowManager {
  private currentWindow: SettlementWindow;
  private previousHeadHash: Uint8Array | null = null;
  private windowSeq = 0;
  private config: StratumConfig;
  private finalizedWindows: SettlementWindow[] = [];

  constructor(config: StratumConfig) {
    this.config = config;
    this.currentWindow = this.createNextWindow();
    this.currentWindow.open();
  }

  /** Get the current active window (always ACCUMULATING). */
  getCurrentWindow(): SettlementWindow {
    return this.currentWindow;
  }

  /** Get the hash of the previous window head for chaining. */
  getPreviousHeadHash(): Uint8Array | null {
    return this.previousHeadHash;
  }

  /** Submit a receipt to the current window. */
  submitReceipt(receipt: SignedReceipt): { receiptId: ReceiptId; sequence: number } {
    const { entry, sequence } = this.currentWindow.accumulate(receipt);
    return { receiptId: entry.receipt_id, sequence };
  }

  /**
   * Close the current window and run the full settlement cycle.
   *
   * 1. preClose the current window
   * 2. Open a new window immediately (zero downtime)
   * 3. Run netting, instruct facilitator, anchor, finalize
   * 4. Return the signed window head
   */
  async closeAndSettle(params: CloseAndSettleParams): Promise<SignedWindowHead> {
    const closingWindow = this.currentWindow;

    closingWindow.preClose();

    this.currentWindow = this.createNextWindow();
    this.currentWindow.open();

    const nettingResult = params.computeNetting(closingWindow);
    closingWindow.computeNetting(nettingResult);

    const batch = await params.submitBatch(closingWindow, nettingResult);
    closingWindow.instruct(batch);

    const anchorRecord = await params.anchorRoot(closingWindow);
    closingWindow.anchor(anchorRecord);

    const signedHead = await params.signHead(closingWindow);
    closingWindow.finalize(signedHead);

    this.previousHeadHash = new Uint8Array(32);
    this.finalizedWindows.push(closingWindow);

    return signedHead;
  }

  private createNextWindow(): SettlementWindow {
    const seq = this.windowSeq++;
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    return new SettlementWindow(
      createWindowId(`win-${ts}-${rand}-${seq}`),
    );
  }
}
