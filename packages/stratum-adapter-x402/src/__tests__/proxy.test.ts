import { describe, it, expect, beforeEach } from "vitest";
import { StratumProxyHandler } from "../proxy";
import { ServiceRegistry } from "../registry";
import { WindowManager, createServiceId } from "@valeo/stratum-core";
import type { ServiceRegistration, StratumConfig } from "@valeo/stratum-core";
import type { IncomingRequest } from "../types";

function makeConfig(): StratumConfig {
  return {
    version: 1,
    settlement_window_seconds: 300,
    chain: "solana",
    asset: "USDC",
    facilitator_url: "https://facilitator.example.com",
    risk_controls_enabled: false,
  };
}

function makeService(): ServiceRegistration {
  return {
    version: 1,
    service_id: createServiceId("svc-ai"),
    name: "AI Inference",
    target_url: "https://inference.example.com",
    stratum_slug: "ai-inference",
    pricing: [
      {
        version: 1,
        path_pattern: "/v1/**",
        amount_per_request: 200n,
        asset: "USDC",
      },
    ],
  };
}

describe("StratumProxyHandler", () => {
  let registry: ServiceRegistry;
  let windowManager: WindowManager;
  let handler: StratumProxyHandler;

  beforeEach(async () => {
    registry = new ServiceRegistry();
    windowManager = new WindowManager(makeConfig());
    handler = new StratumProxyHandler({ serviceRegistry: registry, windowManager });

    await registry.register(makeService());
  });

  it("returns 404 for unknown slug", async () => {
    const req: IncomingRequest = {
      slug: "unknown-service",
      path: "/api",
      method: "GET",
      headers: {},
    };

    const res = await handler.handleRequest(req);
    expect(res.status).toBe(404);
  });

  it("returns 402 when no x-payment header", async () => {
    const req: IncomingRequest = {
      slug: "ai-inference",
      path: "/v1/chat",
      method: "POST",
      headers: {},
    };

    const res = await handler.handleRequest(req);
    expect(res.status).toBe(402);
    expect((res.body as any).price).toBe("200");
    expect((res.body as any).asset).toBe("USDC");
  });

  it("returns 200 with receipt when x-payment header present", async () => {
    const req: IncomingRequest = {
      slug: "ai-inference",
      path: "/v1/chat",
      method: "POST",
      headers: { "x-payment": "agent-wallet-123" },
    };

    const res = await handler.handleRequest(req);
    expect(res.status).toBe(200);
    expect(res.headers["x-stratum-receipt"]).toBeDefined();
    expect(res.headers["x-stratum-sequence"]).toBe("0");
    expect((res.body as any).receipt_id).toBeDefined();
  });

  it("tracks sequences across multiple requests", async () => {
    for (let i = 0; i < 3; i++) {
      const req: IncomingRequest = {
        slug: "ai-inference",
        path: "/v1/chat",
        method: "POST",
        headers: { "x-payment": `wallet-${i}` },
      };

      const res = await handler.handleRequest(req);
      expect(res.status).toBe(200);
      expect(res.headers["x-stratum-sequence"]).toBe(String(i));
    }

    expect(windowManager.getCurrentWindow().getReceiptCount()).toBe(3);
  });

  it("returns 402 with default pricing when route has no specific pricing", async () => {
    const req: IncomingRequest = {
      slug: "ai-inference",
      path: "/health",
      method: "GET",
      headers: {},
    };

    const res = await handler.handleRequest(req);
    expect(res.status).toBe(402);
    expect((res.body as any).price).toBe("0");
  });
});
