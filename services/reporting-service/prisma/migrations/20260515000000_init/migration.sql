CREATE TABLE "ReportEvent" (
  "eventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "source" TEXT,
  "payload" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportEvent_pkey" PRIMARY KEY ("eventId")
);

CREATE INDEX "ReportEvent_type_idx" ON "ReportEvent"("type");
CREATE INDEX "ReportEvent_occurredAt_idx" ON "ReportEvent"("occurredAt");

CREATE TABLE "SalesDaily" (
  "date" TIMESTAMP(3) NOT NULL,
  "totalSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "orderCount" INTEGER NOT NULL DEFAULT 0,
  "unitsSold" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesDaily_pkey" PRIMARY KEY ("date")
);

CREATE TABLE "InventorySnapshot" (
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "stockLevel" INTEGER NOT NULL,
  "reorderThreshold" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventorySnapshot_pkey" PRIMARY KEY ("productId")
);

CREATE TABLE "StockAlert" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "stockLevel" INTEGER NOT NULL,
  "reorderThreshold" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockAlert_productId_idx" ON "StockAlert"("productId");
CREATE INDEX "StockAlert_createdAt_idx" ON "StockAlert"("createdAt");
