export const dynamic = "force-dynamic";

const GATEWAY_URL =
  process.env.GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  "http://localhost:3100";

async function fetchReceipts(limit: number) {
  try {
    const res = await fetch(`${GATEWAY_URL}/v1/receipts?limit=${limit}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function GET() {
  const encoder = new TextEncoder();
  let lastSeenId = "";

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      function cleanup() {
        clearInterval(interval);
        clearTimeout(timeout);
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {}
        }
      }

      controller.enqueue(encoder.encode(": connected\n\n"));

      const interval = setInterval(async () => {
        if (closed) return;
        try {
          const receipts = await fetchReceipts(10);
          if (!Array.isArray(receipts) || receipts.length === 0) return;

          const newReceipts = lastSeenId
            ? receipts.filter(
                (r: any) => r.id !== lastSeenId && r.receiptHash !== lastSeenId,
              )
            : receipts.slice(0, 3);

          if (newReceipts.length > 0) {
            lastSeenId =
              newReceipts[0].receiptHash || newReceipts[0].id || "";
          }

          for (const r of newReceipts.reverse()) {
            const feedItem = {
              id: r.receiptHash || r.id || Math.random().toString(36).slice(2),
              timestamp: r.timestamp || new Date().toISOString(),
              payerAddress: r.payer || r.payerAddress || "unknown",
              amount: typeof r.amount === "number" ? r.amount : Number(r.amount) || 0,
              route: r.resource || r.resourcePath || "/api",
              service: r.asset || "USDC",
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(feedItem)}\n\n`),
            );
          }
        } catch {
          // Gateway unreachable — skip this tick
        }
      }, 2000);

      const timeout = setTimeout(cleanup, 5 * 60 * 1000);
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
