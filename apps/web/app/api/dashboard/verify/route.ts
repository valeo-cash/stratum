import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  "http://localhost:3100";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ valid: false, error: "Missing key" }, { status: 400 });
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/v1/settle/pending`, {
      headers: { "X-API-KEY": key },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      return NextResponse.json({ valid: true, role: "facilitator" });
    }

    return NextResponse.json({ valid: false });
  } catch {
    return NextResponse.json({ valid: false, error: "Gateway unreachable" }, { status: 502 });
  }
}
