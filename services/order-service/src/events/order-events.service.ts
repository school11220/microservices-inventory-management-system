import { Injectable } from '@nestjs/common';
import type {
  DomainEvent,
  OrderCancelledPayload,
  StockFailedPayload,
  StockSucceededPayload,
} from '@inventory/contracts';
import { EventPublisherService } from '../common/event-publisher.service';
import { OrderStatus, Prisma } from '../../src/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrderEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: EventPublisherService,
  ) {}

  async handleStockSucceeded(event: DomainEvent<StockSucceededPayload>) {
    const existing = await this.prisma.processedEvent.findUnique({
      where: { eventId: event.eventId },
    });
    if (existing) {
      await this.publishStoredOutcome(event, existing);
      return { status: 'duplicate' };
    }
    await this.prisma.$transaction([
      this.prisma.processedEvent.create({ data: { eventId: event.eventId, type: event.type } }),
      this.prisma.order.update({
        where: { id: event.payload.orderId },
        data: {
          status: OrderStatus.CONFIRMED,
          failureReason: null,
          statusHistory: {
            create: {
              status: OrderStatus.CONFIRMED,
              note: 'Inventory reservation completed',
            },
          },
        },
      }),
    ]);
    return { status: 'confirmed' };
  }

  async handleStockFailed(event: DomainEvent<StockFailedPayload>) {
    const existing = await this.prisma.processedEvent.findUnique({
      where: { eventId: event.eventId },
    });
    if (existing) {
      await this.publishStoredOutcome(event, existing);
      return { status: 'duplicate' };
    }

    const outcome: OrderCancelledPayload = {
      orderId: event.payload.orderId,
      reason: event.payload.reason,
      items: event.payload.items,
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.processedEvent.create({
        data: {
          eventId: event.eventId,
          type: event.type,
          outcomeType: 'OrderCancelled',
          outcomePayload: outcome as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.order.update({
        where: { id: event.payload.orderId },
        data: {
          status: OrderStatus.FAILED,
          failureReason: event.payload.reason,
          statusHistory: {
            create: {
              status: OrderStatus.FAILED,
              note: event.payload.reason,
            },
          },
        },
      });
    });
    await this.publishOrderCancelled(event, outcome);
    return { status: 'failed' };
  }

  private async publishStoredOutcome(
    event: DomainEvent<StockSucceededPayload | StockFailedPayload>,
    processedEvent: { outcomeType: string | null; outcomePayload: Prisma.JsonValue | null },
  ) {
    if (processedEvent.outcomeType !== 'OrderCancelled' || !processedEvent.outcomePayload) {
      return;
    }
    await this.publishOrderCancelled(
      event,
      processedEvent.outcomePayload as unknown as OrderCancelledPayload,
    );
  }

  private async publishOrderCancelled(
    event: DomainEvent<StockSucceededPayload | StockFailedPayload>,
    payload: OrderCancelledPayload,
  ) {
    await this.publisher.publish(
      'OrderCancelled',
      payload,
      'order-service',
      event.correlationId,
      `${event.eventId}:order-cancelled`,
    );
  }
}
