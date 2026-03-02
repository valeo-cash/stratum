import type { Receipt } from "@valeo/stratum-core";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * JSON replacer that serializes BigInt as "<value>n" strings
 * and Uint8Array as "0x<hex>" strings, with keys sorted.
 */
function replacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return `${value}n`;
  }
  if (value instanceof Uint8Array) {
    return `0x${toHex(value)}`;
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

/**
 * JSON reviver that restores "<value>n" strings to BigInt
 * and "0x<hex>" strings to Uint8Array.
 */
function reviver(_key: string, value: unknown): unknown {
  if (typeof value === "string") {
    if (value.endsWith("n") && /^-?\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1));
    }
    if (value.startsWith("0x") && /^0x[0-9a-f]*$/.test(value)) {
      return fromHex(value.slice(2));
    }
  }
  return value;
}

/**
 * Deterministically encode a Receipt to bytes.
 * Uses sorted-key JSON with no whitespace; BigInt and Uint8Array
 * are serialized to unambiguous string representations.
 */
export function canonicalEncode(receipt: Receipt): Uint8Array {
  const json = JSON.stringify(receipt, replacer);
  return new TextEncoder().encode(json);
}

/**
 * Decode bytes produced by canonicalEncode back into a Receipt.
 */
export function canonicalDecode(bytes: Uint8Array): Receipt {
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json, reviver) as Receipt;
}
