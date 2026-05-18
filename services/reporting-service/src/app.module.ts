import { HealthController } from './health/health.controller';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ReportingEventsController } from './events/reporting-events.controller';
import { ReportingEventsService } from './events/reporting-events.service';
import { PrismaService } from './prisma/prisma.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'development-secret-change-me',
    }),
  ],
  controllers: [ReportsController, ReportingEventsController, HealthController],
  providers: [ReportsService, ReportingEventsService, PrismaService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
