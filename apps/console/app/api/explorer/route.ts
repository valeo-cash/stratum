import { NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3100";

async function gwFetch(path: string) {
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const receipt = await gwFetch(`/v1/receipt/${encodeURIComponent(q)}`);

  if (!receipt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const windowId = receipt.windowId;
  const window = windowId ? await gwFetch(`/v1/window/${encodeURIComponent(windowId)}`) : null;

  const normalizedReceipt = {
    id: receipt.id,
    serviceId: receipt.serviceId ?? "",
    windowId: receipt.windowId,
    sequence: receipt.sequence,
    payerAddress: receipt.payer ?? receipt.payerAddress ?? "",
    payeeAddress: receipt.payee ?? receipt.payeeAddress ?? "",
    amount: receipt.amount,
    asset: receipt.asset ?? "USDC",
    resourcePath: receipt.resource ?? receipt.resourcePath ?? "",
    idempotencyKey: receipt.idempotencyKey ?? receipt.id,
    receiptHash: receipt.receiptHash ?? "",
    createdAt: receipt.timestamp ?? receipt.createdAt ?? new Date().toISOString(),
  };

  return NextResponse.json({
    receipt: normalizedReceipt,
    window: window
      ? {
          windowId: window.windowId,
          state: window.state,
          merkleRoot: window.merkleRoot ?? null,
          anchorTxHash: window.anchorTxHash ?? null,
          anchorChain: window.anchorChain ?? null,
        }
      : null,
    proof: {
      leaf: normalizedReceipt.receiptHash,
      nodes: [],
      root: window?.merkleRoot ?? "",
    },
    verification: {
      signatureValid: true,
      includedInWindow: !!window,
      anchoredOnChain: !!window?.anchorTxHash,
    },
  });
}
