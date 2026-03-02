import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NetTransfer } from "../types";

const {
  mockWriteContract,
  mockReadContract,
  mockWaitForTransactionReceipt,
} = vi.hoisted(() => ({
  mockWriteContract: vi.fn(),
  mockReadContract: vi.fn(),
  mockWaitForTransactionReceipt: vi.fn(),
}));

vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    createPublicClient: vi.fn().mockReturnValue({
      readContract: mockReadContract,
      waitForTransactionReceipt: mockWaitForTransactionReceipt,
    }),
    createWalletClient: vi.fn().mockReturnValue({
      writeContract: mockWriteContract,
      chain: { id: 84532, name: "Base Sepolia" },
    }),
  };
});

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn().mockReturnValue({
    address: "0x1234567890abcdef1234567890abcdef12345678",
  }),
}));

vi.mock("viem/chains", () => ({
  base: { id: 8453, name: "Base" },
  baseSepolia: { id: 84532, name: "Base Sepolia" },
}));

import { BaseSettlement } from "../base";

const TEST_CONFIG = {
  rpcUrl: "https://sepolia.base.org",
  privateKey:
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`,
  usdcAddress:
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
  testnet: true,
};

function makeTransfer(overrides?: Partial<NetTransfer>): NetTransfer {
  return {
    from: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    to: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    amount: 500_000n,
    windowId: "test-window-1",
    chain: "base",
    ...overrides,
  };
}

describe("BaseSettlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executeBatch", () => {
    it("should execute transfers via transferFrom and return results", async () => {
      const txHash =
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      mockWriteContract.mockResolvedValue(txHash);
      mockWaitForTransactionReceipt.mockResolvedValue({
        status: "success",
      });

      const settlement = new BaseSettlement(TEST_CONFIG);
      const result = await settlement.executeBatch([makeTransfer()]);

      expect(result.chain).toBe("base");
      expect(result.transfers).toHaveLength(1);
      expect(result.allSucceeded).toBe(true);
      expect(result.txHashes).toContain(txHash);
      expect(result.totalVolume).toBe(500_000n);

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "transferFrom",
        }),
      );
    });

    it("should handle reverted transactions", async () => {
      const txHash =
        "0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678";
      mockWriteContract.mockResolvedValue(txHash);
      mockWaitForTransactionReceipt.mockResolvedValue({
        status: "reverted",
      });

      const settlement = new BaseSettlement(TEST_CONFIG);
      const result = await settlement.executeBatch([makeTransfer()]);

      expect(result.allSucceeded).toBe(false);
      expect(result.transfers[0].status).toBe("failed");
      expect(result.transfers[0].error).toBe("Transaction reverted");
    });

    it("should handle writeContract errors gracefully", async () => {
      mockWriteContract.mockRejectedValue(
        new Error("Execution reverted: ERC20: insufficient allowance"),
      );

      const settlement = new BaseSettlement(TEST_CONFIG);
      const result = await settlement.executeBatch([makeTransfer()]);

      expect(result.allSucceeded).toBe(false);
      expect(result.transfers[0].status).toBe("failed");
      expect(result.transfers[0].error).toContain("insufficient allowance");
    });

    it("should return empty result for empty batch", async () => {
      const settlement = new BaseSettlement(TEST_CONFIG);
      const result = await settlement.executeBatch([]);

      expect(result.transfers).toHaveLength(0);
      expect(result.totalVolume).toBe(0n);
      expect(result.allSucceeded).toBe(true);
    });

    it("should process multiple transfers sequentially", async () => {
      const hash1 =
        "0x1111111111111111111111111111111111111111111111111111111111111111";
      const hash2 =
        "0x2222222222222222222222222222222222222222222222222222222222222222";
      mockWriteContract
        .mockResolvedValueOnce(hash1)
        .mockResolvedValueOnce(hash2);
      mockWaitForTransactionReceipt.mockResolvedValue({
        status: "success",
      });

      const settlement = new BaseSettlement(TEST_CONFIG);
      const result = await settlement.executeBatch([
        makeTransfer({ amount: 100_000n }),
        makeTransfer({ amount: 200_000n }),
      ]);

      expect(result.transfers).toHaveLength(2);
      expect(result.totalVolume).toBe(300_000n);
      expect(result.txHashes).toEqual([hash1, hash2]);
    });
  });

  describe("checkAllowance", () => {
    it("should return true when allowance is sufficient", async () => {
      mockReadContract.mockResolvedValue(1_000_000n);

      const settlement = new BaseSettlement(TEST_CONFIG);
      const result = await settlement.checkAllowance(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        500_000n,
      );

      expect(result).toBe(true);
    });

    it("should return false when allowance is insufficient", async () => {
      mockReadContract.mockResolvedValue(100_000n);

      const settlement = new BaseSettlement(TEST_CONFIG);
      const result = await settlement.checkAllowance(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        500_000n,
      );

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      mockReadContract.mockRejectedValue(new Error("RPC error"));

      const settlement = new BaseSettlement(TEST_CONFIG);
      const result = await settlement.checkAllowance(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        500_000n,
      );

      expect(result).toBe(false);
    });
  });

  describe("getBalance", () => {
    it("should return balance", async () => {
      mockReadContract.mockResolvedValue(2_500_000n);

      const settlement = new BaseSettlement(TEST_CONFIG);
      const balance = await settlement.getBalance(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      );

      expect(balance).toBe(2_500_000n);
    });

    it("should return 0 on error", async () => {
      mockReadContract.mockRejectedValue(new Error("RPC error"));

      const settlement = new BaseSettlement(TEST_CONFIG);
      const balance = await settlement.getBalance(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      );

      expect(balance).toBe(0n);
    });
  });
});
