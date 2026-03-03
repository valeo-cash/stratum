import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function randomHex(len: number) {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * 16)];
  return out;
}

function randomAddr() {
  return "0x" + randomHex(40);
}

async function main() {
  await prisma.receiptRecord.deleteMany();
  await prisma.windowRecord.deleteMany();
  await prisma.service.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: "demo@stratum.valeo.com",
      name: "Demo User",
      walletAddress: randomAddr(),
      emailVerified: new Date(),
    },
  });

  const services = await Promise.all([
    prisma.service.create({
      data: {
        userId: user.id,
        name: "GPT-4 Proxy",
        targetUrl: "https://api.openai.com/v1/chat/completions",
        stratumSlug: "gpt4-proxy",
        pricePerReq: 0.003,
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        userId: user.id,
        name: "Stable Diffusion API",
        targetUrl: "https://api.stability.ai/v1/generation",
        stratumSlug: "sd-api",
        pricePerReq: 0.015,
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        userId: user.id,
        name: "Whisper Transcription",
        targetUrl: "https://api.openai.com/v1/audio/transcriptions",
        stratumSlug: "whisper",
        pricePerReq: 0.006,
        isActive: false,
      },
    }),
  ]);

  const now = Date.now();
  const HOUR = 3600_000;
  const windowData = [
    { windowId: "win-001", state: "FINALIZED", hourOffset: -96 },
    { windowId: "win-002", state: "FINALIZED", hourOffset: -72 },
    { windowId: "win-003", state: "FINALIZED", hourOffset: -48 },
    { windowId: "win-004", state: "FINALIZED", hourOffset: -24 },
    { windowId: "win-005", state: "OPEN", hourOffset: 0 },
  ];

  const windows = [];
  for (const wd of windowData) {
    const openedAt = new Date(now + wd.hourOffset * HOUR);
    const isFinal = wd.state === "FINALIZED";
    const w = await prisma.windowRecord.create({
      data: {
        windowId: wd.windowId,
        state: wd.state,
        openedAt,
        closedAt: isFinal ? new Date(openedAt.getTime() + 24 * HOUR) : undefined,
        finalizedAt: isFinal ? new Date(openedAt.getTime() + 24 * HOUR + 300_000) : undefined,
        merkleRoot: isFinal ? "0x" + randomHex(64) : undefined,
        anchorTxHash: isFinal ? "0x" + randomHex(64) : undefined,
        anchorChain: isFinal ? "solana" : undefined,
        facilitatorId: isFinal ? "coinbase-facilitator" : undefined,
      },
    });
    windows.push(w);
  }

  const payers = Array.from({ length: 20 }, () => randomAddr());
  let totalReceipts = 0;

  for (const window of windows) {
    const count = window.state === "OPEN" ? 80 + Math.floor(Math.random() * 40) : 180 + Math.floor(Math.random() * 60);
    let grossVol = 0;

    for (let seq = 0; seq < count; seq++) {
      const svc = services[Math.floor(Math.random() * services.length)];
      const amount = svc.pricePerReq * (0.8 + Math.random() * 0.4);
      grossVol += amount;

      await prisma.receiptRecord.create({
        data: {
          serviceId: svc.id,
          windowId: window.windowId,
          sequence: seq,
          payerAddress: payers[Math.floor(Math.random() * payers.length)],
          payeeAddress: user.walletAddress!,
          amount: Math.round(amount * 1e6) / 1e6,
          resourcePath: `/${svc.stratumSlug}/v1/${["chat", "generate", "transcribe"][Math.floor(Math.random() * 3)]}`,
          idempotencyKey: `${window.windowId}-${svc.id}-${seq}`,
          receiptHash: "0x" + randomHex(64),
          createdAt: new Date(
            window.openedAt.getTime() + (seq / count) * 24 * HOUR * (window.state === "OPEN" ? 0.3 : 1)
          ),
        },
      });
      totalReceipts++;
    }

    const netVol = grossVol * (0.2 + Math.random() * 0.15);
    const transfers = 15 + Math.floor(Math.random() * 20);
    await prisma.windowRecord.update({
      where: { id: window.id },
      data: {
        receiptCount: count,
        grossVolume: Math.round(grossVol * 100) / 100,
        netVolume: window.state === "FINALIZED" ? Math.round(netVol * 100) / 100 : undefined,
        transferCount: window.state === "FINALIZED" ? transfers : undefined,
        compressionRatio: window.state === "FINALIZED"
          ? Math.round((count / transfers) * 100) / 100
          : undefined,
      },
    });
  }

  console.log(`Seeded: 1 user, ${services.length} services, ${windows.length} windows, ${totalReceipts} receipts`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
