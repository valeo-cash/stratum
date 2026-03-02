-- CreateTable
CREATE TABLE IF NOT EXISTS "gw_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pricePerRequest" DOUBLE PRECISION NOT NULL DEFAULT 0.002,
    "walletAddress" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gw_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gw_receipts" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "payerAddress" TEXT NOT NULL,
    "payeeAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "asset" TEXT NOT NULL DEFAULT 'USDC',
    "resourceHash" TEXT NOT NULL,
    "receiptHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "signerPubKey" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gw_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gw_windows" (
    "id" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "receiptCount" INTEGER NOT NULL DEFAULT 0,
    "grossVolume" TEXT NOT NULL DEFAULT '0',
    "netVolume" TEXT,
    "transferCount" INTEGER,
    "compressionRatio" DOUBLE PRECISION,
    "merkleRoot" TEXT,
    "anchorTxHash" TEXT,
    "headSignature" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "gw_windows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "gw_services_slug_key" ON "gw_services"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "gw_receipts_receiptId_key" ON "gw_receipts"("receiptId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gw_receipts_windowId_idx" ON "gw_receipts"("windowId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gw_receipts_payerAddress_idx" ON "gw_receipts"("payerAddress");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gw_receipts_receiptHash_idx" ON "gw_receipts"("receiptHash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "gw_windows_windowId_key" ON "gw_windows"("windowId");
