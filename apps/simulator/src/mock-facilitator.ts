import Fastify from "fastify";

const server = Fastify({ logger: false });

let batchCounter = 0;

server.post("/settle", async (request, reply) => {
  batchCounter++;
  const batchId = `batch-${batchCounter}`;
  const body = request.body as any;

  console.log(`[mock-facilitator] POST /settle → batch ${batchId}`);
  console.log(`  transfers: ${body?.transfers?.length ?? "?"}`);
  console.log(`  total volume: $${body?.totalVolume ?? "?"}`);

  return reply.code(200).send({
    status: "accepted",
    batchId,
    timestamp: new Date().toISOString(),
  });
});

server.get("/status/:batchId", async (request) => {
  const { batchId } = request.params as any;
  console.log(`[mock-facilitator] GET /status/${batchId} → settled`);
  return { status: "settled", batchId, settledAt: new Date().toISOString() };
});

server.listen({ port: 3200, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error("[mock-facilitator] Failed to start:", err.message);
    process.exit(1);
  }
  console.log("[mock-facilitator] Listening on http://0.0.0.0:3200");
});
