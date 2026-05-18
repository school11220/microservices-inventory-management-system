ALTER TABLE "ProcessedEvent"
  ADD COLUMN IF NOT EXISTS "outcomeType" TEXT,
  ADD COLUMN IF NOT EXISTS "outcomePayload" JSONB,
  ADD COLUMN IF NOT EXISTS "lowStockPayloads" JSONB;
