-- Add facilitatorId to settlement batches
ALTER TABLE "gw_settlement_batches" ADD COLUMN "facilitatorId" TEXT;
CREATE INDEX "gw_settlement_batches_facilitatorId_idx" ON "gw_settlement_batches"("facilitatorId");
