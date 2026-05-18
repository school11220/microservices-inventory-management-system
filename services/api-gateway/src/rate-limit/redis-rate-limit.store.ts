import type { Store, Options, IncrementResponse, ClientRateLimitInfo } from 'express-rate-limit';
import Redis from 'ioredis';

export class RedisRateLimitStore implements Store {
  readonly localKeys = false;
  readonly prefix = 'inventory:rate-limit:';
  private readonly client: Redis;
  private windowMs = 60_000;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
  }

  init(options: Options) {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const redisKey = this.key(key);
    const hits = await this.client.incr(redisKey);
    if (hits === 1) {
      await this.client.pexpire(redisKey, this.windowMs);
    }
    const ttl = await this.client.pttl(redisKey);
    return {
      totalHits: hits,
      resetTime: new Date(Date.now() + Math.max(ttl, this.windowMs)),
    };
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const redisKey = this.key(key);
    const [value, ttl] = await Promise.all([this.client.get(redisKey), this.client.pttl(redisKey)]);
    if (!value) return undefined;
    return {
      totalHits: Number(value),
      resetTime: new Date(Date.now() + Math.max(ttl, 0)),
    };
  }

  async decrement(key: string): Promise<void> {
    const redisKey = this.key(key);
    const hits = await this.client.decr(redisKey);
    if (hits <= 0) {
      await this.client.del(redisKey);
    }
  }

  async resetKey(key: string): Promise<void> {
    await this.client.del(this.key(key));
  }

  async shutdown(): Promise<void> {
    this.client.disconnect();
  }

  private key(key: string) {
    return `${this.prefix}${key}`;
  }
}
