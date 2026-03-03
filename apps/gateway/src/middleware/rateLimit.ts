import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const DEFAULT_UNAUTH_LIMIT = 100;
const DEFAULT_AUTH_LIMIT = 1000;
const WINDOW_MS = 60_000;
const CLEANUP_INTERVAL_MS = 5 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS);

async function rateLimitPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const identifier = request.apiKeyId || request.ip;
    const limit = request.apiKeyId
      ? (request.apiKeyRateLimit || DEFAULT_AUTH_LIMIT)
      : DEFAULT_UNAUTH_LIMIT;

    const now = Date.now();
    let bucket = buckets.get(identifier);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + WINDOW_MS };
      buckets.set(identifier, bucket);
    }

    bucket.count++;

    reply.header("X-RateLimit-Limit", limit);
    reply.header("X-RateLimit-Remaining", Math.max(0, limit - bucket.count));
    reply.header("X-RateLimit-Reset", Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      reply.header("Retry-After", retryAfter);
      return reply.status(429).send({
        error: "Rate limit exceeded",
        limit,
        retryAfterSeconds: retryAfter,
      });
    }
  });
}

export default fp(rateLimitPlugin, {
  name: "stratum-rate-limit",
  dependencies: ["stratum-auth"],
});
