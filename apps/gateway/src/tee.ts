import { existsSync } from "fs";
import http from "http";

const DSTACK_SOCK = "/var/run/dstack.sock";

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

function httpOverSocket(path: string, body?: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve) => {
    const opts: http.RequestOptions = {
      socketPath: DSTACK_SOCK,
      path,
      method: body ? "POST" : "GET",
      headers: body
        ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
        : {},
    };

    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
    });
    req.on("error", (err) => {
      resolve({ status: 0, body: (err as Error).message || String(err) });
    });
    if (body) req.write(body);
    req.end();
  });
}

export async function getTeeAttestation(reportData: string): Promise<any> {
  if (!isTeeAvailable()) return null;

  const hexEncoded = Buffer.from(reportData).toString("hex");
  const postData = JSON.stringify({ report_data: hexEncoded });

  const paths = ["/prpc/Tappd.TdxQuote", "/prpc/tappd.TdxQuote"];

  for (const path of paths) {
    try {
      const res = await httpOverSocket(path, postData);
      if (res.status >= 200 && res.status < 300 && res.body) {
        const parsed = JSON.parse(res.body);
        if (parsed && (parsed.quote || parsed.Quote)) return parsed;
        console.error(`[tee] ${path} returned unexpected shape:`, res.body.slice(0, 200));
      } else {
        console.error(`[tee] ${path} returned status ${res.status}:`, res.body.slice(0, 200));
      }
    } catch (err: any) {
      console.error(`[tee] ${path} request failed:`, err.message || err);
    }
  }

  return null;
}

function httpOverSocketRaw(
  path: string,
  method: string,
  body?: string | Buffer,
  contentType?: string,
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = {};
    if (body && body.length > 0) {
      headers["Content-Type"] = contentType || "application/json";
      headers["Content-Length"] = String(typeof body === "string" ? Buffer.byteLength(body) : body.length);
    }

    const req = http.request(
      { socketPath: DSTACK_SOCK, path, method, headers },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: Object.fromEntries(
              Object.entries(res.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v ?? ""]),
            ),
            body: data,
          }),
        );
      },
    );
    req.on("error", (err) => {
      resolve({ status: 0, headers: {}, body: (err as Error).message || String(err) });
    });
    if (body) req.write(body);
    req.end();
  });
}

export async function debugTeeSocket(): Promise<any> {
  const socketExists = existsSync(DSTACK_SOCK);
  if (!socketExists) {
    return { socketExists: false, error: "Socket file not found" };
  }

  const result: any = { socketExists: true, probes: [] };

  const probes: { path: string; method: string; body?: string | Buffer; contentType?: string; label?: string }[] = [
    { path: "/prpc/Tappd.TdxQuote", method: "POST", body: JSON.stringify({ report_data: "deadbeef" }), label: "TdxQuote JSON" },
    { path: "/prpc/Tappd.TdxQuote", method: "POST", body: "", label: "TdxQuote empty POST" },
    { path: "/prpc/Tappd.TdxQuote", method: "POST", body: Buffer.alloc(0), contentType: "application/octet-stream", label: "TdxQuote octet-stream" },
    { path: "/prpc/Tappd.TdxQuote", method: "POST", body: Buffer.alloc(0), contentType: "application/protobuf", label: "TdxQuote protobuf" },
    { path: "/prpc/tappd.TdxQuote", method: "POST", body: JSON.stringify({ report_data: "deadbeef" }), label: "tdxQuote lowercase JSON" },
    { path: "/prpc/Tappd.RawQuote", method: "POST", body: "", label: "RawQuote empty" },
    { path: "/prpc/Tappd.GetInfo", method: "GET", label: "GetInfo" },
    { path: "/prpc/Tappd.Info", method: "GET", label: "Info" },
    { path: "/info", method: "GET", label: "/info" },
    { path: "/api/info", method: "GET", label: "/api/info" },
    { path: "/api/v1/info", method: "GET", label: "/api/v1/info" },
    { path: "/api/v1/quote", method: "POST", body: "", label: "/api/v1/quote" },
    { path: "/healthz", method: "GET", label: "/healthz" },
    { path: "/ready", method: "GET", label: "/ready" },
    { path: "/", method: "GET", label: "root" },
  ];

  for (const probe of probes) {
    try {
      const res = await httpOverSocketRaw(probe.path, probe.method, probe.body, probe.contentType);
      result.probes.push({
        label: probe.label,
        path: probe.path,
        method: probe.method,
        contentType: probe.contentType || (probe.body ? "application/json" : undefined),
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
