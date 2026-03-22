-- AlterTable
ALTER TABLE "gw_intake_payments" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "gw_intake_payments" ADD COLUMN "paymentIntentId" TEXT;
ALTER TABLE "gw_intake_payments" ADD COLUMN "externallySettled" BOOLEAN NOT NULL DEFAULT false;
