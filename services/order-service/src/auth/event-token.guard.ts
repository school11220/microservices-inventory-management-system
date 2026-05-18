import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class EventTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INTERNAL_EVENT_TOKEN;
    if (!expected) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const actual = request.headers['x-event-token'];
    if (actual !== expected) {
      throw new ForbiddenException('Invalid event token');
    }
    return true;
  }
}
