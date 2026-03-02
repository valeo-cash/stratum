import { describe, it, expect } from "vitest";
import { createWindowId } from "@valeo/stratum-core";
import { computeMultilateralNetting } from "../multilateral";
import { computeBilateralNetting } from "../bilateral";
import { createSettlementBatch } from "../batch";
import type { NettingInput } from "../types";

function makeInput(
  flows: Array<[string, string, bigint]>,
  windowId = "win-001",
): NettingInput {
  const positions = new Map<string, Map<string, bigint>>();
  for (const [payer, payee, amount] of flows) {
    if (!positions.has(payer)) positions.set(payer, new Map());
    const payees = positions.get(payer)!;
    payees.set(payee, (payees.get(payee) ?? 0n) + amount);
  }
  return { window_id: createWindowId(windowId), positions };
}

describe("computeMultilateralNetting", () => {
  describe("2 participants, symmetric", () => {
    it("produces 0 transfers when flows cancel out", () => {
      const result = computeMultilateralNetting(
        makeInput([
          ["alice", "bob", 100n],
          ["bob", "alice", 100n],
        ]),
      );
      expect(result.transfer_count).toBe(0);
      expect(result.transfers).toHaveLength(0);
      expect(result.sum_of_nets_is_zero).toBe(true);
      expect(result.net_volume).toBe(0n);
      expect(result.gross_volume).toBe(200n);
    });
  });

  describe("2 participants, asymmetric", () => {
    it("produces 1 transfer for the net difference", () => {
      const result = computeMultilateralNetting(
        makeInput([
          ["alice", "bob", 100n],
          ["bob", "alice", 40n],
        ]),
      );
      expect(result.transfer_count).toBe(1);
      expect(result.transfers[0].amount).toBe(60n);
      expect(result.sum_of_nets_is_zero).toBe(true);
      expect(result.gross_volume).toBe(140n);
      expect(result.net_volume).toBe(60n);
    });
  });

  describe("4 participants, complex flows", () => {
    it("verifies sum-to-zero and compression > 1", () => {
      const result = computeMultilateralNetting(
        makeInput([
          ["alice", "bob", 100n],
          ["alice", "carol", 50n],
          ["bob", "carol", 70n],
          ["bob", "dave", 30n],
          ["carol", "alice", 60n],
          ["dave", "bob", 40n],
        ]),
      );

      expect(result.sum_of_nets_is_zero).toBe(true);
      expect(result.all_positions_resolved).toBe(true);
      expect(result.compression_ratio).toBeGreaterThan(1);
      expect(result.transfer_count).toBeLessThan(result.gross_transaction_count);

      let sum = 0n;
      for (const net of result.net_positions.values()) sum += net;
      expect(sum).toBe(0n);
    });
  });

  describe("10 participants, random flows (property-based)", () => {
    it("sum of net positions is ALWAYS zero", () => {
      const participants = Array.from({ length: 10 }, (_, i) => `p${i}`);

      for (let trial = 0; trial < 50; trial++) {
        const flows: Array<[string, string, bigint]> = [];
        const numFlows = 10 + Math.floor(Math.random() * 40);
        for (let f = 0; f < numFlows; f++) {
          const payer = participants[Math.floor(Math.random() * 10)];
          let payee = participants[Math.floor(Math.random() * 10)];
          while (payee === payer) {
            payee = participants[Math.floor(Math.random() * 10)];
          }
          flows.push([payer, payee, BigInt(1 + Math.floor(Math.random() * 10000))]);
        }

        const result = computeMultilateralNetting(makeInput(flows));
        expect(result.sum_of_nets_is_zero).toBe(true);

        let sum = 0n;
        for (const net of result.net_positions.values()) sum += net;
        expect(sum).toBe(0n);
      }
    });
  });

  describe("edge cases", () => {
    it("handles participant with zero net", () => {
      const result = computeMultilateralNetting(
        makeInput([
          ["alice", "bob", 50n],
          ["bob", "carol", 50n],
          ["carol", "alice", 50n],
        ]),
      );
      expect(result.sum_of_nets_is_zero).toBe(true);
      expect(result.transfer_count).toBe(0);
    });

    it("handles no flows (empty positions)", () => {
      const result = computeMultilateralNetting({
        window_id: createWindowId("win-empty"),
        positions: new Map(),
      });
      expect(result.transfer_count).toBe(0);
      expect(result.gross_transaction_count).toBe(0);
      expect(result.sum_of_nets_is_zero).toBe(true);
    });

    it("handles single receipt", () => {
      const result = computeMultilateralNetting(
        makeInput([["alice", "bob", 1000n]]),
      );
      expect(result.transfer_count).toBe(1);
      expect(result.transfers[0].amount).toBe(1000n);
      expect(result.sum_of_nets_is_zero).toBe(true);
    });
  });

  describe("large scale", () => {
    it("1,000 participants with 100,000 positions in <1s", () => {
      const participants = Array.from({ length: 1000 }, (_, i) => `p${i}`);
      const flows: Array<[string, string, bigint]> = [];
      for (let i = 0; i < 100_000; i++) {
        const payer = participants[i % 1000];
        const payee = participants[(i * 7 + 3) % 1000];
        if (payer !== payee) {
          flows.push([payer, payee, BigInt(100 + (i % 900))]);
        }
      }

      const start = performance.now();
      const result = computeMultilateralNetting(makeInput(flows));
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(1000);
      expect(result.sum_of_nets_is_zero).toBe(true);
      expect(result.all_positions_resolved).toBe(true);
      expect(result.compression_ratio).toBeGreaterThan(1);
    });
  });

  describe("conservation fuzz", () => {
    it("50 iterations of random positions never produce non-zero sum", () => {
      for (let trial = 0; trial < 50; trial++) {
        const numParticipants = 3 + Math.floor(Math.random() * 20);
        const participants = Array.from({ length: numParticipants }, (_, i) => `fuzz${i}`);
        const numFlows = 5 + Math.floor(Math.random() * 50);
        const flows: Array<[string, string, bigint]> = [];

        for (let f = 0; f < numFlows; f++) {
          const payer = participants[Math.floor(Math.random() * numParticipants)];
          let payee: string;
          do {
            payee = participants[Math.floor(Math.random() * numParticipants)];
          } while (payee === payer);
          flows.push([payer, payee, BigInt(1 + Math.floor(Math.random() * 100000))]);
        }

        const result = computeMultilateralNetting(makeInput(flows, `fuzz-${trial}`));
        expect(result.sum_of_nets_is_zero).toBe(true);

        let transferSum = 0n;
        for (const t of result.transfers) transferSum += t.amount;
        expect(transferSum).toBe(result.net_volume);
      }
    });
  });
});

