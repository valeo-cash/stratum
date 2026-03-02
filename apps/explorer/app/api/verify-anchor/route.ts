import { Connection, PublicKey } from "@solana/web3.js";
import { NextResponse } from "next/server";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseAccountData(data: Buffer) {
  if (data.length < 8 + 32 + 4) return null;

  let offset = 8; // skip discriminator

  // authority (32 bytes) — skip
  offset += 32;

  const strLen = data.readUInt32LE(offset);
  offset += 4;

  if (offset + strLen + 32 + 8 + 8 + 8 + 8 > data.length) return null;

  const windowId = data.subarray(offset, offset + strLen).toString("utf-8");
  offset += strLen;

  const merkleRoot = new Uint8Array(data.subarray(offset, offset + 32));
  offset += 32;

  const receiptCount = Number(data.readBigUInt64LE(offset));
  offset += 8;

  const grossVolume = data.readBigUInt64LE(offset).toString();
  offset += 8;

  const netVolume = data.readBigUInt64LE(offset).toString();
  offset += 8;

  const timestamp = Number(data.readBigInt64LE(offset));

  return { windowId, merkleRoot, receiptCount, grossVolume, netVolume, timestamp };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const windowId = searchParams.get("windowId");
  const expectedRoot = searchParams.get("expectedRoot");

  if (!windowId || !expectedRoot) {
    return NextResponse.json(
      { error: "Missing windowId or expectedRoot query parameter" },
      { status: 400 },
    );
  }

  const rpcUrl = process.env.SOLANA_RPC_URL;
  const programIdStr = process.env.ANCHOR_PROGRAM_ID;

  if (!rpcUrl || !programIdStr) {
    return NextResponse.json({
      verified: false,
      reason: "not-configured",
      windowId,
      expectedRoot,
    });
  }

  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const programId = new PublicKey(programIdStr);

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("stratum"), Buffer.from(windowId)],
      programId,
    );

    const accountInfo = await connection.getAccountInfo(pda);

    if (!accountInfo?.data) {
      return NextResponse.json({
        verified: false,
        reason: "not-found",
        windowId,
        expectedRoot,
        pda: pda.toBase58(),
        programId: programIdStr,
      });
    }

    const parsed = parseAccountData(Buffer.from(accountInfo.data));

    if (!parsed) {
      return NextResponse.json({
        verified: false,
        reason: "parse-error",
        windowId,
        expectedRoot,
        pda: pda.toBase58(),
        programId: programIdStr,
      });
    }

    const onChainRoot = toHex(parsed.merkleRoot);
    const verified = onChainRoot === expectedRoot;

    return NextResponse.json({
      verified,
      onChainRoot,
      expectedRoot,
      windowId: parsed.windowId,
      receiptCount: parsed.receiptCount,
      grossVolume: parsed.grossVolume,
      netVolume: parsed.netVolume,
      timestamp: parsed.timestamp,
      pda: pda.toBase58(),
      programId: programIdStr,
    });
  } catch (err) {
    return NextResponse.json({
      verified: false,
      reason: "rpc-error",
      windowId,
      expectedRoot,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
