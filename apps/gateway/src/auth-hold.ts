import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { sha256 } from "@noble/hashes/sha2.js";

const SOLANA_USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

export type AuthorizationType = "none" | "balance-check" | "token-approval" | "eip-3009";

export interface Eip3009Auth {
  v: number;
  r: string;
  s: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
}

export async function verifySolanaApproval(params: {
  payerAddress: string;
  amount: bigint;
  approvalTxSignature: string;
}): Promise<boolean> {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const feeWallet = process.env.STRATUM_FEE_WALLET || process.env.SOLANA_SETTLEMENT_PUBKEY;
  if (!feeWallet) {
    console.error("[auth-hold] STRATUM_FEE_WALLET not configured");
    return false;
  }

  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const ownerPubkey = new PublicKey(params.payerAddress);
    const delegatePubkey = new PublicKey(feeWallet);

    const ata = await getAssociatedTokenAddress(SOLANA_USDC_MINT, ownerPubkey);
    const account = await getAccount(connection, ata);

    if (!account.delegate) {
      console.log(`[auth-hold] No delegate set on ATA for ${params.payerAddress}`);
      return false;
    }

    if (!account.delegate.equals(delegatePubkey)) {
      console.log(`[auth-hold] Delegate mismatch: expected ${feeWallet}, got ${account.delegate.toBase58()}`);
      return false;
    }

    if (account.delegatedAmount < params.amount) {
      console.log(`[auth-hold] Delegated amount ${account.delegatedAmount} < required ${params.amount}`);
      return false;
    }

    if (account.amount < params.amount) {
      console.log(`[auth-hold] Token balance ${account.amount} < required ${params.amount}`);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error("[auth-hold] Solana approval verification failed:", err.message || err);
    return false;
  }
}

export async function verifyBaseAuthorization(params: {
  from: string;
  to: string;
  value: bigint;
  validAfter: number;
  validBefore: number;
  nonce: string;
  v: number;
  r: string;
  s: string;
}): Promise<boolean> {
  const feeWallet = process.env.STRATUM_BASE_FEE_WALLET || process.env.BASE_SETTLEMENT_PUBKEY;
  if (!feeWallet) {
    console.error("[auth-hold] STRATUM_BASE_FEE_WALLET not configured");
    return false;
  }

  try {
    if (params.to.toLowerCase() !== feeWallet.toLowerCase()) {
      console.log(`[auth-hold] EIP-3009 'to' mismatch: expected ${feeWallet}, got ${params.to}`);
      return false;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (params.validBefore <= nowSec) {
      console.log(`[auth-hold] EIP-3009 expired: validBefore=${params.validBefore}, now=${nowSec}`);
      return false;
    }

    if (params.validAfter > nowSec) {
      console.log(`[auth-hold] EIP-3009 not yet valid: validAfter=${params.validAfter}, now=${nowSec}`);
      return false;
    }

    // EIP-3009 TransferWithAuthorization typehash
    const TRANSFER_WITH_AUTH_TYPEHASH = "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)";
    const typeHash = sha256(new TextEncoder().encode(TRANSFER_WITH_AUTH_TYPEHASH));

    // Verify signature components are well-formed
    if (!params.r || !params.s || params.v < 27 || params.v > 28) {
      console.log("[auth-hold] Malformed EIP-3009 signature components");
      return false;
    }

    // On-chain verification happens at settlement time via transferWithAuthorization call.
    // Here we do structural validation only — the actual ecrecover happens on-chain.
    console.log(`[auth-hold] EIP-3009 structurally valid: from=${params.from}, value=${params.value}`);
    return true;
  } catch (err: any) {
    console.error("[auth-hold] Base authorization verification failed:", err.message || err);
    return false;
  }
}

export async function verifyAuthorization(params: {
  chain: string;
  payerAddress: string;
  amount: bigint;
  approvalTxSignature?: string;
  eip3009Auth?: Eip3009Auth;
}): Promise<{ valid: boolean; type: AuthorizationType }> {
  if (params.chain === "solana" && params.approvalTxSignature) {
    const valid = await verifySolanaApproval({
      payerAddress: params.payerAddress,
      amount: params.amount,
      approvalTxSignature: params.approvalTxSignature,
    });
    return { valid, type: "token-approval" };
  }

  if (params.chain === "base" && params.eip3009Auth) {
    const feeWallet = process.env.STRATUM_BASE_FEE_WALLET || process.env.BASE_SETTLEMENT_PUBKEY || "";
    const valid = await verifyBaseAuthorization({
      from: params.payerAddress,
      to: feeWallet,
      value: params.amount,
      ...params.eip3009Auth,
    });
    return { valid, type: "eip-3009" };
  }

  return { valid: true, type: "none" };
}
