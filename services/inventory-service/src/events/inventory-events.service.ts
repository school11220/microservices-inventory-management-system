import { Injectable, Logger } from '@nestjs/common';
import type {
  DomainEvent,
  OrderCreatedPayload,
  StockFailedPayload,
  StockLowPayload,
  StockSucceededPayload,
} from '@inventory/contracts';
import { Prisma } from '../../src/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { EventPublisherService } from '../common/event-publisher.service';
import { isLowStock } from '../products/product.presenter';

type InventoryOutcome =
  | {
      type: 'StockFailed';
      payload: StockFailedPayload;
      lowStockItems: StockLowPayload[];
    }
  | {
      type: 'StockSucceeded';
      payload: StockSucceededPayload;
      lowStockItems: StockLowPayload[];
    };

@Injectable()
export class InventoryEventsService {
  private readonly logger = new Logger(InventoryEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: EventPublisherService,
  ) {}

  async handleOrderCreated(event: DomainEvent<OrderCreatedPayload>) {
    const existing = await this.prisma.processedEvent.findUnique({
      where: { eventId: event.eventId },
    });
    if (existing) {
      const outcome = this.outcomeFromProcessedEvent(existing);
      if (!outcome) {
        return { status: 'duplicate' };
      }
      await this.publishOutcome(event, outcome);
      return { status: 'duplicate', outcome: outcome.type };
    }

    let outcome!: InventoryOutcome;

    await this.prisma.$transaction(async (tx) => {
      const failureItems: StockFailedPayload['items'] = [];
      const successItems: StockSucceededPayload['items'] = [];
      const lowStockItems: StockLowPayload[] = [];

      for (const item of event.payload.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stockLevel < item.quantity) {
          failureItems.push({
            productId: item.productId,
            requested: item.quantity,
            available: product?.stockLevel ?? 0,
          });
        }
      }

      if (failureItems.length > 0) {
        outcome = {
          type: 'StockFailed',
          payload: {
            orderId: event.payload.orderId,
            reason: 'Insufficient stock',
            items: failureItems,
          },
          lowStockItems: [],
        };
        await this.recordProcessedEvent(tx, event, outcome);
        return;
      }

      for (const item of event.payload.items) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        const nextStock = product.stockLevel - item.quantity;
        const updated = await tx.product.updateMany({
          where: { id: product.id, version: product.version },
          data: { stockLevel: nextStock, version: { increment: 1 } },
        });
        if (updated.count !== 1) {
          failureItems.push({
            productId: item.productId,
            requested: item.quantity,
            available: product.stockLevel,
          });
          throw new Error('Concurrent stock reservation detected');
        }
        successItems.push({
          productId: product.id,
          name: product.name,
          category: product.category,
          quantity: item.quantity,
          unitPrice: Number(product.price),
          remainingStock: nextStock,
          reorderThreshold: product.reorderThreshold,
        });
        if (isLowStock(nextStock, product.reorderThreshold)) {
          lowStockItems.push({
            productId: product.id,
            name: product.name,
            stockLevel: nextStock,
            reorderThreshold: product.reorderThreshold,
          });
        }
      }

      outcome = {
        type: 'StockSucceeded',
        payload: {
          orderId: event.payload.orderId,
          total: event.payload.total,
          items: successItems,
        },
        lowStockItems,
      };
      await this.recordProcessedEvent(tx, event, outcome);
    });

    await this.publishOutcome(event, outcome);

    if (outcome.type === 'StockFailed') {
      return { status: 'stock_failed', items: outcome.payload.items };
    }
    return { status: 'stock_succeeded', items: outcome.payload.items };
  }

  private async publishOutcome(event: DomainEvent<OrderCreatedPayload>, outcome: InventoryOutcome) {
    await this.publisher.publish(
      outcome.type,
      outcome.payload,
      'inventory-service',
      event.correlationId,
      this.outcomeEventId(event.eventId, outcome.type),
    );

    for (const lowStock of outcome.lowStockItems) {
      this.logger.warn(
        `Low stock: ${lowStock.name} (${lowStock.stockLevel}/${lowStock.reorderThreshold})`,
      );
      await this.publisher.publish(
        'StockLow',
        lowStock,
        'inventory-service',
        event.correlationId,
        `${event.eventId}:stock-low:${lowStock.productId}`,
      );
    }
  }

  private async recordProcessedEvent(
    tx: Prisma.TransactionClient,
    event: DomainEvent<OrderCreatedPayload>,
    outcome: InventoryOutcome,
  ) {
    await tx.processedEvent.create({
      data: {
        eventId: event.eventId,
        type: event.type,
        outcomeType: outcome.type,
        outcomePayload: outcome.payload as unknown as Prisma.InputJsonValue,
        lowStockPayloads: outcome.lowStockItems as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private outcomeFromProcessedEvent(event: {
    outcomeType: string | null;
    outcomePayload: Prisma.JsonValue | null;
    lowStockPayloads: Prisma.JsonValue | null;
  }): InventoryOutcome | undefined {
    if (event.outcomeType !== 'StockFailed' && event.outcomeType !== 'StockSucceeded') {
      return undefined;
    }
    if (!event.outcomePayload) {
      return undefined;
    }
    return {
      type: event.outcomeType,
      payload: event.outcomePayload as unknown as StockFailedPayload & StockSucceededPayload,
      lowStockItems: Array.isArray(event.lowStockPayloads)
        ? (event.lowStockPayloads as unknown as StockLowPayload[])
        : [],
    };
  }

  private outcomeEventId(eventId: string, type: InventoryOutcome['type']) {
    return `${eventId}:${type === 'StockSucceeded' ? 'stock-succeeded' : 'stock-failed'}`;
  }
}
