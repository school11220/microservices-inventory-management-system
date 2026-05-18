import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { DomainEvent, DomainEventType } from '@inventory/contracts';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import type { DeliveryTarget } from './events.service';

export interface PendingDelivery {
  event: DomainEvent;
  target: DeliveryTarget;
}

@Injectable()
export class EventStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventStoreService.name);
  private readonly pool?: Pool;

  constructor() {
    const connectionString = process.env.EVENT_STORE_DATABASE_URL;
    if (connectionString) {
      this.pool = new Pool({ connectionString, max: 5 });
    }
  }

  get enabled() {
    return Boolean(this.pool);
  }

  async onModuleInit() {
    if (!this.pool) return;
    await this.pool.query(`
      create table if not exists inventory_event_log (
        event_id text primary key,
        type text not null,
        source text not null,
        correlation_id text not null,
        occurred_at timestamptz not null,
        payload jsonb not null
      );

      create table if not exists inventory_event_delivery (
        id bigserial primary key,
        event_id text not null references inventory_event_log(event_id) on delete cascade,
        service text not null,
        url text not null,
        status text not null default 'pending',
        attempts integer not null default 0,
        last_error text,
        next_attempt_at timestamptz not null default now(),
        delivered_at timestamptz,
        unique (event_id, service, url)
      );

      create index if not exists idx_inventory_event_log_type_occurred_at
        on inventory_event_log(type, occurred_at desc);
      create index if not exists idx_inventory_event_delivery_due
        on inventory_event_delivery(status, next_attempt_at);
    `);
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  async append(event: DomainEvent, targets: DeliveryTarget[]) {
    if (!this.pool) return;
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query(
        `
          insert into inventory_event_log(event_id, type, source, correlation_id, occurred_at, payload)
          values ($1, $2, $3, $4, $5, $6)
          on conflict (event_id) do nothing
        `,
        [
          event.eventId,
          event.type,
          event.source,
          event.correlationId,
          event.occurredAt,
          JSON.stringify(event.payload),
        ],
      );

      for (const target of targets) {
        await client.query(
          `
            insert into inventory_event_delivery(event_id, service, url)
            values ($1, $2, $3)
            on conflict (event_id, service, url) do nothing
          `,
          [event.eventId, target.service, target.url],
        );
      }
      await client.query('commit');
    } catch (error) {
      await this.rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  private async rollback(client: PoolClient) {
    try {
      await client.query('rollback');
    } catch (error) {
      this.logger.error(
        `Event store rollback failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async markDelivered(eventId: string, target: DeliveryTarget) {
    if (!this.pool) return;
    await this.pool.query(
      `
        update inventory_event_delivery
        set status = 'delivered',
            attempts = attempts + 1,
            last_error = null,
            delivered_at = now()
        where event_id = $1 and service = $2 and url = $3
      `,
      [eventId, target.service, target.url],
    );
  }

  async markFailed(eventId: string, target: DeliveryTarget, error: string) {
    if (!this.pool) return;
    await this.pool.query(
      `
        update inventory_event_delivery
        set status = 'pending',
            attempts = attempts + 1,
            last_error = $4,
            next_attempt_at = now() + (
              least(power(2, attempts + 1), 300)::int || ' seconds'
            )::interval
        where event_id = $1 and service = $2 and url = $3
      `,
      [eventId, target.service, target.url, error.slice(0, 500)],
    );
  }

  async list(type?: DomainEventType) {
    if (!this.pool) return undefined;
    const params = type ? [type] : [];
    const result = await this.pool.query(
      `
        select event_id, type, source, correlation_id, occurred_at, payload
        from inventory_event_log
        ${type ? 'where type = $1' : ''}
        order by occurred_at desc
        limit 250
      `,
      params,
    );
    return result.rows.map((row) => this.toEvent(row));
  }

  async dueDeliveries(limit = 25): Promise<PendingDelivery[]> {
    if (!this.pool) return [];
    const result = await this.pool.query(
      `
        select
          d.service,
          d.url,
          e.event_id,
          e.type,
          e.source,
          e.correlation_id,
          e.occurred_at,
          e.payload
        from inventory_event_delivery d
        join inventory_event_log e on e.event_id = d.event_id
        where d.status = 'pending'
          and d.next_attempt_at <= now()
        order by d.next_attempt_at asc, d.id asc
        limit $1
      `,
      [limit],
    );
    return result.rows.map((row) => ({
      target: { service: row.service, url: row.url },
      event: this.toEvent(row),
    }));
  }

  private toEvent(row: Record<string, unknown>): DomainEvent {
    return {
      eventId: String(row.event_id),
      type: row.type as DomainEventType,
      source: String(row.source),
      correlationId: String(row.correlation_id),
      occurredAt:
        row.occurred_at instanceof Date
          ? row.occurred_at.toISOString()
          : new Date(String(row.occurred_at)).toISOString(),
      payload: row.payload,
    };
  }
}
