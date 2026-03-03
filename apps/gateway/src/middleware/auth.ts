import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { validateApiKey } from "../auth";

declare module "fastify" {
  interface FastifyRequest {
    apiKeyRole: string;
    apiKeyServiceSlug: string | null;
    apiKeyRateLimit: number;
    apiKeyId: string | null;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest("apiKeyRole", "");
  fastify.decorateRequest("apiKeyServiceSlug", null);
  fastify.decorateRequest("apiKeyRateLimit", 100);
  fastify.decorateRequest("apiKeyId", null);

  fastify.addHook("onRequest", async (request: FastifyRequest, _reply: FastifyReply) => {
    const requireKeys = process.env.REQUIRE_API_KEYS === "true";

    if (!requireKeys) {
      request.apiKeyRole = "admin";
      request.apiKeyServiceSlug = null;
      request.apiKeyRateLimit = 10000;
      request.apiKeyId = "__dev__";
      return;
    }

    const raw =
      (request.headers["x-api-key"] as string) ||
      extractBearer(request.headers.authorization);

    if (!raw) {
      request.apiKeyRole = "";
      request.apiKeyRateLimit = 100;
      return;
    }

    const result = await validateApiKey(raw);
    request.apiKeyRole = result.valid ? result.role : "";
    request.apiKeyServiceSlug = result.serviceSlug ?? null;
    request.apiKeyRateLimit = result.rateLimit;
    request.apiKeyId = result.valid ? raw : null;
  });
}

function extractBearer(header?: string): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const requireKeys = process.env.REQUIRE_API_KEYS === "true";
    if (!requireKeys) return;

    if (!request.apiKeyRole) {
      return reply.status(401).send({ error: "API key required. Provide X-API-KEY header or Authorization: Bearer <key>." });
    }

    if (!roles.includes(request.apiKeyRole)) {
      return reply.status(403).send({
        error: `Insufficient permissions. Required role: ${roles.join(" or ")}. Your role: ${request.apiKeyRole}.`,
      });
    }
  };
}

export default fp(authPlugin, { name: "stratum-auth" });
