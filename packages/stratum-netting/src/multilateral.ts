import type { SettlementInstruction } from "@valeo/stratum-core";
import {
  createInstructionId,
  createAccountId,
  createFacilitatorId,
  DEFAULT_ASSET,
} from "@valeo/stratum-core";
import type { NettingInput, NettingOutput } from "./types";

/**
 * Compute multilateral netting across all participants in a window.
 *
 * 1. Aggregate gross credits/debits per participant
 * 2. Compute net positions (must sum to zero)
 * 3. Greedy debtor-creditor matching to produce minimal transfer set
 */
export function computeMultilateralNetting(input: NettingInput): NettingOutput {
  const credits = new Map<string, bigint>();
  const debits = new Map<string, bigint>();
  let grossVolume = 0n;
  let grossTxCount = 0;

  for (const [payer, payees] of input.positions) {
    for (const [payee, amount] of payees) {
      if (amount <= 0n) continue;
      debits.set(payer, (debits.get(payer) ?? 0n) + amount);
      credits.set(payee, (credits.get(payee) ?? 0n) + amount);
      grossVolume += amount;
      grossTxCount++;
    }
  }

  const participants = new Set([...credits.keys(), ...debits.keys()]);
  const netPositions = new Map<string, bigint>();

  for (const p of participants) {
    const credit = credits.get(p) ?? 0n;
    const debit = debits.get(p) ?? 0n;
    netPositions.set(p, credit - debit);
  }

  let sumOfNets = 0n;
  for (const net of netPositions.values()) {
    sumOfNets += net;
  }

  if (sumOfNets !== 0n) {
    throw new Error(
      `Netting invariant violated: sum of net positions is ${sumOfNets}, expected 0`,
    );
  }

  const creditorList: Array<{ id: string; amount: bigint }> = [];
  const debtorList: Array<{ id: string; amount: bigint }> = [];

  for (const [id, net] of netPositions) {
    if (net > 0n) creditorList.push({ id, amount: net });
    else if (net < 0n) debtorList.push({ id, amount: -net });
  }

  creditorList.sort((a, b) => (b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : 0));
  debtorList.sort((a, b) => (b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : 0));

  const transfers: SettlementInstruction[] = [];
  let ci = 0;
  let di = 0;
  let transferSeq = 0;

  while (ci < creditorList.length && di < debtorList.length) {
    const creditor = creditorList[ci];
    const debtor = debtorList[di];
    const transferAmount = creditor.amount < debtor.amount ? creditor.amount : debtor.amount;

    transfers.push({
      version: 1,
      instruction_id: createInstructionId(`${input.window_id}-xfer-${transferSeq++}`),
      from: createAccountId(debtor.id),
      to: createAccountId(creditor.id),
      amount: transferAmount,
      asset: DEFAULT_ASSET,
      chain: "solana",
      facilitator_id: createFacilitatorId("default"),
    });

    creditor.amount -= transferAmount;
    debtor.amount -= transferAmount;
    if (creditor.amount === 0n) ci++;
    if (debtor.amount === 0n) di++;
  }

  const allResolved =
    ci >= creditorList.length &&
    di >= debtorList.length &&
    creditorList.every((c) => c.amount === 0n) &&
    debtorList.every((d) => d.amount === 0n);

  let netVolume = 0n;
  for (const t of transfers) {
    netVolume += t.amount;
  }

  const transferCount = transfers.length;
  const compressionRatio =
    transferCount === 0
      ? grossTxCount === 0
        ? 1
        : Infinity
      : grossTxCount / transferCount;

  return {
    window_id: input.window_id,
    net_positions: netPositions,
    transfers,
    gross_transaction_count: grossTxCount,
    transfer_count: transferCount,
    compression_ratio: compressionRatio,
    gross_volume: grossVolume,
    net_volume: netVolume,
    sum_of_nets_is_zero: true,
    all_positions_resolved: allResolved,
  };
}
