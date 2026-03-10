import Redis from "ioredis";

let redisClient: Redis | null = null;

const redisUrl = process.env.REDIS_URL;

if (redisUrl) {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 500, 10_000);
      return delay;
    },
    lazyConnect: true,
  });

  redisClient.connect().then(() => {
    const { host, port } = redisClient!.options;
    console.log(`[redis] Connected to ${host}:${port}`);
  }).catch((err) => {
    console.error("[redis] Connection failed:", err.message);
  });

  redisClient.on("error", (err) => {
    console.error("[redis] Error:", err.message);
  });

  redisClient.on("reconnecting", () => {
    console.log("[redis] Reconnecting...");
  });
} else {
  console.log("[redis] REDIS_URL not configured — using in-memory store");
}

export function getRedisClient(): Redis | null {
  return redisClient;
}

export function isRedisConnected(): boolean {
  return redisClient?.status === "ready";
}
