import Fastify from "fastify";
import adminRoutes from "./routes/admin";
import proxyRoutes from "./routes/proxy";
import clearingRoutes from "./routes/clearing";
import { initGatewayKeypair } from "./crypto";
import { startSettlementLoop } from "./settlement";
import { loadServicesFromDb } from "./registry";

const server = Fastify({ logger: true });

server.get("/", async () => {
  return { service: "Stratum Gateway", status: "ok", version: "0.2.0" };
});

server.get("/health", async () => {
  return { status: "healthy", timestamp: new Date().toISOString() };
});

server.register(adminRoutes);
server.register(proxyRoutes);
server.register(clearingRoutes);

const start = async () => {
  try {
    await initGatewayKeypair();
    await loadServicesFromDb();
    startSettlementLoop();
    await server.listen({ port: 3100, host: "0.0.0.0" });
    console.log("Gateway listening on http://0.0.0.0:3100");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
