import type { SettlementInstruction } from "@valeo/stratum-core";
import {
  createInstructionId,
  createAccountId,
  createFacilitatorId,
  DEFAULT_ASSET,
} from "@valeo/stratum-core";

/**
 * Bilateral netting between exactly two parties.
 * Returns null if the net is zero (they cancel out).
 */
export function computeBilateralNetting(
  partyA: string,
  partyB: string,
  aToB: bigint,
  bToA: bigint,
): SettlementInstruction | null {
  const net = aToB - bToA;
  if (net === 0n) return null;

  const from = net > 0n ? partyA : partyB;
  const to = net > 0n ? partyB : partyA;
  const amount = net > 0n ? net : -net;

  return {
    version: 1,
    instruction_id: createInstructionId(`bilateral-${from}-${to}`),
    from: createAccountId(from),
    to: createAccountId(to),
    amount,
    asset: DEFAULT_ASSET,
    chain: "solana",
    facilitator_id: createFacilitatorId("default"),
  };
}
