import bs58 from "bs58";

export function toBase58(bytes: Uint8Array): string {
  return bs58.encode(bytes);
}

export function fromBase58(str: string): Uint8Array {
  return bs58.decode(str);
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Build the canonical payload for signing.
 * Sorted keys, no whitespace — deterministic across implementations.
 */
export function canonicalPayload(fields: {
  amount: string;
  asset: string;
  nonce: string;
  payTo: string;
  payer: string;
  validUntil: string;
}): string {
  const sorted: Record<string, string> = {};
  for (const k of Object.keys(fields).sort()) {
    sorted[k] = (fields as Record<string, string>)[k];
  }
  return JSON.stringify(sorted);
}

export function encodeBase64(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf-8").toString("base64");
  }
  return btoa(str);
}

export function decodeBase64(b64: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf-8");
  }
  return atob(b64);
}
