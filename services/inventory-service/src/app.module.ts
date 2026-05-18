import { HealthController } from './health/health.controller';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { EventPublisherService } from './common/event-publisher.service';
import { InventoryEventsController } from './events/inventory-events.controller';
import { InventoryEventsService } from './events/inventory-events.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './prisma/prisma.service';
import { ProductsController } from './products/products.controller';
import { ProductSearchService } from './products/product-search.service';
import { ProductsService } from './products/products.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'development-secret-change-me',
    }),
  ],
  controllers: [ProductsController, InventoryEventsController, HealthController],
  providers: [ProductsService, ProductSearchService, InventoryEventsService, PrismaService, EventPublisherService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
