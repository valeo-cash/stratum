-- AlterTable
ALTER TABLE "gw_services" ADD COLUMN IF NOT EXISTS "chains" TEXT NOT NULL DEFAULT '["solana"]';
ALTER TABLE "gw_services" ADD COLUMN IF NOT EXISTS "wallets" TEXT NOT NULL DEFAULT '{}';
