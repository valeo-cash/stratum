import Fastify from "fastify";
import cors from "@fastify/cors";
import authPlugin from "./middleware/auth";
import rateLimitPlugin from "./middleware/rateLimit";
import adminRoutes from "./routes/admin";
import proxyRoutes from "./routes/proxy";
import clearingRoutes from "./routes/clearing";
import facilitatorRoutes from "./routes/facilitator";
import { initGatewayKeypair } from "./crypto";
import {
  startSettlementLoop,
  stopSettlementLoop,
  getCurrentWindowInfo,
  getLastSettlementTime,
  persistCurrentWindow,
} from "./settlement";
import { loadServicesFromDb } from "./registry";
import { retryPendingWindows, getPendingRetryCount } from "./retry-queue";
import { prisma } from "./db";
import { Connection } from "@solana/web3.js";

const server = Fastify({ logger: true });

server.get("/", async () => {
  return { service: "Stratum Gateway", status: "ok", version: "0.4.0" };
});

server.get("/health", async () => {
  const windowInfo = getCurrentWindowInfo();
  const lastSettlement = getLastSettlementTime();

  let solanaStatus: "connected" | "disconnected" = "disconnected";
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (rpcUrl) {
    try {
      const conn = new Connection(rpcUrl, "confirmed");
      await Promise.race([
        conn.getSlot(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      solanaStatus = "connected";
    } catch {
      solanaStatus = "disconnected";
    }
  }

  let dbStatus: "connected" | "disconnected" = "disconnected";
  try {
    await Promise.race([
      prisma.$queryRawUnsafe("SELECT 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }

  return {
    status: "ok",
    uptime: Math.floor(process.uptime()),
    currentWindow: windowInfo.windowId,
    receiptCount: windowInfo.receiptCount,
    lastSettlement: lastSettlement?.toISOString() ?? null,
    pendingRetries: getPendingRetryCount(),
    solana: solanaStatus,
    database: dbStatus,
  };
});

const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:*")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

server.register(cors, {
  origin: corsOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-KEY", "X-PAYMENT"],
  exposedHeaders: ["X-STRATUM-RECEIPT"],
});

server.register(authPlugin);
server.register(rateLimitPlugin);
server.register(adminRoutes);
server.register(proxyRoutes);
server.register(clearingRoutes);
server.register(facilitatorRoutes);

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[gateway] Received ${signal}, shutting down gracefully...`);

  stopSettlementLoop();

  await persistCurrentWindow();

  try {
    await server.close();
    console.log("[gateway] HTTP server closed");
  } catch (e: any) {
    console.error("[gateway] Error closing server:", e.message);
  }

  console.log("[gateway] Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

const start = async () => {
  try {
    await initGatewayKeypair();
    await loadServicesFromDb();
    await retryPendingWindows();
    startSettlementLoop();
    await server.listen({ port: 3100, host: "0.0.0.0" });
    console.log("Gateway listening on http://0.0.0.0:3100");
    console.log(`API key auth: ${process.env.REQUIRE_API_KEYS === "true" ? "ENABLED" : "DISABLED (dev mode)"}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
