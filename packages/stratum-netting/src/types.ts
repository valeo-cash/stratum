import type { WindowId, SettlementInstruction } from "@valeo/stratum-core";

/** Input to the multilateral netting algorithm. */
export interface NettingInput {
  window_id: WindowId;
  /** payer -> payee -> gross amount owed */
  positions: Map<string, Map<string, bigint>>;
}

/** Output of the multilateral netting algorithm. */
export interface NettingOutput {
  window_id: WindowId;
  /** participant -> net balance (positive = owed money, negative = owes money) */
  net_positions: Map<string, bigint>;
  /** Minimal transfer set to settle all positions. */
  transfers: SettlementInstruction[];
  /** How many individual receipts fed the netting. */
  gross_transaction_count: number;
  /** How many on-chain transfers are needed. */
  transfer_count: number;
  /** gross_transaction_count / transfer_count (Infinity when 0 transfers). */
  compression_ratio: number;
  /** Total value of all receipts. */
  gross_volume: bigint;
  /** Total value of net transfers. */
  net_volume: bigint;
  /** Conservation: all net positions sum to exactly 0. */
  sum_of_nets_is_zero: boolean;
  /** Every participant's net is covered by transfers. */
  all_positions_resolved: boolean;
}
