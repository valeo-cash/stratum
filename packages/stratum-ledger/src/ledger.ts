import type {
  SignedReceipt,
  ClearingLedgerEntry,
  WindowId,
  ReceiptId,
  NetPosition,
  AccountId,
} from "@valeo/stratum-core";
import { createAccountId, createWindowId } from "@valeo/stratum-core";
import type { NettingInput } from "@valeo/stratum-netting";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * In-memory clearing ledger. Records signed receipts as double-entry
 * ledger rows and provides aggregation for netting.
 */
export class ClearingLedger {
  private entries: ClearingLedgerEntry[] = [];
  private idempotencyKeys = new Map<string, ClearingLedgerEntry>();
  private entrySeq = 0;

  /**
   * Record a signed receipt as a ledger entry.
   * If the idempotency key was already used, returns the original
   * entry without double-counting.
   */
  append(receipt: SignedReceipt): ClearingLedgerEntry {
    const keyHex = toHex(receipt.receipt.idempotency_key);

    const existing = this.idempotencyKeys.get(keyHex);
    if (existing) return existing;

    const entry: ClearingLedgerEntry = {
      version: 1,
      entry_id: `entry-${this.entrySeq++}`,
      receipt_id: receipt.receipt.receipt_id,
      debit_account: receipt.receipt.payer,
      credit_account: receipt.receipt.payee,
      amount: receipt.receipt.amount,
      asset: receipt.receipt.asset,
      window_id: receipt.receipt.window_id,
      sequence: receipt.receipt.sequence,
      timestamp: receipt.receipt.timestamp,
    };

    this.entries.push(entry);
    this.idempotencyKeys.set(keyHex, entry);
    return entry;
  }

  /** Get all entries for a settlement window. */
  getWindowEntries(windowId: WindowId): ClearingLedgerEntry[] {
    return this.entries.filter((e) => e.window_id === windowId);
  }

  /** Build the netting input (payer->payee->amount) for a window. */
  getPositions(windowId: WindowId): NettingInput {
    const positions = new Map<string, Map<string, bigint>>();

    for (const entry of this.getWindowEntries(windowId)) {
      const payer = entry.debit_account as string;
      const payee = entry.credit_account as string;
      if (!positions.has(payer)) positions.set(payer, new Map());
      const payees = positions.get(payer)!;
      payees.set(payee, (payees.get(payee) ?? 0n) + entry.amount);
    }

    return { window_id: windowId, positions };
  }

  /** Compute one participant's gross credits, debits, and net for a window. */
  getParticipantPosition(
    participantId: string,
    windowId: WindowId,
  ): NetPosition {
    const entries = this.getWindowEntries(windowId);
    let grossCredit = 0n;
    let grossDebit = 0n;
    const counterparties = new Set<string>();

    for (const e of entries) {
      if ((e.credit_account as string) === participantId) {
        grossCredit += e.amount;
        counterparties.add(e.debit_account as string);
      }
      if ((e.debit_account as string) === participantId) {
        grossDebit += e.amount;
        counterparties.add(e.credit_account as string);
      }
    }

    return {
      version: 1,
      participant_id: createAccountId(participantId),
      window_id: windowId,
      gross_credit: grossCredit,
      gross_debit: grossDebit,
      net_balance: grossCredit - grossDebit,
      counterparty_count: counterparties.size,
    };
  }

  /** Check if an idempotency key (hex string) has been used. */
  hasIdempotencyKey(key: string): boolean {
    return this.idempotencyKeys.has(key);
  }
}
