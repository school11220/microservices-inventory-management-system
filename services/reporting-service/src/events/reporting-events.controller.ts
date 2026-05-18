import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { DomainEvent } from '@inventory/contracts';
import { EventTokenGuard } from '../auth/event-token.guard';
import { Public } from '../auth/public.decorator';
import { ReportingEventsService } from './reporting-events.service';

@ApiTags('events')
@Controller('events')
@Public()
@UseGuards(EventTokenGuard)
export class ReportingEventsController {
  constructor(private readonly eventsService: ReportingEventsService) {}

  @Post('order-created')
  orderCreated(@Body() event: DomainEvent) {
    return this.eventsService.ingest(event);
  }

  @Post('stock-succeeded')
  stockSucceeded(@Body() event: DomainEvent) {
    return this.eventsService.ingest(event);
  }

  @Post('stock-failed')
  stockFailed(@Body() event: DomainEvent) {
    return this.eventsService.ingest(event);
  }

  @Post('order-cancelled')
  orderCancelled(@Body() event: DomainEvent) {
    return this.eventsService.ingest(event);
  }

  @Post('stock-adjusted')
  stockAdjusted(@Body() event: DomainEvent) {
    return this.eventsService.ingest(event);
  }

  @Post('stock-low')
  stockLow(@Body() event: DomainEvent) {
    return this.eventsService.ingest(event);
  }

  @Post('product-deleted')
  productDeleted(@Body() event: DomainEvent) {
    return this.eventsService.ingest(event);
  }
}
