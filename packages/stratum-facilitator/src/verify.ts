import { createHmac, timingSafeEqual } from "crypto";

export function computeSignature(secret: string, body: string | Buffer): string {
  return createHmac("sha256", secret)
    .update(typeof body === "string" ? body : body)
    .digest("hex");
}

export function verifySignature(
  secret: string,
  body: string | Buffer,
  signatureHeader: string,
): boolean {
  const expected = computeSignature(secret, body);
  if (expected.length !== signatureHeader.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signatureHeader, "hex"),
    );
  } catch {
    return false;
  }
}
