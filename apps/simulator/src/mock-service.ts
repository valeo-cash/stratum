import Fastify from "fastify";

const server = Fastify({ logger: false });

server.all("/*", async (request, reply) => {
  const delay = 100 + Math.random() * 100;
  await new Promise((r) => setTimeout(r, delay));

  const data = {
    id: Math.floor(Math.random() * 100_000),
    title: "Mock API response",
    source: "mock-service",
    latency: `${Math.round(delay)}ms`,
    timestamp: new Date().toISOString(),
  };

  console.log(`[mock-service] ${request.method} ${request.url} → 200 (${Math.round(delay)}ms)`);
  return reply.send(data);
});

server.listen({ port: 3300, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error("[mock-service] Failed to start:", err.message);
    process.exit(1);
  }
  console.log("[mock-service] Listening on http://0.0.0.0:3300");
});
