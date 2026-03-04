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

const isRemote =
  process.argv.includes("--direct") ||
  (!GATEWAY_URL.includes("localhost") && !GATEWAY_URL.includes("127.0.0.1"));

interface SimAgent {
  agent: StratumAgent;
  address: string;
  privateKey: Uint8Array;
}

async function generateAgents(n: number): Promise<SimAgent[]> {
  const agents: SimAgent[] = [];
  for (let i = 0; i < n; i++) {
    const privateKey = ed.utils.randomSecretKey();
    const agent = new StratumAgent(privateKey);
    agents.push({ agent, address: agent.getAddress(), privateKey });
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
      return walletAddress;
    } else if (res.status === 409) {
      console.log(`  Service already registered: ${SERVICE_SLUG}`);
      return walletAddress;
    } else {
      console.log(`  Service registration: ${res.status}`, data);
      return walletAddress;
    }
  } catch (e: any) {
    console.error(`  Cannot reach Gateway at ${GATEWAY_URL}: ${e.message}`);
    process.exit(1);
  }
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
): Promise<{ signature: string; nonce: string }> {
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

  return { signature: toHex(sig), nonce };
}

async function sendDirectReceipt(
  agent: SimAgent,
  payee: string,
  amount: string,
): Promise<{ status: number; receiptHash?: string; latency: number }> {
  const start = Date.now();
  const { signature, nonce } = await signPaymentDirect(
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
  console.log("║     Stratum Simulator v0.3 (Ed25519)     ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log();
  console.log(`  Gateway:    ${GATEWAY_URL}`);
  console.log(`  Mode:       ${isRemote ? "DIRECT (POST /v1/receipt)" : "PROXY (GET /s/service/...)"}`);
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

  const serviceWallet = await registerService();
  console.log();
  console.log("  Starting traffic...");
  console.log();

  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  let totalLatency = 0;
  let totalVolume = 0;
  const pricePerRequest = 0.001;
  const priceInMicro = Math.round(pricePerRequest * 1_000_000).toString();

  const interval = 1000 / RPS;
  const deadline = Date.now() + DURATION_SEC * 1000;

  while (Date.now() < deadline) {
    const simAgent = agents[Math.floor(Math.random() * agents.length)];
    totalRequests++;

    try {
      if (isRemote) {
        const result = await sendDirectReceipt(simAgent, serviceWallet!, priceInMicro);
        if (result.status === 201) {
          successfulRequests++;
          totalLatency += result.latency;
          totalVolume += pricePerRequest;
          console.log(
            `  ✓ ${simAgent.address.slice(0, 10)}... | $${pricePerRequest.toFixed(4)} | ${result.latency}ms | receipt: ${result.receiptHash?.slice(0, 16)}...`,
          );
        } else {
          failedRequests++;
          console.log(
            `  ✗ ${simAgent.address.slice(0, 10)}... | status ${result.status} | ${result.latency}ms`,
          );
        }
      } else {
        const start = Date.now();
        const url = `${GATEWAY_URL}/s/${SERVICE_SLUG}/data`;
        const res = await simAgent.agent.fetch(url);
        const latency = Date.now() - start;

        if (res.status === 200) {
          successfulRequests++;
          totalLatency += latency;
          const receiptHash = res.headers.get("x-stratum-receipt") || "—";
          totalVolume += pricePerRequest;
          console.log(
            `  ✓ ${simAgent.address.slice(0, 10)}... | $${pricePerRequest.toFixed(4)} | ${latency}ms | receipt: ${receiptHash.slice(0, 16)}...`,
          );
        } else {
          failedRequests++;
          console.log(
            `  ✗ ${simAgent.address.slice(0, 10)}... | status ${res.status} | ${latency}ms`,
          );
        }
      }
    } catch (e: any) {
      failedRequests++;
      console.log(
        `  ✗ ${simAgent.address.slice(0, 10)}... | error: ${e.message}`,
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
