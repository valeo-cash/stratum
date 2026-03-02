import type { WindowId, SettlementBatch } from "@valeo/stratum-core";
import { createBatchId, createFacilitatorId } from "@valeo/stratum-core";
import type { NettingOutput } from "./types";

/**
 * Create a SettlementBatch from netting output, ready to send to a facilitator.
 */
export function createSettlementBatch(
  netting: NettingOutput,
  windowId: WindowId,
  merkleRoot: Uint8Array,
  facilitatorId: string,
): SettlementBatch {
  return {
    version: 1,
    batch_id: createBatchId(`batch-${windowId}`),
    window_id: windowId,
    instructions: netting.transfers,
    merkle_root: merkleRoot,
    status: "pending",
    facilitator_id: createFacilitatorId(facilitatorId),
  };
}
