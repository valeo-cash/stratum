const BASE = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3100";

async function gw(path: string) {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getStatus() {
  return gw("/v1/status");
}

export async function getReceipt(id: string) {
  return gw(`/v1/receipt/${encodeURIComponent(id)}`);
}

export async function getReceipts(query?: { windowId?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (query?.windowId) params.set("windowId", query.windowId);
  if (query?.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return gw(`/v1/receipts${qs ? `?${qs}` : ""}`);
}

export async function getWindow() {
  return gw("/v1/window");
}

export async function getWindowById(id: string) {
  return gw(`/v1/window/${encodeURIComponent(id)}`);
}

export async function getServices() {
  return gw("/admin/services");
}
