import { EventEmitter } from "node:events";
import { randomBytes } from "node:crypto";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
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
const DEFAULT_PORT = 3200;

export class StratumFacilitator extends EventEmitter {
  private apiKey: string;
  private webhookSecret: string;
  private gatewayUrl: string;
  private port: number;
  private publicUrl?: string;
  private connection: Connection;
  private payer: Keypair;
  private usdcMint: PublicKey;
  private server?: Server;

  constructor(config: FacilitatorConfig) {
    super();

    this.apiKey = config.apiKey;
    this.webhookSecret = randomBytes(32).toString("hex");
    this.gatewayUrl = (config.gatewayUrl ?? DEFAULT_GATEWAY).replace(/\/+$/, "");
    this.port = config.port ?? DEFAULT_PORT;
    this.publicUrl = config.publicUrl ?? process.env.PUBLIC_URL;
    this.usdcMint = new PublicKey(config.usdcMint ?? DEFAULT_USDC_MINT);

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

    this.emit("batch", batch);

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

      const result: SettlementResult = { success: true, txHashes, batchId: batch.batch_id };
      this.emit("settled", result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit("error", error);
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

  async start(): Promise<void> {
    this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method === "POST" && req.url === "/settle") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        const rawBody = Buffer.concat(chunks);

        const signature = req.headers["x-stratum-signature"] as string | undefined;
        if (!signature) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing X-Stratum-Signature header" }));
          return;
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
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    });

    await new Promise<void>((resolve) => {
      this.server!.listen(this.port, () => resolve());
    });

    const url = this.publicUrl;

    if (url) {
      try {
        const webhookUrl = `${url.replace(/\/+$/, "")}/settle`;
        const res = await fetch(`${this.gatewayUrl}/v1/settle/webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": this.apiKey,
          },
          body: JSON.stringify({
            url: webhookUrl,
            chains: ["solana"],
            secret: this.webhookSecret,
          }),
          signal: AbortSignal.timeout(10_000),
        });

        if (res.ok) {
          console.log(`  Webhook registered: ${webhookUrl}`);
        } else {
          const body = await res.text().catch(() => "");
          console.log(`  Webhook registration failed (${res.status}): ${body}`);
        }
      } catch (err: any) {
        console.log(`  Webhook auto-registration failed: ${err.message}`);
      }
    } else {
      console.log("  Set PUBLIC_URL env var to auto-register webhook with Gateway");
    }

    console.log();
    console.log(`  Stratum Facilitator running on port ${this.port}`);
    if (url) console.log(`  Webhook: ${url.replace(/\/+$/, "")}/settle`);
    console.log("  Ready to receive settlement batches");
    console.log();
  }

  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => (err ? reject(err) : resolve()));
      });
      this.server = undefined;
    }
  }
}
