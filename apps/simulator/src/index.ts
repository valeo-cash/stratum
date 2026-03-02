import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { StratumAgent, toBase58 } from "@valeo/stratum-agent";

ed.hashes.sha512 = sha512;

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3100";
const AGENT_COUNT = parseInt(process.env.AGENT_COUNT || "10", 10);
const RPS = parseInt(process.env.RPS || "5", 10);
const DURATION_SEC = parseInt(process.env.DURATION || "60", 10);
const SERVICE_SLUG = "mock-api";
const SERVICE_TARGET = "http://localhost:3300";

interface SimAgent {
  agent: StratumAgent;
  address: string;
}

async function generateAgents(n: number): Promise<SimAgent[]> {
  const agents: SimAgent[] = [];
  for (let i = 0; i < n; i++) {
    const privateKey = ed.utils.randomSecretKey();
    const agent = new StratumAgent(privateKey);
    agents.push({ agent, address: agent.getAddress() });
  }
  return agents;
}

async function registerService() {
  const serviceWalletKey = ed.utils.randomSecretKey();
  const serviceWalletPub = ed.getPublicKey(serviceWalletKey);
  const walletAddress = toBase58(serviceWalletPub);

  try {
    const res = await fetch(`${GATEWAY_URL}/admin/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Mock API",
        targetUrl: SERVICE_TARGET,
        slug: SERVICE_SLUG,
        pricePerRequest: 0.001,
        walletAddress,
      }),
    });
    const data = await res.json();
    if (res.status === 201 || res.status === 200) {
      console.log(`  Service registered: ${SERVICE_SLUG} (wallet: ${walletAddress.slice(0, 8)}...)`);
    } else if (res.status === 409) {
      console.log(`  Service already registered: ${SERVICE_SLUG}`);
    } else {
      console.log(`  Service registration: ${res.status}`, data);
    }
  } catch (e: any) {
    console.error(`  Cannot reach Gateway at ${GATEWAY_URL}: ${e.message}`);
    process.exit(1);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log();
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     Stratum Simulator v0.2 (Ed25519)     ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log();
  console.log(`  Gateway:    ${GATEWAY_URL}`);
  console.log(`  Agents:     ${AGENT_COUNT} (real Ed25519 keypairs)`);
  console.log(`  RPS:        ${RPS}`);
  console.log(`  Duration:   ${DURATION_SEC}s`);
  console.log();

  const agents = await generateAgents(AGENT_COUNT);
  console.log(`  Generated ${agents.length} agent keypairs`);
  for (const a of agents.slice(0, 3)) {
    console.log(`    ${a.address.slice(0, 12)}...`);
  }
  if (agents.length > 3) console.log(`    ... and ${agents.length - 3} more`);
  console.log();

  await registerService();
  console.log();
  console.log("  Starting traffic...");
  console.log();

  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  let totalLatency = 0;
  let totalVolume = 0;

  const interval = 1000 / RPS;
  const deadline = Date.now() + DURATION_SEC * 1000;

  while (Date.now() < deadline) {
    const { agent, address } = agents[Math.floor(Math.random() * agents.length)];
    totalRequests++;

    const start = Date.now();

    try {
      const url = `${GATEWAY_URL}/s/${SERVICE_SLUG}/data`;
      const res = await agent.fetch(url);
      const latency = Date.now() - start;

      if (res.status === 200) {
        successfulRequests++;
        totalLatency += latency;
        const receiptHash = res.headers.get("x-stratum-receipt") || "—";
        totalVolume += 0.001;
        console.log(
          `  ✓ ${address.slice(0, 10)}... | $0.0010 | ${latency}ms | receipt: ${receiptHash.slice(0, 16)}...`,
        );
      } else {
        failedRequests++;
        console.log(
          `  ✗ ${address.slice(0, 10)}... | status ${res.status} | ${latency}ms`,
        );
      }
    } catch (e: any) {
      failedRequests++;
      console.log(
        `  ✗ ${address.slice(0, 10)}... | error: ${e.message}`,
      );
    }

    await sleep(interval);
  }

  console.log();
  console.log("╔══════════════════════════════════════════╗");
  console.log("║              Summary                     ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log();
  console.log(`  Total requests:      ${totalRequests}`);
  console.log(`  Successful:          ${successfulRequests}`);
  console.log(`  Failed:              ${failedRequests}`);
  console.log(`  Total volume:        $${totalVolume.toFixed(4)}`);
  console.log(`  Avg latency:         ${successfulRequests > 0 ? Math.round(totalLatency / successfulRequests) : 0}ms`);
  console.log(`  Success rate:        ${totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) : 0}%`);
  console.log(`  Receipts collected:  ${agents.reduce((s, a) => s + a.agent.getReceipts().length, 0)}`);
  console.log(`  Crypto:              Ed25519 (real signatures)`);
  console.log();
}

main().catch((e) => {
  console.error("[simulator] Fatal error:", e.message);
  process.exit(1);
});
