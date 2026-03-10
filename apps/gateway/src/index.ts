import Fastify from "fastify";
import cors from "@fastify/cors";
import authPlugin from "./middleware/auth";
import rateLimitPlugin from "./middleware/rateLimit";
import adminRoutes from "./routes/admin";
import proxyRoutes from "./routes/proxy";
import clearingRoutes from "./routes/clearing";
import facilitatorRoutes from "./routes/facilitator";
import settleIntakeRoutes from "./routes/settle-intake";
import { initGatewayKeypair } from "./crypto";
import {
  startSettlementLoop,
  stopSettlementLoop,
  getCurrentWindowInfo,
  getLastSettlementTime,
  persistCurrentWindow,
  INSTANCE_ID,
} from "./settlement";
import { loadServicesFromDb } from "./registry";
import { retryPendingWindows, getPendingRetryCount } from "./retry-queue";
import { prisma } from "./db";
import { Connection } from "@solana/web3.js";
import { getTeeStatus } from "./tee";
import { getReceiptStoreInstance } from "./receipt-store";
import { isRedisConnected } from "./redis";
import { startBalanceMonitor, stopBalanceMonitor, getSettlementBalance } from "./balance-monitor";
import { startReconciler, stopReconciler } from "./reconciler";

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

  const teeStatus = await getTeeStatus();

  const store = getReceiptStoreInstance();

  return {
    status: "ok",
    uptime: Math.floor(process.uptime()),
    currentWindow: windowInfo.windowId,
    receiptCount: windowInfo.receiptCount,
    lastSettlement: lastSettlement?.toISOString() ?? null,
    pendingRetries: getPendingRetryCount(),
    solana: solanaStatus,
    database: dbStatus,
    tee: teeStatus.enabled,
    teeProvider: teeStatus.provider,
    receiptStore: store.backend,
    redisConnected: store.backend === "redis" ? isRedisConnected() : undefined,
    settlementBalance: getSettlementBalance(),
    limits: {
      windowMax: (Number(BigInt(process.env.MAX_WINDOW_VOLUME || "10000000000")) / 1_000_000).toString(),
      dailyMax: (Number(BigInt(process.env.MAX_DAILY_VOLUME_PER_KEY || "50000000000")) / 1_000_000).toString(),
      singleMax: (Number(BigInt(process.env.MAX_SINGLE_TRANSFER || "1000000000")) / 1_000_000).toString(),
    },
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
server.register(settleIntakeRoutes);

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[gateway] Received ${signal}, shutting down gracefully...`);

  stopSettlementLoop();
  stopBalanceMonitor();
  stopReconciler();

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

async function recoverOrphanedPayments() {
  try {
    const orphaned = await prisma.intakePayment.findMany({
      where: { status: { in: ["queued", "batched"] } },
    });

    if (orphaned.length === 0) return;

    console.log(`[recovery] Found ${orphaned.length} orphaned payments from previous session`);

    const windowInfo = getCurrentWindowInfo();

    const updated = await prisma.intakePayment.updateMany({
      where: { status: { in: ["queued", "batched"] } },
      data: { status: "queued", windowId: windowInfo.windowId, batchId: null },
    });

    console.log(`[recovery] Re-queued ${updated.count} payments into window ${windowInfo.windowId}`);
  } catch (err: any) {
    console.error("[recovery] Failed to recover orphaned payments:", err.message);
  }
}

const start = async () => {
  try {
    await initGatewayKeypair();
    await loadServicesFromDb();
    await retryPendingWindows();
    await recoverOrphanedPayments();
    startSettlementLoop();
    startBalanceMonitor();
    startReconciler();

    if (process.env.ENABLE_SIMULATOR === "true") {
      const { startSimulator } = await import("./simulator");
      startSimulator();
    }

    console.log(`[gateway] Instance ID: ${INSTANCE_ID}`);

    const port = parseInt(process.env.PORT || "3100", 10);
    const host = process.env.HOST || "0.0.0.0";
    await server.listen({ port, host });
    console.log(`Gateway listening on http://${host}:${port}`);
    console.log(`API key auth: ${process.env.REQUIRE_API_KEYS === "true" ? "ENABLED" : "DISABLED (dev mode)"}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
