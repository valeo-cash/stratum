import { TappdClient } from "@phala/dstack-sdk";

let cachedAvailable: boolean | null = null;

function getClient(): TappdClient {
  return new TappdClient();
}

export async function isTeeAvailable(): Promise<boolean> {
  if (cachedAvailable !== null) return cachedAvailable;
  try {
    const client = getClient();
    await client.tdxQuote("probe");
    cachedAvailable = true;
  } catch {
    cachedAvailable = false;
  }
  return cachedAvailable;
}

export async function getTeeAttestation(
  reportData: string,
): Promise<{ quote: string } | null> {
  try {
    const client = getClient();
    const result = await client.tdxQuote(reportData);
    return { quote: typeof result === "string" ? result : JSON.stringify(result) };
  } catch {
    return null;
  }
}

export async function getTeeStatus(): Promise<{
  enabled: boolean;
  provider: string;
  enclave: string;
}> {
  const available = await isTeeAvailable();
  return {
    enabled: available,
    provider: available ? "phala-cloud" : "none",
    enclave: available ? "intel-tdx" : "none",
  };
}
