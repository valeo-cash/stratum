import { existsSync } from "fs";
import http from "http";

const TAPPD_SOCK = "/var/run/tappd.sock";
const DSTACK_SOCK = "/var/run/dstack.sock";

function getSocketPath(): string | null {
  if (existsSync(TAPPD_SOCK)) return TAPPD_SOCK;
  if (existsSync(DSTACK_SOCK)) return DSTACK_SOCK;
  return null;
}

function getEndpoint(): { type: "socket"; path: string } | { type: "http"; host: string; port: number } | null {
  const sim = process.env.TAPPD_SIMULATOR_ENDPOINT;
  if (sim) {
    try {
      const u = new URL(sim);
      return { type: "http", host: u.hostname, port: parseInt(u.port || "8090", 10) };
    } catch { /* fall through */ }
  }
  const sock = getSocketPath();
  if (sock) return { type: "socket", path: sock };
  return null;
}

function doRequest(
  method: string,
  path: string,
  body?: string,
  contentType = "application/json",
  endpoint?: ReturnType<typeof getEndpoint>,
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const ep = endpoint ?? getEndpoint();
  if (!ep) return Promise.resolve({ status: 0, headers: {}, body: "no tappd endpoint" });

  return new Promise((resolve) => {
    const headers: Record<string, string> = {};
    if (body != null && body.length > 0) {
      headers["Content-Type"] = contentType;
      headers["Content-Length"] = String(Buffer.byteLength(body));
    }

    const opts: http.RequestOptions =
      ep.type === "socket"
        ? { socketPath: ep.path, path, method, headers }
        : { host: ep.host, port: ep.port, path, method, headers };

    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () =>
        resolve({
          status: res.statusCode ?? 0,
          headers: flatHeaders(res.headers),
          body: data,
        }),
      );
    });
    req.on("error", (err) => resolve({ status: 0, headers: {}, body: (err as Error).message }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ status: 0, headers: {}, body: "timeout" }); });
    if (body != null && body.length > 0) req.write(body);
    req.end();
  });
}

function flatHeaders(h: http.IncomingHttpHeaders): Record<string, string> {
  return Object.fromEntries(
    Object.entries(h).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v ?? ""]),
  );
}

export function isTeeAvailable(): boolean {
  if (process.env.TAPPD_SIMULATOR_ENDPOINT) return true;
  return existsSync(TAPPD_SOCK) || existsSync(DSTACK_SOCK);
}

export function getTeeStatus() {
  const enabled = isTeeAvailable();
  return {
    enabled,
    provider: enabled ? "phala-cloud" : "none",
    enclave: enabled ? "intel-tdx" : "none",
  };
}

export async function getTeeAttestation(reportData: string): Promise<any> {
  if (!isTeeAvailable()) return null;

  const hexEncoded = Buffer.from(reportData).toString("hex");
  const postBody = JSON.stringify({ report_data: hexEncoded });

  try {
    const res = await doRequest("POST", "/prpc/Tappd.TdxQuote", postBody);
    if (res.status >= 200 && res.status < 300 && res.body) {
      const parsed = JSON.parse(res.body);
      if (parsed && (parsed.quote || parsed.Quote)) return parsed;
      console.error("[tee] TdxQuote returned unexpected shape:", res.body.slice(0, 300));
    } else {
      console.error(`[tee] TdxQuote returned status ${res.status}:`, res.body.slice(0, 300));
    }
  } catch (err: any) {
    console.error("[tee] Attestation request failed:", err.message || err);
  }

  return null;
}

export async function debugTeeSocket(): Promise<any> {
  const tappdSockExists = existsSync(TAPPD_SOCK);
  const dstackSockExists = existsSync(DSTACK_SOCK);
  const simEndpoint = process.env.TAPPD_SIMULATOR_ENDPOINT || null;
  const activeEndpoint = getEndpoint();

  const result: any = {
    tappdSockExists,
    dstackSockExists,
    simulatorEndpoint: simEndpoint,
    activeEndpoint,
    probes: [],
  };

  const probeDefs: { label: string; method: string; path: string; body?: string }[] = [
    { label: "TdxQuote with report_data", method: "POST", path: "/prpc/Tappd.TdxQuote", body: JSON.stringify({ report_data: "deadbeef" }) },
    { label: "TdxQuote empty", method: "POST", path: "/prpc/Tappd.TdxQuote", body: "{}" },
    { label: "DeriveKey", method: "GET", path: "/prpc/Tappd.DeriveKey" },
    { label: "GetInfo", method: "GET", path: "/prpc/Tappd.GetInfo" },
    { label: "root", method: "GET", path: "/" },
  ];

  // Probe the active endpoint (tappd.sock, simulator, or dstack.sock fallback)
  if (activeEndpoint) {
    for (const probe of probeDefs) {
      try {
        const res = await doRequest(probe.method, probe.path, probe.body, "application/json", activeEndpoint);
        result.probes.push({
          label: probe.label,
          endpoint: activeEndpoint,
          path: probe.path,
          method: probe.method,
          status: res.status,
          responseHeaders: res.headers,
          body: res.body.slice(0, 500),
        });
      } catch (err: any) {
        result.probes.push({
          label: probe.label,
          endpoint: activeEndpoint,
          path: probe.path,
          method: probe.method,
          error: err.message || String(err),
        });
      }
    }
  }

  // If tappd.sock exists but wasn't the active endpoint, also probe it directly
  if (tappdSockExists && activeEndpoint?.type !== "socket") {
    const tappdEp = { type: "socket" as const, path: TAPPD_SOCK };
    for (const probe of probeDefs.slice(0, 2)) {
      try {
        const res = await doRequest(probe.method, probe.path, probe.body, "application/json", tappdEp);
        result.probes.push({
          label: `[tappd.sock] ${probe.label}`,
          endpoint: tappdEp,
          path: probe.path,
          method: probe.method,
          status: res.status,
          responseHeaders: res.headers,
          body: res.body.slice(0, 500),
        });
      } catch (err: any) {
        result.probes.push({
          label: `[tappd.sock] ${probe.label}`,
          endpoint: tappdEp,
          path: probe.path,
          error: err.message || String(err),
        });
      }
    }
  }

  return result;
}
