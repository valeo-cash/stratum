-- CreateTable
CREATE TABLE "gw_facilitator_webhooks" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "chains" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gw_facilitator_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gw_settlement_batches" (
    "id" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "transfers" TEXT NOT NULL,
    "totalVolume" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "anchorTxHash" TEXT,
    "webhookSentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "txHashes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gw_settlement_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gw_settlement_batches_windowId_idx" ON "gw_settlement_batches"("windowId");

-- CreateIndex
CREATE INDEX "gw_settlement_batches_status_idx" ON "gw_settlement_batches"("status");
