import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  "http://localhost:3100";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role } = body as {
      name?: string;
      email?: string;
      role?: string;
    };

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Company / project name is required" },
        { status: 400 },
      );
    }

    if (
      !email ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 },
      );
    }

    const resolvedRole =
      role === "facilitator" ? "facilitator" : "provider";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (process.env.GATEWAY_API_KEY) {
      headers["X-API-KEY"] = process.env.GATEWAY_API_KEY;
    }

    const gwRes = await fetch(`${GATEWAY_URL}/admin/api-keys`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `${name.trim()} (${email.trim()})`,
        role: resolvedRole,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!gwRes.ok) {
      const err = await gwRes.json().catch(() => null);
      return NextResponse.json(
        { error: err?.error || "Failed to generate API key" },
        { status: gwRes.status },
      );
    }

    const data = await gwRes.json();
    return NextResponse.json({ key: data.key, role: data.role });
  } catch {
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
