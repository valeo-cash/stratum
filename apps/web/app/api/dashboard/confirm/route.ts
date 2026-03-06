import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  "http://localhost:3100";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, batchId, txHashes, chain } = body as {
      key?: string;
      batchId?: string;
      txHashes?: string[];
      chain?: string;
    };

    if (!key || !batchId || !txHashes) {
      return NextResponse.json(
        { error: "Missing required fields: key, batchId, txHashes" },
        { status: 400 },
      );
    }

    const res = await fetch(
      `${GATEWAY_URL}/v1/settle/batches/${batchId}/confirm`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": key,
        },
        body: JSON.stringify({ txHashes, chain: chain ?? "solana" }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      return NextResponse.json(
        { error: err?.error || "Confirm failed" },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Gateway unreachable" }, { status: 502 });
  }
}
