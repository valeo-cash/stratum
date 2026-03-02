import { describe, it, expect, vi, beforeEach } from "vitest";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { StratumAgent, createPaidFetch, toBase58, fromBase58, canonicalPayload, toHex } from "../index";

ed.hashes.sha512 = sha512;

describe("encoding", () => {
  it("base58 round-trips", () => {
    const bytes = ed.getPublicKey(ed.utils.randomSecretKey());
    const encoded = toBase58(bytes);
    expect(fromBase58(encoded)).toEqual(bytes);
  });

  it("canonicalPayload produces sorted keys", () => {
    const payload = canonicalPayload({
      payer: "alice",
      amount: "2000",
      asset: "USDC",
      payTo: "bob",
      nonce: "abc",
      validUntil: "999",
    });
    const parsed = JSON.parse(payload);
    const keys = Object.keys(parsed);
    expect(keys).toEqual([...keys].sort());
  });
});

describe("StratumAgent", () => {
  let privateKey: Uint8Array;

  beforeEach(() => {
    privateKey = ed.utils.randomSecretKey();
  });

  it("derives a base58 address from private key", () => {
    const agent = new StratumAgent(privateKey);
    const addr = agent.getAddress();
    expect(addr.length).toBeGreaterThan(30);
    const decoded = fromBase58(addr);
    expect(decoded.length).toBe(32);
  });

  it("starts with no receipts", () => {
    const agent = new StratumAgent(privateKey);
    expect(agent.getReceipts()).toEqual([]);
  });

  it("passes through non-402 responses", async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse);

    const agent = new StratumAgent(privateKey);
    const res = await agent.fetch("https://example.com/api");
    expect(res.status).toBe(200);
    expect(agent.getReceipts()).toEqual([]);

    vi.restoreAllMocks();
  });

  it("handles full 402 → payment → 200 flow", async () => {
    const agent = new StratumAgent(privateKey);
    const nonce = "test-nonce-123";

    const require402 = new Response(
      JSON.stringify({
        x402: {
          version: "1",
          price: "2000",
          asset: "USDC",
          network: "solana",
          payTo: "service-wallet",
          validUntil: String(Math.floor(Date.now() / 1000) + 60),
          nonce,
        },
      }),
      { status: 402 },
    );

    const receiptHash = "abcdef1234567890";
    const success200 = new Response(JSON.stringify({ data: "result" }), {
      status: 200,
      headers: { "x-stratum-receipt": receiptHash },
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce(require402);
    fetchSpy.mockResolvedValueOnce(success200);

    const res = await agent.fetch("https://gateway.example.com/s/api/data");
    expect(res.status).toBe(200);

    // Verify the payment header was sent
    const secondCall = fetchSpy.mock.calls[1];
    const headers = secondCall[1]?.headers as Headers;
    const paymentHeader = headers.get("X-PAYMENT");
    expect(paymentHeader).toBeTruthy();

    // Decode and verify the payment
    const paymentJson = JSON.parse(Buffer.from(paymentHeader!, "base64").toString("utf-8"));
    expect(paymentJson.payer).toBe(agent.getAddress());
    expect(paymentJson.amount).toBe("2000");
    expect(paymentJson.nonce).toBe(nonce);
    expect(paymentJson.signature).toBeTruthy();

    // Verify the signature is valid
    const payload = canonicalPayload({
      amount: paymentJson.amount,
      asset: paymentJson.asset,
      nonce: paymentJson.nonce,
      payTo: paymentJson.payTo,
      payer: paymentJson.payer,
      validUntil: paymentJson.validUntil,
    });
    const payloadBytes = new TextEncoder().encode(payload);
    const sigBytes = new Uint8Array(
      paymentJson.signature.match(/.{2}/g)!.map((h: string) => parseInt(h, 16)),
    );
    const valid = ed.verify(sigBytes, payloadBytes, agent.getPublicKeyBytes());
    expect(valid).toBe(true);

    // Receipt was stored
    expect(agent.getReceipts()).toHaveLength(1);
    expect(agent.getReceipts()[0].hash).toBe(receiptHash);

    vi.restoreAllMocks();
  });
});

describe("createPaidFetch", () => {
  it("returns a function", () => {
    const privateKey = ed.utils.randomSecretKey();
    const paidFetch = createPaidFetch(privateKey);
    expect(typeof paidFetch).toBe("function");
  });
});
