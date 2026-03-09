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

export async function getTeeAttestation(reportData: string): Promise<any> {
  if (!isTeeAvailable()) return null;

  return new Promise((resolve) => {
    const postData = JSON.stringify({ report_data: reportData });
    const req = http.request(
      {
        socketPath: DSTACK_SOCK,
        path: "/prpc/Tappd.TdxQuote",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on("error", () => resolve(null));
    req.write(postData);
    req.end();
  });
}
