import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { DomainEvent, OrderCreatedPayload } from '@inventory/contracts';
import { EventTokenGuard } from '../auth/event-token.guard';
import { Public } from '../auth/public.decorator';
import { InventoryEventsService } from './inventory-events.service';

@ApiTags('events')
@Controller('events')
@Public()
@UseGuards(EventTokenGuard)
export class InventoryEventsController {
  constructor(private readonly eventsService: InventoryEventsService) {}

  @Post('order-created')
  handleOrderCreated(@Body() event: DomainEvent<OrderCreatedPayload>) {
    return this.eventsService.handleOrderCreated(event);
  }
}
