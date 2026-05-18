import { Injectable } from '@nestjs/common';
import type {
  DomainEvent,
  ProductDeletedPayload,
  StockAdjustedPayload,
  StockLowPayload,
  StockSucceededPayload,
} from '@inventory/contracts';
import { Prisma } from '../../src/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { toUtcDateBucket } from '../reports/reporting.utils';

@Injectable()
export class ReportingEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(event: DomainEvent) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.reportEvent.findUnique({
        where: { eventId: event.eventId },
      });
      if (existing) {
        return { status: 'duplicate' };
      }

      await tx.reportEvent.create({
        data: {
          eventId: event.eventId,
          type: event.type,
          source: event.source,
          payload: event.payload as object,
          occurredAt: new Date(event.occurredAt),
        },
      });

      if (event.type === 'StockSucceeded') {
        await this.applyStockSucceeded(tx, event as DomainEvent<StockSucceededPayload>);
      }
      if (event.type === 'StockAdjusted') {
        await this.applyStockAdjusted(tx, event as DomainEvent<StockAdjustedPayload>);
      }
      if (event.type === 'StockLow') {
        await this.applyStockLow(tx, event as DomainEvent<StockLowPayload>);
      }
      if (event.type === 'ProductDeleted') {
        await this.applyProductDeleted(tx, event as DomainEvent<ProductDeletedPayload>);
      }

      return { status: 'processed' };
    });
  }

  private async applyStockSucceeded(
    tx: Prisma.TransactionClient,
    event: DomainEvent<StockSucceededPayload>,
  ) {
    const date = toUtcDateBucket(event.occurredAt);
    const unitsSold = event.payload.items.reduce((sum, item) => sum + item.quantity, 0);
    await tx.salesDaily.upsert({
      where: { date },
      create: { date, totalSales: event.payload.total, orderCount: 1, unitsSold },
      update: {
        totalSales: { increment: event.payload.total },
        orderCount: { increment: 1 },
        unitsSold: { increment: unitsSold },
      },
    });

    for (const item of event.payload.items) {
      await tx.inventorySnapshot.upsert({
        where: { productId: item.productId },
        create: {
          productId: item.productId,
          name: item.name,
          category: item.category,
          stockLevel: item.remainingStock,
          reorderThreshold: item.reorderThreshold,
        },
        update: {
          name: item.name,
          category: item.category,
          stockLevel: item.remainingStock,
          reorderThreshold: item.reorderThreshold,
        },
      });
    }
  }

  private async applyStockAdjusted(
    tx: Prisma.TransactionClient,
    event: DomainEvent<StockAdjustedPayload>,
  ) {
    await tx.inventorySnapshot.upsert({
      where: { productId: event.payload.productId },
      create: {
        productId: event.payload.productId,
        name: event.payload.name,
        category: event.payload.category,
        stockLevel: event.payload.stockLevel,
        reorderThreshold: event.payload.reorderThreshold,
      },
      update: {
        name: event.payload.name,
        category: event.payload.category,
        stockLevel: event.payload.stockLevel,
        reorderThreshold: event.payload.reorderThreshold,
      },
    });
  }

  private async applyStockLow(tx: Prisma.TransactionClient, event: DomainEvent<StockLowPayload>) {
    await tx.stockAlert.create({
      data: {
        productId: event.payload.productId,
        name: event.payload.name,
        stockLevel: event.payload.stockLevel,
        reorderThreshold: event.payload.reorderThreshold,
      },
    });
  }

  private async applyProductDeleted(
    tx: Prisma.TransactionClient,
    event: DomainEvent<ProductDeletedPayload>,
  ) {
    await tx.inventorySnapshot.deleteMany({
      where: { productId: event.payload.productId },
    });
    await tx.stockAlert.updateMany({
      where: { productId: event.payload.productId, resolvedAt: null },
      data: { resolvedAt: new Date(event.occurredAt) },
    });
  }
}
