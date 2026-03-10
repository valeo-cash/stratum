import type {
  StratumConfig,
  Payment,
  PaymentStatus,
  SubmitResponse,
} from "./types";

export type { StratumConfig, Payment, PaymentStatus, SubmitResponse };

export class Stratum {
  private apiKey: string;
  private gatewayUrl: string;

  constructor(config: StratumConfig) {
    if (!config.apiKey) throw new Error("apiKey is required");
    this.apiKey = config.apiKey;
    this.gatewayUrl = (config.gatewayUrl ?? "https://gateway.stratumx402.com").replace(/\/+$/, "");
  }

  async submit(payment: Payment): Promise<SubmitResponse> {
    const p = { ...payment };
    if (!p.reference) {
      p.reference = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    return this.request("POST", "/v1/settle/submit", { payments: [p] });
  }

  async submitBatch(payments: Payment[]): Promise<SubmitResponse> {
    return this.request("POST", "/v1/settle/submit", { payments });
  }

  async status(reference: string): Promise<PaymentStatus> {
    return this.request("GET", `/v1/settle/status/${encodeURIComponent(reference)}`);
  }

  async batchStatus(references: string[]): Promise<PaymentStatus[]> {
    const res = await this.request("POST", "/v1/settle/batch-status", { references });
    return res.payments;
  }

  async recent(limit?: number): Promise<PaymentStatus[]> {
    const q = limit ? `?limit=${limit}` : "";
    const res = await this.request("GET", `/v1/settle/recent${q}`);
    return res.payments;
  }

  private async request(method: string, path: string, body?: unknown): Promise<any> {
    const url = `${this.gatewayUrl}${path}`;

    const headers: Record<string, string> = {
      "X-API-KEY": this.apiKey,
    };

    const init: RequestInit = { method, headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);

    if (!res.ok) {
      let message = `Stratum API error: ${res.status}`;
      try {
        const err = await res.json();
        if (err.error) message = err.error;
        if (err.message) message = err.message;
      } catch {}
      throw new Error(message);
    }

    return res.json();
  }
}
