import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { encodeBase64 } from "./encoding";

const USDC_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

const EIP712_DOMAIN = {
  name: "StratumPayment",
  version: "1",
} as const;

const PAYMENT_TYPES = {
  Payment: [
    { name: "payer", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "payTo", type: "address" },
    { name: "nonce", type: "bytes32" },
    { name: "validUntil", type: "uint256" },
  ],
} as const;

interface X402Requirements {
  version: string;
  price: string;
  asset: string;
  network: string;
  payTo: string;
  validUntil: string;
  nonce: string;
}

interface StoredReceipt {
  hash: string;
  url: string;
  amount: string;
  timestamp: number;
}

export class StratumAgentEVM {
  private readonly account: PrivateKeyAccount;
  private receipts: StoredReceipt[] = [];

  constructor(privateKey: `0x${string}`) {
    this.account = privateKeyToAccount(privateKey);
  }

  getAddress(): string {
    return this.account.address;
  }

  getReceipts(): StoredReceipt[] {
    return [...this.receipts];
  }

  /**
   * Make a paid API call through a Stratum-proxied endpoint.
   * Signs payments using EIP-712 typed data.
   */
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const initialRes = await globalThis.fetch(url, options);

    if (initialRes.status !== 402) {
      return initialRes;
    }

    let body: any;
    try {
      body = await initialRes.json();
    } catch {
      throw new Error("Gateway returned 402 but body is not valid JSON");
    }

    const x402: X402Requirements = body.x402;
    if (!x402) {
      throw new Error("Gateway 402 response missing x402 field");
    }

    const nonceHex = x402.nonce.startsWith("0x")
      ? (x402.nonce as `0x${string}`)
      : (`0x${x402.nonce.padStart(64, "0")}` as `0x${string}`);

    const signature = await this.account.signTypedData({
      domain: EIP712_DOMAIN,
      types: PAYMENT_TYPES,
      primaryType: "Payment",
      message: {
        payer: this.account.address,
        amount: BigInt(x402.price),
        payTo: x402.payTo as Address,
        nonce: nonceHex,
        validUntil: BigInt(x402.validUntil),
      },
    });

    const paymentObj = {
      payer: this.account.address,
      amount: x402.price,
      asset: x402.asset,
      payTo: x402.payTo,
      nonce: x402.nonce,
      validUntil: x402.validUntil,
      signature,
    };

    const paymentHeader = encodeBase64(JSON.stringify(paymentObj));

    const retryHeaders = new Headers(options?.headers);
    retryHeaders.set("X-PAYMENT", paymentHeader);

    const paidRes = await globalThis.fetch(url, {
      ...options,
      headers: retryHeaders,
    });

    const receiptHash = paidRes.headers.get("x-stratum-receipt");
    if (receiptHash) {
      this.receipts.push({
        hash: receiptHash,
        url,
        amount: x402.price,
        timestamp: Date.now(),
      });
    }

    return paidRes;
  }

  /**
   * Approve Stratum's settlement address to spend USDC on behalf of this agent.
   * Calls USDC.approve(settlementAddress, amount) on Base.
   */
  async approveSpending(params: {
    stratumSettlementAddress: string;
    amount: bigint;
    rpcUrl: string;
    usdcAddress: `0x${string}`;
    testnet?: boolean;
  }): Promise<string> {
    const { stratumSettlementAddress, amount, rpcUrl, usdcAddress, testnet } =
      params;
    const chainConfig = testnet ? baseSepolia : base;

    const walletClient = createWalletClient({
      account: this.account,
      chain: chainConfig,
      transport: http(rpcUrl),
    });

    const publicClient = createPublicClient({
      chain: chainConfig,
      transport: http(rpcUrl),
    });

    const hash: Hash = await walletClient.writeContract({
      address: usdcAddress,
      abi: USDC_ABI,
      functionName: "approve",
      args: [stratumSettlementAddress as Address, amount],
      account: this.account,
      chain: chainConfig,
    });

    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

    return hash;
  }

  /**
   * Check current USDC allowance for the settlement address.
   */
  async getAllowance(params: {
    stratumSettlementAddress: string;
    rpcUrl: string;
    usdcAddress: `0x${string}`;
    testnet?: boolean;
  }): Promise<bigint> {
    const { stratumSettlementAddress, rpcUrl, usdcAddress, testnet } = params;
    const chainConfig = testnet ? baseSepolia : base;

    const publicClient = createPublicClient({
      chain: chainConfig,
      transport: http(rpcUrl),
    });

    try {
      const allowance = await publicClient.readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "allowance",
        args: [this.account.address, stratumSettlementAddress as Address],
      });
      return allowance as bigint;
    } catch {
      return 0n;
    }
  }
}
