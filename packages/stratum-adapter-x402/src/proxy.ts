import type {
  SignedReceipt,
  Receipt,
  AccountId,
} from "@valeo/stratum-core";
import {
  createReceiptId,
  createAccountId,
  createFacilitatorId,
  createWindowId,
  CURRENT_RECEIPT_VERSION,
  WindowManager,
} from "@valeo/stratum-core";
import type { ServiceRegistry } from "./registry";
import type { IncomingRequest, ProxyResponse } from "./types";

/**
 * Reverse proxy handler that intercepts x402 payment flows.
 *
 * 1. Looks up the service by slug
 * 2. If no X-PAYMENT header, returns 402 with payment requirements
 * 3. If X-PAYMENT present, creates receipt, submits to window manager,
 *    returns 200 with X-STRATUM-RECEIPT header
 */
export class StratumProxyHandler {
  private serviceRegistry: ServiceRegistry;
  private windowManager: WindowManager;
  private receiptSeq = 0;

  constructor(config: {
    serviceRegistry: ServiceRegistry;
    windowManager: WindowManager;
  }) {
    this.serviceRegistry = config.serviceRegistry;
    this.windowManager = config.windowManager;
  }

  async handleRequest(req: IncomingRequest): Promise<ProxyResponse> {
    const service = await this.serviceRegistry.getBySlug(req.slug);
    if (!service) {
      return {
        status: 404,
        headers: {},
        body: { error: "Service not found" },
      };
    }

    const pricing = await this.serviceRegistry.getPricing(
      service.service_id as string,
      req.path,
    );

    const paymentHeader = req.headers["x-payment"];

    if (!paymentHeader) {
      return {
        status: 402,
        headers: { "content-type": "application/json" },
        body: {
          price: pricing ? pricing.amount_per_request.toString() : "0",
          asset: pricing?.asset ?? "USDC",
          payee: service.service_id,
          network: "solana",
        },
      };
    }

    const seq = this.receiptSeq++;
    const receiptId = createReceiptId(`rcpt-${req.slug}-${seq}`);

    const receipt: Receipt = {
      version: CURRENT_RECEIPT_VERSION,
      receipt_id: receiptId,
      window_id: this.windowManager.getCurrentWindow().windowId,
      sequence: 0,
      payer: createAccountId(paymentHeader),
      payee: createAccountId(service.service_id as string),
      amount: pricing?.amount_per_request ?? 0n,
      asset: pricing?.asset ?? "USDC",
      resource_hash: new Uint8Array(32),
      idempotency_key: new TextEncoder().encode(
        `${paymentHeader}-${req.slug}-${req.path}`.padEnd(32, "\0").slice(0, 32),
      ),
      timestamp: Date.now(),
      facilitator_id: createFacilitatorId("default"),
      nonce: `${paymentHeader}-${seq}`,
    };

    const signedReceipt: SignedReceipt = {
      version: 1,
      receipt,
      signature: new Uint8Array(64),
      signer_public_key: new Uint8Array(32),
    };

    const { receiptId: rid, sequence } = this.windowManager.submitReceipt(signedReceipt);

    return {
      status: 200,
      headers: {
        "x-stratum-receipt": rid as string,
        "x-stratum-sequence": String(sequence),
      },
      body: {
        message: "Request processed",
        receipt_id: rid,
      },
    };
  }
}
