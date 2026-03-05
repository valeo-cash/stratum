import { createHmac } from "crypto";
import { prisma } from "./db";

export async function deliverWebhook(
  webhookUrl: string,
  secret: string,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; statusCode: number }> {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Stratum-Signature": signature,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    return { success: res.ok, statusCode: res.status };
  } catch {
    return { success: false, statusCode: 0 };
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deliverWithRetry(
  webhookUrl: string,
  secret: string,
  payload: Record<string, unknown>,
  maxRetries = 3,
): Promise<boolean> {
  const delays = [1000, 5000, 25000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await deliverWebhook(webhookUrl, secret, payload);
    if (result.success) return true;

    console.log(
      `[webhook] Delivery to ${webhookUrl} failed (status ${result.statusCode}), attempt ${attempt + 1}/${maxRetries + 1}`,
    );

    if (attempt < maxRetries) {
      await sleep(delays[attempt] ?? 25000);
    }
  }

  return false;
}

export async function notifyFacilitators(
  batchId: string,
  chain: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  let webhooks;
  try {
    webhooks = await prisma.facilitatorWebhook.findMany({
      where: { active: true },
    });
  } catch {
    console.log("[webhook] Could not query webhooks — DB may be unavailable");
    return false;
  }

  const matching = webhooks.filter((w) => {
    try {
      const chains: string[] = JSON.parse(w.chains);
      return chains.includes(chain);
    } catch {
      return false;
    }
  });

  if (matching.length === 0) return false;

  let anySuccess = false;
  let firstFacilitatorId: string | null = null;

  for (const wh of matching) {
    const ok = await deliverWithRetry(wh.url, wh.secret, payload);
    if (ok) {
      anySuccess = true;
      if (!firstFacilitatorId) firstFacilitatorId = wh.apiKeyId;
      console.log(`[webhook] Delivered batch ${batchId} to ${wh.url}`);
    } else {
      console.error(`[webhook] All retries failed for ${wh.url} (batch ${batchId})`);
    }
  }

  if (anySuccess) {
    try {
      await prisma.settlementBatch.update({
        where: { id: batchId },
        data: {
          status: "webhook_sent",
          webhookSentAt: new Date(),
          facilitatorId: firstFacilitatorId,
        },
      });
    } catch (e: any) {
      console.error("[webhook] Failed to update batch status:", e.message);
    }
  }

  return anySuccess;
}
