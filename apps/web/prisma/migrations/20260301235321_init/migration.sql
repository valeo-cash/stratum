-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "walletAddress" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "stratumSlug" TEXT NOT NULL,
    "pricePerReq" DOUBLE PRECISION NOT NULL DEFAULT 0.002,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptRecord" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "payerAddress" TEXT NOT NULL,
    "payeeAddress" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "asset" TEXT NOT NULL DEFAULT 'USDC',
    "resourcePath" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "receiptHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WindowRecord" (
    "id" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "receiptCount" INTEGER NOT NULL DEFAULT 0,
    "grossVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netVolume" DOUBLE PRECISION,
    "transferCount" INTEGER,
    "compressionRatio" DOUBLE PRECISION,
    "merkleRoot" TEXT,
    "anchorTxHash" TEXT,
    "anchorChain" TEXT,
    "facilitatorId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "WindowRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Service_stratumSlug_key" ON "Service"("stratumSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptRecord_idempotencyKey_key" ON "ReceiptRecord"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ReceiptRecord_serviceId_idx" ON "ReceiptRecord"("serviceId");

-- CreateIndex
CREATE INDEX "ReceiptRecord_windowId_idx" ON "ReceiptRecord"("windowId");

-- CreateIndex
CREATE INDEX "ReceiptRecord_payerAddress_idx" ON "ReceiptRecord"("payerAddress");

-- CreateIndex
CREATE UNIQUE INDEX "WindowRecord_windowId_key" ON "WindowRecord"("windowId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
