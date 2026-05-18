import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { DomainEvent } from '@inventory/contracts';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaEventStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaEventStreamService.name);
  private producer?: Producer;
  private connected = false;

  get enabled() {
    return process.env.EVENT_TRANSPORT === 'kafka' || Boolean(process.env.KAFKA_BROKERS);
  }

  get status() {
    return {
      enabled: this.enabled,
      connected: this.connected,
      brokers: process.env.KAFKA_BROKERS ?? null,
      topic: this.topic,
    };
  }

  async onModuleInit() {
    if (!this.enabled) return;
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean);
    const kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID ?? 'inventory-event-bus',
      brokers,
      retry: { retries: 3 },
    });
    this.producer = kafka.producer();
    try {
      await this.producer.connect();
      this.connected = true;
    } catch (error) {
      this.logger.error(
        `Kafka producer connection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (process.env.EVENT_TRANSPORT === 'kafka') {
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    if (!this.producer || !this.connected) return;
    await this.producer.disconnect();
    this.connected = false;
  }

  async publish(event: DomainEvent) {
    if (!this.producer || !this.connected) return;
    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key: event.eventId,
          value: JSON.stringify(event),
          headers: {
            type: event.type,
            source: event.source,
            correlationId: event.correlationId,
          },
        },
      ],
    });
  }

  private get topic() {
    return process.env.KAFKA_EVENTS_TOPIC ?? 'inventory.domain-events';
  }
}
