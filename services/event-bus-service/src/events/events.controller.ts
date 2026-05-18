import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Post,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { getServiceMetrics, type DomainEventType } from '@inventory/contracts';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'event-bus-service',
      transport: this.eventsService.subscriptions(),
    };
  }

  @Get('metrics')
  metrics() {
    return getServiceMetrics('event-bus-service').snapshot();
  }

  @Get('metrics/prometheus')
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  prometheusMetrics() {
    return getServiceMetrics('event-bus-service').prometheus();
  }

  @Post('events')
  @ApiOperation({ summary: 'Publish a domain event to subscribed services' })
  publish(
    @Body()
    body: {
      eventId?: string;
      type: DomainEventType;
      payload: unknown;
      source: string;
      correlationId?: string;
    },
    @Headers('x-event-token') token?: string,
  ) {
    this.assertInternalToken(token);
    return this.eventsService.publish(body);
  }

  @Get('events')
  @ApiOperation({ summary: 'List recent events from the durable event log' })
  @ApiQuery({ name: 'type', required: false })
  list(@Query('type') type?: DomainEventType) {
    return this.eventsService.list(type);
  }

  @Get('subscriptions')
  subscriptions() {
    return this.eventsService.subscriptions();
  }

  private assertInternalToken(token?: string) {
    if (process.env.INTERNAL_EVENT_TOKEN && token !== process.env.INTERNAL_EVENT_TOKEN) {
      throw new ForbiddenException('Invalid event token');
    }
  }
}
