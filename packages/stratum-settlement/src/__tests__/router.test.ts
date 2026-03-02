import { describe, it, expect, vi, beforeEach } from "vitest";
import { SettlementRouter } from "../router";
import type {
  ChainSettlement,
  NetTransfer,
  BatchSettlementResult,
} from "../types";

function makeMockChain(
  chain: "solana" | "base",
  overrides?: Partial<ChainSettlement>,
): ChainSettlement {
  return {
    chain,
    executeBatch: vi.fn().mockResolvedValue({
      chain,
      transfers: [],
      totalVolume: 0n,
      txHashes: [],
      allSucceeded: true,
    } satisfies BatchSettlementResult),
    checkAllowance: vi.fn().mockResolvedValue(true),
    getBalance: vi.fn().mockResolvedValue(10_000_000n),
    ...overrides,
  };
}

function makeTransfer(
  chain: "solana" | "base",
  amount = 1_000_000n,
): NetTransfer {
  return {
    from: chain === "solana" ? "SolPub" + Math.random() : "0x" + "aa".repeat(20),
    to: chain === "solana" ? "SolDest" + Math.random() : "0x" + "bb".repeat(20),
    amount,
    windowId: "win-test-1",
    chain,
  };
}

describe("SettlementRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executeBatch", () => {
    it("should group transfers by chain and execute in parallel", async () => {
      const solana = makeMockChain("solana");
      const base = makeMockChain("base");
      const router = new SettlementRouter({ solana, base });

      const transfers = [
        makeTransfer("solana"),
        makeTransfer("base"),
        makeTransfer("solana"),
        makeTransfer("base"),
      ];

      const results = await router.executeBatch(transfers);

      expect(results).toHaveLength(2);
      expect(solana.executeBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ chain: "solana" }),
        ]),
      );
      expect(base.executeBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ chain: "base" }),
        ]),
      );

      const solanaCall = (solana.executeBatch as any).mock.calls[0][0];
      expect(solanaCall).toHaveLength(2);

      const baseCall = (base.executeBatch as any).mock.calls[0][0];
      expect(baseCall).toHaveLength(2);
    });

    it("should handle single chain only (solana)", async () => {
      const solana = makeMockChain("solana");
      const router = new SettlementRouter({ solana });

      const transfers = [makeTransfer("solana"), makeTransfer("solana")];
      const results = await router.executeBatch(transfers);

      expect(results).toHaveLength(1);
      expect(results[0].chain).toBe("solana");
      expect(solana.executeBatch).toHaveBeenCalledTimes(1);
    });

    it("should handle single chain only (base)", async () => {
      const base = makeMockChain("base");
      const router = new SettlementRouter({ base });

      const transfers = [makeTransfer("base")];
      const results = await router.executeBatch(transfers);

      expect(results).toHaveLength(1);
      expect(results[0].chain).toBe("base");
    });

    it("should return empty results for empty batch", async () => {
      const router = new SettlementRouter({
        solana: makeMockChain("solana"),
        base: makeMockChain("base"),
      });

      const results = await router.executeBatch([]);
      expect(results).toHaveLength(0);
    });

    it("should return failed results when chain is not configured", async () => {
      const router = new SettlementRouter({});

      const transfers = [makeTransfer("solana"), makeTransfer("base")];
      const results = await router.executeBatch(transfers);

      expect(results).toHaveLength(2);
      for (const r of results) {
        expect(r.allSucceeded).toBe(false);
        for (const t of r.transfers) {
          expect(t.status).toBe("failed");
          expect(t.error).toContain("not configured");
        }
      }
    });

    it("should not crash if one chain fails while the other succeeds", async () => {
      const solana = makeMockChain("solana", {
        executeBatch: vi
          .fn()
          .mockRejectedValue(new Error("Solana RPC timeout")),
      });
      const base = makeMockChain("base", {
        executeBatch: vi.fn().mockResolvedValue({
          chain: "base",
          transfers: [
            {
              from: "0x",
              to: "0x",
              amount: 500_000n,
              txHash: "0xabc",
              status: "confirmed",
            },
          ],
          totalVolume: 500_000n,
          txHashes: ["0xabc"],
          allSucceeded: true,
        } satisfies BatchSettlementResult),
      });

      const router = new SettlementRouter({ solana, base });
      const transfers = [makeTransfer("solana"), makeTransfer("base")];

      const results = await router.executeBatch(transfers);

      expect(results).toHaveLength(2);

      const baseResult = results.find((r) => r.chain === "base");
      expect(baseResult?.allSucceeded).toBe(true);
    });

    it("should only call chains that have transfers", async () => {
      const solana = makeMockChain("solana");
      const base = makeMockChain("base");
      const router = new SettlementRouter({ solana, base });

      await router.executeBatch([makeTransfer("solana")]);

      expect(solana.executeBatch).toHaveBeenCalledTimes(1);
      expect(base.executeBatch).not.toHaveBeenCalled();
    });
  });

  describe("preflightCheck", () => {
    it("should return preflight info for solana", async () => {
      const solana = makeMockChain("solana");
      const router = new SettlementRouter({ solana });

      const result = await router.preflightCheck(
        "SolPubKey123",
        1_000_000n,
        "solana",
      );

      expect(result.hasBalance).toBe(true);
      expect(result.hasAllowance).toBe(true);
      expect(result.balance).toBe(10_000_000n);
    });

    it("should return preflight info for base", async () => {
      const base = makeMockChain("base");
      const router = new SettlementRouter({ base });

      const result = await router.preflightCheck(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        1_000_000n,
        "base",
      );

      expect(result.hasBalance).toBe(true);
      expect(result.hasAllowance).toBe(true);
    });

    it("should return zeros when chain not configured", async () => {
      const router = new SettlementRouter({});

      const result = await router.preflightCheck("addr", 1_000_000n, "solana");

      expect(result.hasBalance).toBe(false);
      expect(result.hasAllowance).toBe(false);
      expect(result.balance).toBe(0n);
      expect(result.allowance).toBe(0n);
    });
  });

  describe("hasChain", () => {
    it("should report configured chains", () => {
      const router = new SettlementRouter({
        solana: makeMockChain("solana"),
      });

      expect(router.hasChain("solana")).toBe(true);
      expect(router.hasChain("base")).toBe(false);
    });
  });
});
