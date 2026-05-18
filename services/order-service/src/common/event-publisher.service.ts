import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { DomainEventType } from '@inventory/contracts';

@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);
  private readonly eventBusUrl = process.env.EVENT_BUS_URL ?? 'http://localhost:3005';

  async publish(
    type: DomainEventType,
    payload: unknown,
    source: string,
    correlationId?: string,
    eventId?: string,
  ): Promise<string> {
    const response = await fetch(`${this.eventBusUrl}/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.INTERNAL_EVENT_TOKEN
          ? { 'x-event-token': process.env.INTERNAL_EVENT_TOKEN }
          : {}),
      },
      body: JSON.stringify({ eventId, type, payload, source, correlationId }),
    }).catch((error: Error) => {
      this.logger.error(`Failed to publish ${type}: ${error.message}`);
      throw new ServiceUnavailableException('Event bus unavailable');
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Event bus rejected ${type}: ${response.status} ${detail}`);
      throw new ServiceUnavailableException('Event bus rejected domain event');
    }

    const body = (await response.json()) as { eventId: string };
    return body.eventId;
  }
}
