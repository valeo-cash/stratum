import { describe, it, expect } from "vitest";
import { ServiceRegistry } from "../registry";
import { createServiceId } from "@valeo/stratum-core";
import type { ServiceRegistration } from "@valeo/stratum-core";

function makeService(slug: string): ServiceRegistration {
  return {
    version: 1,
    service_id: createServiceId(`svc-${slug}`),
    name: `Test Service ${slug}`,
    target_url: `https://${slug}.example.com`,
    stratum_slug: slug,
    pricing: [
      {
        version: 1,
        path_pattern: "/api/v1/**",
        amount_per_request: 100n,
        asset: "USDC",
      },
      {
        version: 1,
        path_pattern: "/api/v2/premium",
        amount_per_request: 500n,
        asset: "USDC",
      },
    ],
  };
}

describe("ServiceRegistry", () => {
  it("registers and looks up a service by slug", async () => {
    const registry = new ServiceRegistry();
    const svc = makeService("weather");

    const result = await registry.register(svc);
    expect(result.slug).toBe("weather");
    expect(result.endpoint).toContain("weather");

    const found = await registry.getBySlug("weather");
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Test Service weather");
    expect(found!.target_url).toBe("https://weather.example.com");
  });

  it("returns null for unknown slug", async () => {
    const registry = new ServiceRegistry();
    const result = await registry.getBySlug("nonexistent");
    expect(result).toBeNull();
  });

  it("getPricing matches wildcard route", async () => {
    const registry = new ServiceRegistry();
    await registry.register(makeService("data"));

    const pricing = await registry.getPricing("svc-data", "/api/v1/forecast");
    expect(pricing).not.toBeNull();
    expect(pricing!.amount_per_request).toBe(100n);
  });

  it("getPricing matches exact route", async () => {
    const registry = new ServiceRegistry();
    await registry.register(makeService("data"));

    const pricing = await registry.getPricing("svc-data", "/api/v2/premium");
    expect(pricing).not.toBeNull();
    expect(pricing!.amount_per_request).toBe(500n);
  });

  it("getPricing returns null for unmatched path", async () => {
    const registry = new ServiceRegistry();
    await registry.register(makeService("data"));

    const pricing = await registry.getPricing("svc-data", "/health");
    expect(pricing).toBeNull();
  });

  it("getPricing returns null for unknown service", async () => {
    const registry = new ServiceRegistry();
    const pricing = await registry.getPricing("svc-unknown", "/api/v1/test");
    expect(pricing).toBeNull();
  });
});
