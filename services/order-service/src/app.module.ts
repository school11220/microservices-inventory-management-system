import { HealthController } from './health/health.controller';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { EventPublisherService } from './common/event-publisher.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { OrderEventsController } from './events/order-events.controller';
import { OrderEventsService } from './events/order-events.service';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'development-secret-change-me',
    }),
  ],
  controllers: [OrdersController, OrderEventsController, HealthController],
  providers: [OrdersService, OrderEventsService, PrismaService, EventPublisherService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