describe("computeBilateralNetting", () => {
  it("returns null when flows cancel out", () => {
    const result = computeBilateralNetting("alice", "bob", 100n, 100n);
    expect(result).toBeNull();
  });

  it("returns A->B transfer when A owes more", () => {
    const result = computeBilateralNetting("alice", "bob", 100n, 40n);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(60n);
    expect(String(result!.from)).toBe("alice");
    expect(String(result!.to)).toBe("bob");
  });

  it("returns B->A transfer when B owes more", () => {
    const result = computeBilateralNetting("alice", "bob", 30n, 80n);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50n);
    expect(String(result!.from)).toBe("bob");
    expect(String(result!.to)).toBe("alice");
  });
});

describe("createSettlementBatch", () => {
  it("creates a batch from netting output", () => {
    const netting = computeMultilateralNetting(
      makeInput([["alice", "bob", 500n]]),
    );
    const batch = createSettlementBatch(
      netting,
      createWindowId("win-batch"),
      new Uint8Array(32).fill(0xab),
      "coinbase",
    );

    expect(batch.version).toBe(1);
    expect(batch.status).toBe("pending");
    expect(batch.instructions).toHaveLength(1);
    expect(batch.merkle_root).toEqual(new Uint8Array(32).fill(0xab));
  });
});
