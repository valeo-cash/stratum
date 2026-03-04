import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { StratumAgent, toBase58 } from "@valeo/stratum-agent";

ed.hashes.sha512 = sha512;

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3100";
const API_KEY = process.env.STRATUM_API_KEY || "";
const AGENT_COUNT = parseInt(process.env.AGENT_COUNT || "10", 10);
const RPS = parseInt(process.env.RPS || "5", 10);
const DURATION_SEC = parseInt(process.env.DURATION || "60", 10);

const isRemote =
  process.argv.includes("--direct") ||
  (!GATEWAY_URL.includes("localhost") && !GATEWAY_URL.includes("127.0.0.1"));

interface SimAgent {
  agent: StratumAgent;
  address: string;
  privateKey: Uint8Array;
}

interface SimService {
  slug: string;
  name: string;
  wallet: string;
  minPrice: number;
  maxPrice: number;
}

const SERVICE_DEFS = [
  { slug: "gpt4-proxy", name: "GPT-4 API Proxy", minPrice: 0.002, maxPrice: 0.01 },
  { slug: "sd-api", name: "Stable Diffusion API", minPrice: 0.005, maxPrice: 0.02 },
  { slug: "whisper-api", name: "Whisper Transcription", minPrice: 0.001, maxPrice: 0.005 },
];

async function generateAgents(n: number): Promise<SimAgent[]> {
  const agents: SimAgent[] = [];
  for (let i = 0; i < n; i++) {
    const privateKey = ed.utils.randomSecretKey();
    const agent = new StratumAgent(privateKey);
    agents.push({ agent, address: agent.getAddress(), privateKey });
  }
  return agents;
}

function gatewayHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", ...extra };
  if (API_KEY) h["X-API-KEY"] = API_KEY;
  return h;
}

async function registerServices(): Promise<SimService[]> {
  const services: SimService[] = [];

  for (const def of SERVICE_DEFS) {
    const walletKey = ed.utils.randomSecretKey();
    const walletPub = ed.getPublicKey(walletKey);
    const wallet = toBase58(walletPub);

    try {
      const res = await fetch(`${GATEWAY_URL}/admin/services`, {
        method: "POST",
        headers: gatewayHeaders(),
        body: JSON.stringify({
          name: def.name,
          targetUrl: "http://localhost:3300",
          slug: def.slug,
          pricePerRequest: def.minPrice,
          walletAddress: wallet,
        }),
      });
      const data = await res.json();
      if (res.status === 201 || res.status === 200) {
        console.log(`  Service registered: ${def.slug} (wallet: ${wallet.slice(0, 8)}...)`);
      } else if (res.status === 409) {
        console.log(`  Service already registered: ${def.slug}`);
      } else {
        console.log(`  Service registration ${def.slug}: ${res.status}`, data);
      }
    } catch (e: any) {
      console.error(`  Cannot reach Gateway at ${GATEWAY_URL}: ${e.message}`);
      process.exit(1);
    }

    services.push({ ...def, wallet });
  }

  return services;
}

function pickService(services: SimService[]): SimService {
  return services[Math.floor(Math.random() * services.length)];
}

