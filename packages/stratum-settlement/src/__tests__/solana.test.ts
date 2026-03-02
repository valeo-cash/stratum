import { describe, it, expect, vi, beforeEach } from "vitest";
import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import { SolanaSettlement } from "../solana";
import type { NetTransfer } from "../types";

vi.mock("@solana/spl-token", () => {
  const mockAta = new PublicKey("11111111111111111111111111111112");
  return {
    getAssociatedTokenAddress: vi.fn().mockResolvedValue(mockAta),
    createTransferCheckedInstruction: vi.fn().mockReturnValue({
      keys: [],
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      data: Buffer.alloc(10),
    }),
    getAccount: vi.fn().mockResolvedValue({
      amount: 5_000_000n,
      delegate: null,
      delegatedAmount: 0n,
    }),
    TOKEN_PROGRAM_ID: new PublicKey(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    ),
  };
});

vi.mock("@solana/web3.js", async () => {
  const actual = await vi.importActual<typeof import("@solana/web3.js")>(
    "@solana/web3.js",
  );
  return {
    ...actual,
    sendAndConfirmTransaction: vi
      .fn()
      .mockResolvedValue("mock-tx-signature-abc123"),
  };
});

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

function makeSettlement() {
  const connection = new Connection("https://api.devnet.solana.com");
  const keypair = Keypair.generate();
  return new SolanaSettlement(connection, keypair, USDC_MINT);
}

function makeTransfer(overrides?: Partial<NetTransfer>): NetTransfer {
  return {
    from: Keypair.generate().publicKey.toBase58(),
    to: Keypair.generate().publicKey.toBase58(),
    amount: 1_000_000n,
    windowId: "test-window-1",
    chain: "solana",
    ...overrides,
  };
}

describe("SolanaSettlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executeBatch", () => {
    it("should execute a batch of transfers and return results", async () => {
      const settlement = makeSettlement();
      const transfers = [makeTransfer(), makeTransfer()];

      const result = await settlement.executeBatch(transfers);

      expect(result.chain).toBe("solana");
      expect(result.transfers).toHaveLength(2);
      expect(result.allSucceeded).toBe(true);
      expect(result.txHashes).toHaveLength(1); // 2 transfers fit in 1 tx (max 5)
      expect(result.totalVolume).toBe(2_000_000n);
    });

    it("should split into multiple transactions when > 5 transfers", async () => {
      const settlement = makeSettlement();
      const transfers = Array.from({ length: 7 }, () => makeTransfer());

      const result = await settlement.executeBatch(transfers);

      expect(result.transfers).toHaveLength(7);
      expect(result.txHashes).toHaveLength(2); // 5 + 2
    });

    it("should return empty result for empty batch", async () => {
      const settlement = makeSettlement();
      const result = await settlement.executeBatch([]);

      expect(result.transfers).toHaveLength(0);
      expect(result.txHashes).toHaveLength(0);
      expect(result.totalVolume).toBe(0n);
      expect(result.allSucceeded).toBe(true);
    });

    it("should handle transaction failure gracefully", async () => {
      const { sendAndConfirmTransaction } = await import("@solana/web3.js");
      (sendAndConfirmTransaction as any).mockRejectedValueOnce(
        new Error("Insufficient funds"),
      );

      const settlement = makeSettlement();
      const result = await settlement.executeBatch([makeTransfer()]);

      expect(result.allSucceeded).toBe(false);
      expect(result.transfers[0].status).toBe("failed");
      expect(result.transfers[0].error).toContain("Insufficient funds");
    });
  });

  describe("checkAllowance", () => {
    it("should return false when no delegate is set", async () => {
      const settlement = makeSettlement();
      const result = await settlement.checkAllowance(
        Keypair.generate().publicKey.toBase58(),
        1_000_000n,
      );
      expect(result).toBe(false);
    });

    it("should return true when delegate and balance are sufficient", async () => {
      const keypair = Keypair.generate();
      const settlement = new SolanaSettlement(
        new Connection("https://api.devnet.solana.com"),
        keypair,
        USDC_MINT,
      );

      const { getAccount } = await import("@solana/spl-token");
      (getAccount as any).mockResolvedValueOnce({
        amount: 5_000_000n,
        delegate: keypair.publicKey,
        delegatedAmount: 5_000_000n,
      });

      const result = await settlement.checkAllowance(
        Keypair.generate().publicKey.toBase58(),
        1_000_000n,
      );
      expect(result).toBe(true);
    });
  });

  describe("getBalance", () => {
    it("should return account balance", async () => {
      const settlement = makeSettlement();
      const balance = await settlement.getBalance(
        Keypair.generate().publicKey.toBase58(),
      );
      expect(balance).toBe(5_000_000n);
    });

    it("should return 0 on error", async () => {
      const { getAccount } = await import("@solana/spl-token");
      (getAccount as any).mockRejectedValueOnce(new Error("Account not found"));

      const settlement = makeSettlement();
      const balance = await settlement.getBalance(
        Keypair.generate().publicKey.toBase58(),
      );
      expect(balance).toBe(0n);
    });
  });
});
