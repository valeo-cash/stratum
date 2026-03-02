import type { ServiceRegistration, RoutePricing } from "@valeo/stratum-core";

/**
 * In-memory service registry. Services register their API here,
 * and the proxy handler looks them up by slug.
 */
export class ServiceRegistry {
  private services = new Map<string, ServiceRegistration>();

  /** Register a service. Returns the slug and Stratum endpoint. */
  async register(
    service: ServiceRegistration,
  ): Promise<{ slug: string; endpoint: string }> {
    this.services.set(service.stratum_slug, service);
    return {
      slug: service.stratum_slug,
      endpoint: `https://gateway.stratum.valeo.com/${service.stratum_slug}`,
    };
  }

  /** Look up a service by its Stratum slug. */
  async getBySlug(slug: string): Promise<ServiceRegistration | null> {
    return this.services.get(slug) ?? null;
  }

  /**
   * Get pricing for a specific route within a service.
   * Matches by path prefix (v1 simple matching).
   */
  async getPricing(
    serviceId: string,
    path: string,
  ): Promise<RoutePricing | null> {
    for (const svc of this.services.values()) {
      if ((svc.service_id as string) !== serviceId) continue;
      for (const pricing of svc.pricing) {
        if (matchRoute(pricing.path_pattern, path)) {
          return pricing;
        }
      }
    }
    return null;
  }
}

/** Simple glob matching: supports trailing wildcards and exact match. */
function matchRoute(pattern: string, path: string): boolean {
  if (pattern === "*" || pattern === "/**") return true;
  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3);
    return path === prefix || path.startsWith(prefix + "/");
  }
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return path.startsWith(prefix + "/") && !path.slice(prefix.length + 1).includes("/");
  }
  return path === pattern;
}
