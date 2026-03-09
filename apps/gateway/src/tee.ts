import { existsSync } from "fs";
import http from "http";

const DSTACK_SOCK = "/var/run/dstack.sock";
const TAPPD_HOST = "localhost";
const TAPPD_PORT = 8090;

function httpGet(host: string, port: number, path: string): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve) => {
    const req = http.request({ host, port, path, method: "GET" }, (res) => {
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
    req.end();
  });
}

function httpPost(
  host: string,
  port: number,
  path: string,
  body: string,
  contentType = "application/json",
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host,
        port,
        path,
        method: "POST",
        headers: { "Content-Type": contentType, "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: flatHeaders(res.headers),
            body: data,
          }),
        );
      },
    );
    req.on("error", (err) => resolve({ status: 0, headers: {}, body: (err as Error).message }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ status: 0, headers: {}, body: "timeout" }); });
    req.write(body);
    req.end();
  });
}

function flatHeaders(h: http.IncomingHttpHeaders): Record<string, string> {
  return Object.fromEntries(
    Object.entries(h).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v ?? ""]),
  );
}

export function isTeeAvailable(): boolean {
  return existsSync(DSTACK_SOCK);
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
    const res = await httpPost(TAPPD_HOST, TAPPD_PORT, "/prpc/Tappd.TdxQuote", postBody);
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
  const socketExists = existsSync(DSTACK_SOCK);

  let tappdReachable = false;
  try {
    const ping = await httpGet(TAPPD_HOST, TAPPD_PORT, "/");
    tappdReachable = ping.status > 0;
  } catch { /* unreachable */ }

  const result: any = {
    socketExists,
    tappdHost: `${TAPPD_HOST}:${TAPPD_PORT}`,
    tappdReachable,
    probes: [],
  };

  const probes: { label: string; method: "GET" | "POST"; path: string; body?: string }[] = [
    { label: "root", method: "GET", path: "/" },
    { label: "TdxQuote empty", method: "POST", path: "/prpc/Tappd.TdxQuote", body: "{}" },
    { label: "TdxQuote with report_data", method: "POST", path: "/prpc/Tappd.TdxQuote", body: JSON.stringify({ report_data: "deadbeef" }) },
    { label: "DeriveKey", method: "GET", path: "/prpc/Tappd.DeriveKey" },
    { label: "GetInfo", method: "GET", path: "/prpc/Tappd.GetInfo" },
  ];

  for (const probe of probes) {
    try {
      const res = probe.method === "POST"
        ? await httpPost(TAPPD_HOST, TAPPD_PORT, probe.path, probe.body ?? "")
        : await httpGet(TAPPD_HOST, TAPPD_PORT, probe.path);

      result.probes.push({
        label: probe.label,
        path: probe.path,
        method: probe.method,
        status: res.status,
        responseHeaders: res.headers,
        body: res.body.slice(0, 500),
      });
    } catch (err: any) {
      result.probes.push({
        label: probe.label,
        path: probe.path,
        method: probe.method,
        error: err.message || String(err),
      });
    }
  }

  return result;
}
