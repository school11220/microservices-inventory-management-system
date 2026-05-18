import { Module } from '@nestjs/common';
import { EventStoreService } from './events/event-store.service';
import { EventsController } from './events/events.controller';
import { EventsService } from './events/events.service';
import { KafkaEventStreamService } from './events/kafka-event-stream.service';

@Module({
  imports: [],
  controllers: [EventsController],
  providers: [EventsService, EventStoreService, KafkaEventStreamService],
})
export class AppModule {}
