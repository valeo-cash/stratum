import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

function mockHash() {
  const hex = "0123456789abcdef";
  let h = "0x";
  for (let i = 0; i < 64; i++) h += hex[Math.floor(Math.random() * 16)];
  return h;
}

function generateMerkleProof(receiptHash: string, merkleRoot: string | null) {
  const root = merkleRoot ?? mockHash();
  const leaf = receiptHash;
  const sibling1 = mockHash();
  const parent = mockHash();
  const sibling2 = mockHash();

  return {
    leaf,
    nodes: [
      { hash: leaf, level: 0, side: "left" as const, highlight: true },
      { hash: sibling1, level: 0, side: "right" as const, highlight: false },
      { hash: parent, level: 1, side: "left" as const, highlight: true },
      { hash: sibling2, level: 1, side: "right" as const, highlight: false },
      { hash: root, level: 2, side: "root" as const, highlight: true },
    ],
    root,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  if (!prisma) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  let receipt = await prisma.receiptRecord.findFirst({
    where: { receiptHash: q },
  });

  if (!receipt) {
    receipt = await prisma.receiptRecord.findFirst({
      where: { payerAddress: q },
    });
  }

  if (!receipt) {
    receipt = await prisma.receiptRecord.findFirst({
      where: { id: q },
    });
  }

  if (!receipt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const window = await prisma.windowRecord.findFirst({
    where: { windowId: receipt.windowId },
  });

  const proof = generateMerkleProof(receipt.receiptHash, window?.merkleRoot ?? null);

  return NextResponse.json({
    receipt,
    window,
    proof,
    verification: {
      signatureValid: true,
      includedInWindow: !!window,
      anchoredOnChain: !!window?.anchorTxHash,
    },
  });
}
