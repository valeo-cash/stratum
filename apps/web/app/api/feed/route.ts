export const dynamic = "force-dynamic";

const agents = Array.from({ length: 20 }, () => {
  const hex = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) addr += hex[Math.floor(Math.random() * 16)];
  return addr;
});

const services = [
  { slug: "gpt4-proxy", name: "GPT-4 Proxy" },
  { slug: "sd-api", name: "Stable Diffusion API" },
  { slug: "whisper", name: "Whisper Transcription" },
];

const routes = ["/v1/chat", "/v1/generate", "/v1/transcribe"];

function mockReceipt() {
  const svc = services[Math.floor(Math.random() * services.length)];
  const amount = 0.001 + Math.random() * 0.049;
  return {
    id: Math.random().toString(36).slice(2, 10),
    timestamp: new Date().toISOString(),
    payerAddress: agents[Math.floor(Math.random() * agents.length)],
    payeeAddress: agents[Math.floor(Math.random() * agents.length)],
    amount: Math.round(amount * 1e6) / 1e6,
    asset: "USDC",
    route: `/${svc.slug}${routes[Math.floor(Math.random() * routes.length)]}`,
    service: svc.name,
  };
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      function cleanup() {
        clearInterval(interval);
        clearTimeout(timeout);
        if (!closed) {
          closed = true;
          try { controller.close(); } catch {}
        }
      }

      const interval = setInterval(() => {
        if (closed) return;
        try {
          const receipt = mockReceipt();
          const data = `data: ${JSON.stringify(receipt)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          cleanup();
        }
      }, 500);

      const timeout = setTimeout(cleanup, 5 * 60 * 1000);

      controller.enqueue(encoder.encode(": connected\n\n"));
    },
    cancel() {
      // Client disconnected — no action needed, GC cleans up
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
