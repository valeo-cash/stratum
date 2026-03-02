import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = sha512;

const { mockGetAssociatedTokenAddress, mockCreateApproveCheckedInstruction, mockGetAccount } =
  vi.hoisted(() => ({
    mockGetAssociatedTokenAddress: vi.fn(),
    mockCreateApproveCheckedInstruction: vi.fn(),
    mockGetAccount: vi.fn(),
  }));

const { mockSendAndConfirmTransaction } = vi.hoisted(() => ({
  mockSendAndConfirmTransaction: vi.fn(),
}));

vi.mock("@solana/spl-token", () => ({
  getAssociatedTokenAddress: mockGetAssociatedTokenAddress,
  createApproveCheckedInstruction: mockCreateApproveCheckedInstruction,
  getAccount: mockGetAccount,
}));

vi.mock("@solana/web3.js", async () => {
  const actual = await vi.importActual<typeof import("@solana/web3.js")>(
    "@solana/web3.js",
  );
  return {
    ...actual,
    sendAndConfirmTransaction: mockSendAndConfirmTransaction,
  };
});

import { StratumAgent } from "../agent";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const MOCK_ATA = new PublicKey("11111111111111111111111111111112");

function makeAgent(): { agent: StratumAgent; publicKey: Uint8Array } {
  const privateKey = ed.utils.randomSecretKey();
  const publicKey = ed.getPublicKey(privateKey);
  const agent = new StratumAgent(privateKey);
  return { agent, publicKey };
}

function makeMockConnection(): any {
  return { rpcEndpoint: "https://api.devnet.solana.com" };
}

describe("StratumAgent.approveSpending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAssociatedTokenAddress.mockResolvedValue(MOCK_ATA);
    mockCreateApproveCheckedInstruction.mockReturnValue({
      keys: [],
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      data: Buffer.alloc(10),
    });
    mockSendAndConfirmTransaction.mockResolvedValue("mock-approve-sig-123");
  });

  it("should call createApproveCheckedInstruction with correct args", async () => {
    const { agent } = makeAgent();
    const connection = makeMockConnection();
    const settlementKeypair = Keypair.generate();

    const sig = await agent.approveSpending({
      stratumSettlementAddress: settlementKeypair.publicKey.toBase58(),
      amount: 100_000_000n,
      connection,
      usdcMint: USDC_MINT,
    });

    expect(sig).toBe("mock-approve-sig-123");
    expect(mockGetAssociatedTokenAddress).toHaveBeenCalledWith(
      USDC_MINT,
      expect.any(PublicKey),
    );
    expect(mockCreateApproveCheckedInstruction).toHaveBeenCalledWith(
      MOCK_ATA,
      USDC_MINT,
      settlementKeypair.publicKey,
      expect.any(PublicKey), // agent's pubkey
      100_000_000n,
      6, // USDC decimals
    );
    expect(mockSendAndConfirmTransaction).toHaveBeenCalledTimes(1);
  });

  it("should propagate transaction errors", async () => {
    mockSendAndConfirmTransaction.mockRejectedValueOnce(
      new Error("Transaction simulation failed"),
    );

    const { agent } = makeAgent();
    await expect(
      agent.approveSpending({
        stratumSettlementAddress: Keypair.generate().publicKey.toBase58(),
        amount: 1_000_000n,
        connection: makeMockConnection(),
        usdcMint: USDC_MINT,
      }),
    ).rejects.toThrow("Transaction simulation failed");
  });
});

describe("StratumAgent.getApproval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAssociatedTokenAddress.mockResolvedValue(MOCK_ATA);
  });

  it("should return delegated amount when delegate matches", async () => {
    const settlementKeypair = Keypair.generate();

    mockGetAccount.mockResolvedValueOnce({
      delegate: settlementKeypair.publicKey,
      delegatedAmount: 50_000_000n,
      amount: 1_000_000_000n,
    });

    const { agent } = makeAgent();
    const approval = await agent.getApproval({
      stratumSettlementAddress: settlementKeypair.publicKey.toBase58(),
      connection: makeMockConnection(),
      usdcMint: USDC_MINT,
    });

    expect(approval).toBe(50_000_000n);
  });

  it("should return 0n when no delegate is set", async () => {
    mockGetAccount.mockResolvedValueOnce({
      delegate: null,
      delegatedAmount: 0n,
      amount: 1_000_000_000n,
    });

    const { agent } = makeAgent();
    const approval = await agent.getApproval({
      stratumSettlementAddress: Keypair.generate().publicKey.toBase58(),
      connection: makeMockConnection(),
      usdcMint: USDC_MINT,
    });

    expect(approval).toBe(0n);
  });

  it("should return 0n when delegate does not match", async () => {
    const otherKey = Keypair.generate();

    mockGetAccount.mockResolvedValueOnce({
      delegate: otherKey.publicKey,
      delegatedAmount: 100_000_000n,
      amount: 1_000_000_000n,
    });

    const { agent } = makeAgent();
    const approval = await agent.getApproval({
      stratumSettlementAddress: Keypair.generate().publicKey.toBase58(),
      connection: makeMockConnection(),
      usdcMint: USDC_MINT,
    });

    expect(approval).toBe(0n);
  });

  it("should return 0n when account does not exist", async () => {
    mockGetAccount.mockRejectedValueOnce(
      new Error("Account does not exist"),
    );

    const { agent } = makeAgent();
    const approval = await agent.getApproval({
      stratumSettlementAddress: Keypair.generate().publicKey.toBase58(),
      connection: makeMockConnection(),
      usdcMint: USDC_MINT,
    });

    expect(approval).toBe(0n);
  });
});
