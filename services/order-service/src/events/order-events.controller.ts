import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { DomainEvent, StockFailedPayload, StockSucceededPayload } from '@inventory/contracts';
import { EventTokenGuard } from '../auth/event-token.guard';
import { Public } from '../auth/public.decorator';
import { OrderEventsService } from './order-events.service';

@ApiTags('events')
@Controller('events')
@Public()
@UseGuards(EventTokenGuard)
export class OrderEventsController {
  constructor(private readonly eventsService: OrderEventsService) {}

  @Post('stock-succeeded')
  handleStockSucceeded(@Body() event: DomainEvent<StockSucceededPayload>) {
    return this.eventsService.handleStockSucceeded(event);
  }

  @Post('stock-failed')
  handleStockFailed(@Body() event: DomainEvent<StockFailedPayload>) {
    return this.eventsService.handleStockFailed(event);
  }
}
