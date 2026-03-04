import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { verifySignature } from "./verify";
import { executeSolanaTransfers } from "./executor";
import { confirmSettlement } from "./confirm";
import type {
  FacilitatorConfig,
  SettlementBatch,
  SettlementResult,
} from "./types";

export { verifySignature } from "./verify";
export { executeSolanaTransfers } from "./executor";
export { confirmSettlement } from "./confirm";
export type {
  FacilitatorConfig,
  SettlementBatch,
  SettlementTransfer,
  SettlementResult,
} from "./types";

const DEFAULT_GATEWAY = "https://gateway.stratumx402.com";
const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";
const DEFAULT_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export class StratumFacilitator {
  private apiKey: string;
  private webhookSecret: string;
  private gatewayUrl: string;
  private connection: Connection;
  private payer: Keypair;
  private usdcMint: PublicKey;
  private onSettle?: FacilitatorConfig["onSettle"];
  private onError?: FacilitatorConfig["onError"];

  constructor(config: FacilitatorConfig) {
    this.apiKey = config.apiKey;
    this.webhookSecret = config.webhookSecret;
    this.gatewayUrl = (config.gatewayUrl ?? DEFAULT_GATEWAY).replace(/\/+$/, "");
    this.usdcMint = new PublicKey(config.usdcMint ?? DEFAULT_USDC_MINT);
    this.onSettle = config.onSettle;
    this.onError = config.onError;

    const rpcUrl = config.solanaRpcUrl ?? DEFAULT_RPC;
    this.connection = new Connection(rpcUrl, "confirmed");

    const keyBytes = Buffer.from(config.solanaPrivateKey, "base64");
    this.payer = Keypair.fromSecretKey(new Uint8Array(keyBytes));
  }

  async processWebhook(
    rawBody: Buffer | string,
    signature: string,
  ): Promise<SettlementResult> {
    const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");

    if (!verifySignature(this.webhookSecret, bodyStr, signature)) {
      return { success: false, txHashes: [], error: "Invalid signature" };
    }

    let batch: SettlementBatch;
    try {
      batch = JSON.parse(bodyStr);
    } catch {
      return { success: false, txHashes: [], error: "Invalid JSON body" };
    }

    try {
      const txHashes = await executeSolanaTransfers(
        this.connection,
        this.payer,
        batch.transfers,
        this.usdcMint,
      );

      await confirmSettlement(
        this.gatewayUrl,
        this.apiKey,
        batch.batch_id,
        txHashes,
        batch.chain,
      );

      this.onSettle?.(batch, txHashes);

      return { success: true, txHashes, batchId: batch.batch_id };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.onError?.(error);
      return {
        success: false,
        txHashes: [],
        batchId: batch.batch_id,
        error: error.message,
      };
    }
  }

  handler(): (req: any, res: any, next?: any) => void {
    return async (req, res, _next) => {
      const signature = req.headers["x-stratum-signature"] as string | undefined;
      if (!signature) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing X-Stratum-Signature header" }));
        return;
      }

      let rawBody: Buffer;
      if (Buffer.isBuffer(req.body)) {
        rawBody = req.body;
      } else if (typeof req.body === "string") {
        rawBody = Buffer.from(req.body);
      } else {
        rawBody = Buffer.from(JSON.stringify(req.body));
      }

      const result = await this.processWebhook(rawBody, signature);

      if (result.success) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, txHashes: result.txHashes }));
      } else {
        const status = result.error === "Invalid signature" ? 401 : 500;
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: result.error }));
      }
    };
  }
}
