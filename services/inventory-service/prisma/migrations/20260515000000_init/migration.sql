CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "category" TEXT NOT NULL,
  "stockLevel" INTEGER NOT NULL DEFAULT 0,
  "reorderThreshold" INTEGER NOT NULL DEFAULT 10,
  "imageUrl" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_stockLevel_idx" ON "Product"("stockLevel");

CREATE TABLE "ProcessedEvent" (
  "eventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("eventId")
);