function randomPrice(svc: SimService): number {
  return svc.minPrice + Math.random() * (svc.maxPrice - svc.minPrice);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signPaymentDirect(
  privateKey: Uint8Array,
  payer: string,
  payee: string,
  amount: string,
): Promise<{ signature: string; nonce: string; validUntil: string }> {
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const validUntil = String(Math.floor(Date.now() / 1000) + 60);

  const canonicalFields: Record<string, string> = {};
  for (const k of ["amount", "asset", "nonce", "payTo", "payer", "validUntil"].sort()) {
    const vals: Record<string, string> = { amount, asset: "USDC", nonce, payTo: payee, payer, validUntil };
    canonicalFields[k] = vals[k];
  }
  const canonical = JSON.stringify(canonicalFields);
  const messageBytes = new TextEncoder().encode(canonical);
  const sig = await ed.sign(messageBytes, privateKey);

  return { signature: toHex(sig), nonce, validUntil };
}

async function sendDirectReceipt(
  agent: SimAgent,
  payee: string,
  amount: string,
): Promise<{ status: number; receiptHash?: string; latency: number }> {
  const start = Date.now();
  const { signature, nonce, validUntil } = await signPaymentDirect(
    agent.privateKey,
    agent.address,
    payee,
    amount,
  );

  const res = await fetch(`${GATEWAY_URL}/v1/receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payer: agent.address,
      payee,
      amount,
      asset: "USDC",
      nonce,
      signature,
      validUntil,
      chain: "solana",
    }),
  });

  const latency = Date.now() - start;
  if (res.status === 201) {
    const data = await res.json();
    return { status: 201, receiptHash: data.receiptHash, latency };
  }
  return { status: res.status, latency };
}

async function main() {
  console.log();
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     Stratum Simulator v0.4 (Ed25519)     ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log();
  console.log(`  Gateway:    ${GATEWAY_URL}`);
  console.log(`  API Key:    ${API_KEY ? API_KEY.slice(0, 12) + "..." : "(none)"}`);
  console.log(`  Mode:       ${isRemote ? "DIRECT (POST /v1/receipt)" : "PROXY (GET /s/service/...)"}`);
  console.log(`  Agents:     ${AGENT_COUNT} (real Ed25519 keypairs)`);
  console.log(`  Services:   ${SERVICE_DEFS.map((s) => s.slug).join(", ")}`);
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

  const services = await registerServices();
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
    const simAgent = agents[Math.floor(Math.random() * agents.length)];
    const svc = pickService(services);
    const price = randomPrice(svc);
    const priceInMicro = Math.round(price * 1_000_000).toString();
    totalRequests++;

    try {
      if (isRemote) {
        const result = await sendDirectReceipt(simAgent, svc.wallet, priceInMicro);
        if (result.status === 201) {
          successfulRequests++;
          totalLatency += result.latency;
          totalVolume += price;
          console.log(
            `  ✓ ${simAgent.address.slice(0, 10)}... → ${svc.slug} | $${price.toFixed(4)} | ${result.latency}ms | receipt: ${result.receiptHash?.slice(0, 16)}...`,
          );
        } else {
          failedRequests++;
          console.log(
            `  ✗ ${simAgent.address.slice(0, 10)}... → ${svc.slug} | status ${result.status} | ${result.latency}ms`,
          );
        }
      } else {
        const start = Date.now();
        const url = `${GATEWAY_URL}/s/${svc.slug}/data`;
        const res = await simAgent.agent.fetch(url);
        const latency = Date.now() - start;

        if (res.status === 200) {
          successfulRequests++;
          totalLatency += latency;
          const receiptHash = res.headers.get("x-stratum-receipt") || "—";
          totalVolume += price;
          console.log(
            `  ✓ ${simAgent.address.slice(0, 10)}... → ${svc.slug} | $${price.toFixed(4)} | ${latency}ms | receipt: ${receiptHash.slice(0, 16)}...`,
          );
        } else {
          failedRequests++;
          console.log(
            `  ✗ ${simAgent.address.slice(0, 10)}... → ${svc.slug} | status ${res.status} | ${latency}ms`,
          );
        }
      }
    } catch (e: any) {
      failedRequests++;
      console.log(
        `  ✗ ${simAgent.address.slice(0, 10)}... → ${svc.slug} | error: ${e.message}`,
      );
    }

    await sleep(interval);
  }

  console.log();
  console.log("╔══════════════════════════════════════════╗");
  console.log("║              Summary                     ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log();
  console.log(`  Mode:                ${isRemote ? "DIRECT" : "PROXY"}`);
  console.log(`  Services:            ${services.map((s) => s.slug).join(", ")}`);
  console.log(`  Total requests:      ${totalRequests}`);
  console.log(`  Successful:          ${successfulRequests}`);
  console.log(`  Failed:              ${failedRequests}`);
  console.log(`  Total volume:        $${totalVolume.toFixed(4)}`);
  console.log(`  Avg latency:         ${successfulRequests > 0 ? Math.round(totalLatency / successfulRequests) : 0}ms`);
  console.log(`  Success rate:        ${totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) : 0}%`);
  console.log(`  Receipts collected:  ${isRemote ? successfulRequests : agents.reduce((s, a) => s + a.agent.getReceipts().length, 0)}`);
  console.log(`  Crypto:              Ed25519 (real signatures)`);
  console.log();
}

main().catch((e) => {
  console.error("[simulator] Fatal error:", e.message);
  process.exit(1);
});
