import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { DomainEvent, DomainEventType } from '@inventory/contracts';
import { randomUUID } from 'crypto';
import { EventStoreService } from './event-store.service';
import { KafkaEventStreamService } from './kafka-event-stream.service';

interface PublishEventRequest {
  eventId?: string;
  type: DomainEventType;
  payload: unknown;
  source: string;
  correlationId?: string;
}

export interface DeliveryTarget {
  service: string;
  url: string;
}

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private readonly events: DomainEvent[] = [];
  private readonly subscribers: Record<DomainEventType, DeliveryTarget[]>;
  private retryTimer?: NodeJS.Timeout;

  constructor(
    private readonly eventStore: EventStoreService,
    private readonly kafkaStream: KafkaEventStreamService,
  ) {
    const inventoryUrl = process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3002';
    const orderUrl = process.env.ORDER_SERVICE_URL ?? 'http://localhost:3003';
    const reportingUrl = process.env.REPORTING_SERVICE_URL ?? 'http://localhost:3004';
    this.subscribers = {
      OrderCreated: [
        { service: 'inventory-service', url: `${inventoryUrl}/events/order-created` },
        { service: 'reporting-service', url: `${reportingUrl}/events/order-created` },
      ],
      StockSucceeded: [
        { service: 'order-service', url: `${orderUrl}/events/stock-succeeded` },
        { service: 'reporting-service', url: `${reportingUrl}/events/stock-succeeded` },
      ],
      StockFailed: [
        { service: 'order-service', url: `${orderUrl}/events/stock-failed` },
        { service: 'reporting-service', url: `${reportingUrl}/events/stock-failed` },
      ],
      OrderCancelled: [
        { service: 'reporting-service', url: `${reportingUrl}/events/order-cancelled` },
      ],
      StockAdjusted: [
        { service: 'reporting-service', url: `${reportingUrl}/events/stock-adjusted` },
      ],
      StockLow: [{ service: 'reporting-service', url: `${reportingUrl}/events/stock-low` }],
      ProductDeleted: [
        { service: 'reporting-service', url: `${reportingUrl}/events/product-deleted` },
      ],
    };
  }

  onModuleInit() {
    if (!this.eventStore.enabled) return;
    const intervalMs = Number(process.env.EVENT_RETRY_INTERVAL_MS ?? 5000);
    this.retryTimer = setInterval(() => {
      void this.retryPendingDeliveries();
    }, intervalMs);
    this.retryTimer.unref();
  }

  onModuleDestroy() {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }
  }

  async publish(request: PublishEventRequest) {
    if (!request.type || !request.source) {
      throw new BadRequestException('type and source are required');
    }
    const event: DomainEvent = {
      eventId: request.eventId ?? randomUUID(),
      type: request.type,
      source: request.source,
      correlationId: request.correlationId ?? randomUUID(),
      occurredAt: new Date().toISOString(),
      payload: request.payload,
    };
    this.events.push(event);
    const targets = this.subscribers[event.type] ?? [];
    await this.eventStore.append(event, targets);
    await this.kafkaStream.publish(event);

    const deliveries = await Promise.all(
      targets.map(async (target) => {
        const result = await this.deliverWithRetry(target, event);
        if (result.delivered) {
          await this.eventStore.markDelivered(event.eventId, target);
        } else {
          await this.eventStore.markFailed(
            event.eventId,
            target,
            result.error ?? 'delivery failed',
          );
        }
        return {
          service: target.service,
          url: target.url,
          delivered: result.delivered,
        };
      }),
    );

    return { eventId: event.eventId, correlationId: event.correlationId, deliveries };
  }

  async list(type?: DomainEventType) {
    const durableEvents = await this.eventStore.list(type);
    if (durableEvents) {
      return { events: durableEvents };
    }
    const events = type ? this.events.filter((event) => event.type === type) : this.events;
    return { events: events.slice(-250).reverse() };
  }

  subscriptions() {
    return {
      subscribers: this.subscribers,
      durableStoreEnabled: this.eventStore.enabled,
      kafka: this.kafkaStream.status,
    };
  }

  private async deliverWithRetry(
    target: DeliveryTarget,
    event: DomainEvent,
  ): Promise<{ delivered: boolean; error?: string }> {
    let lastError: string | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetch(target.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(process.env.INTERNAL_EVENT_TOKEN
            ? { 'x-event-token': process.env.INTERNAL_EVENT_TOKEN }
            : {}),
        },
        body: JSON.stringify(event),
      }).catch((error: Error) => {
        lastError = error.message;
        this.logger.warn(
          `Delivery attempt ${attempt} to ${target.service} failed: ${error.message}`,
        );
        return undefined;
      });
      if (response?.ok) {
        return { delivered: true };
      }
      if (response) {
        lastError = `HTTP ${response.status}`;
        this.logger.warn(
          `Delivery attempt ${attempt} to ${target.service} returned ${response.status}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 150));
    }
    return { delivered: false, error: lastError };
  }

  private async retryPendingDeliveries() {
    try {
      const pending = await this.eventStore.dueDeliveries();
      for (const delivery of pending) {
        const result = await this.deliverWithRetry(delivery.target, delivery.event);
        if (result.delivered) {
          await this.eventStore.markDelivered(delivery.event.eventId, delivery.target);
        } else {
          await this.eventStore.markFailed(
            delivery.event.eventId,
            delivery.target,
            result.error ?? 'retry failed',
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Pending delivery retry skipped: ${message}`);
    }
  }
}
