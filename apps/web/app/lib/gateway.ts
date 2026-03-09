const BASE = process.env.GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3100";

async function gw<T = any>(path: string): Promise<T | null> {
  try {
    const headers: Record<string, string> = {};
    if (process.env.GATEWAY_API_KEY) {
      headers["X-API-KEY"] = process.env.GATEWAY_API_KEY;
    }
    const res = await fetch(`${BASE}${path}`, { cache: "no-store", headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface GatewayStats {
  totalReceipts: number;
  totalVolume: string;
  totalVolumeUSDC: number;
  activeServices: number;
  windowsFinalized: number;
  currentWindow: {
    windowId: string;
    state: string;
    receiptCount: number;
    grossVolume: number;
    openedAt: string;
  } | null;
  recentWindows: {
    id: string;
    receiptCount: number;
    merkleRoot: string;
    anchorTxHash: string | null;
  }[];
}

export interface GatewayService {
  name: string;
  slug: string;
  targetUrl: string;
  pricePerRequest: number;
  walletAddress: string;
  chains: string[];
  wallets: Record<string, string>;
  createdAt: string;
}

export async function getStats() {
  return gw<GatewayStats>("/admin/stats");
}

export interface AnalyticsData {
  protocol: string;
  totalGrossReceipts: number;
  totalGrossVolume: string;
  totalGrossVolumeUSDC: number;
  totalNetTransfers: number;
  compressionRatio: number;
  windowsFinalized: number;
  activeServices: number;
  chains: string[];
  last24h: {
    grossReceipts: number;
    grossVolume: string;
    grossVolumeUSDC: number;
    netTransfers: number;
    compression: number;
  };
  services: {
    slug: string;
    name: string;
    grossReceipts: number;
    grossVolume: string;
    grossVolumeUSDC: number;
  }[];
  updatedAt: string;
}

export async function getAnalytics() {
  return gw<AnalyticsData>("/v1/analytics");
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
  return gw<GatewayService[]>("/admin/services");
}

export async function getService(slug: string) {
  return gw<GatewayService>(`/admin/services/${encodeURIComponent(slug)}`);
}
