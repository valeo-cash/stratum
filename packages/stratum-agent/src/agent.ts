import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createApproveCheckedInstruction,
  getAccount,
} from "@solana/spl-token";
import { toBase58, toHex, canonicalPayload, encodeBase64 } from "./encoding";

ed.hashes.sha512 = sha512;

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

export class StratumAgent {
  private privateKey: Uint8Array;
  private publicKey: Uint8Array;
  private receipts: StoredReceipt[] = [];

  constructor(privateKey: Uint8Array) {
    this.privateKey = privateKey;
    this.publicKey = ed.getPublicKey(privateKey);
  }

  getAddress(): string {
    return toBase58(this.publicKey);
  }

  getPublicKeyBytes(): Uint8Array {
    return this.publicKey;
  }

  getReceipts(): StoredReceipt[] {
    return [...this.receipts];
  }

  /**
   * Make a paid API call through a Stratum-proxied endpoint.
   * Handles the full x402 flow transparently.
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

    const payer = this.getAddress();

    const payload = canonicalPayload({
      amount: x402.price,
      asset: x402.asset,
      nonce: x402.nonce,
      payTo: x402.payTo,
      payer,
      validUntil: x402.validUntil,
    });

    const payloadBytes = new TextEncoder().encode(payload);
    const signature = ed.sign(payloadBytes, this.privateKey);
    const signatureHex = toHex(signature);

    const paymentObj = {
      amount: x402.price,
      asset: x402.asset,
      nonce: x402.nonce,
      payTo: x402.payTo,
      payer,
      signature: signatureHex,
      validUntil: x402.validUntil,
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
   * Creates an SPL Token delegate approval so the settlement authority can
   * execute transferChecked on the agent's behalf during settlement.
   */
  async approveSpending(params: {
    stratumSettlementAddress: string;
    amount: bigint;
    connection: Connection;
    usdcMint: PublicKey;
  }): Promise<string> {
    const { stratumSettlementAddress, amount, connection, usdcMint } = params;
    const delegate = new PublicKey(stratumSettlementAddress);

    const fullSecret = new Uint8Array(64);
    fullSecret.set(this.privateKey, 0);
    fullSecret.set(this.publicKey, 32);
    const keypair = Keypair.fromSecretKey(fullSecret);

    const ata = await getAssociatedTokenAddress(usdcMint, keypair.publicKey);

    const ix = createApproveCheckedInstruction(
      ata,
      usdcMint,
      delegate,
      keypair.publicKey,
      amount,
      6, // USDC decimals
    );

    const tx = new Transaction().add(ix);
    const signature = await sendAndConfirmTransaction(connection, tx, [keypair], {
      commitment: "confirmed",
    });

    return signature;
  }

  /**
   * Check current approval amount for Stratum's settlement address.
   * Returns the delegated amount if the settlement address is the current delegate,
   * otherwise returns 0n.
   */
  async getApproval(params: {
    stratumSettlementAddress: string;
    connection: Connection;
    usdcMint: PublicKey;
  }): Promise<bigint> {
    const { stratumSettlementAddress, connection, usdcMint } = params;
    const delegate = new PublicKey(stratumSettlementAddress);

    const ownerPubkey = new PublicKey(this.publicKey);
    const ata = await getAssociatedTokenAddress(usdcMint, ownerPubkey);

    try {
      const account = await getAccount(connection, ata);
      if (account.delegate && account.delegate.equals(delegate)) {
        return account.delegatedAmount;
      }
      return 0n;
    } catch {
      return 0n;
    }
  }
}

/**
 * Drop-in fetch replacement that handles x402 payments automatically.
 */
export function createPaidFetch(privateKey: Uint8Array): typeof globalThis.fetch {
  const agent = new StratumAgent(privateKey);
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    return agent.fetch(url, init);
  };
}
