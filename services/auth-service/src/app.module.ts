import { HealthController } from './health/health.controller';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'development-secret-change-me',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as never },
    }),
  ],
  controllers: [AuthController, HealthController],
  providers: [AuthService, PrismaService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
