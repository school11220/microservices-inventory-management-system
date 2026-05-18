import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import rateLimit from 'express-rate-limit';
import { ProxyController } from './proxy/proxy.controller';
import { ProxyService } from './proxy/proxy.service';
import { RedisRateLimitStore } from './rate-limit/redis-rate-limit.store';

@Module({
  imports: [],
  controllers: [ProxyController],
  providers: [ProxyService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const redisUrl = process.env.REDIS_URL;
    consumer
      .apply(
        rateLimit({
          windowMs: 60_000,
          max: Number(process.env.GATEWAY_RATE_LIMIT_PER_MINUTE ?? 1000),
          standardHeaders: true,
          legacyHeaders: false,
          ...(redisUrl ? { store: new RedisRateLimitStore(redisUrl) } : {}),
        }),
      )
      .forRoutes('*');
  }
}
