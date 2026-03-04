export async function confirmSettlement(
  gatewayUrl: string,
  apiKey: string,
  batchId: string,
  txHashes: string[],
  chain: string,
): Promise<void> {
  const res = await fetch(
    `${gatewayUrl}/v1/settle/batches/${encodeURIComponent(batchId)}/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ txHashes, chain }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Settlement confirmation failed (${res.status}): ${body}`,
    );
  }
}
