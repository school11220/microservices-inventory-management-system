import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { getServiceMetrics } from '@inventory/contracts';
import type { Request, Response as ExpressResponse } from 'express';
import { CircuitBreaker } from './circuit-breaker';

interface Target {
  name: string;
  baseUrl: string;
}

@Injectable()
export class ProxyService {
  private readonly circuitBreaker = new CircuitBreaker({
    failureThreshold: Number(process.env.GATEWAY_CIRCUIT_FAILURE_THRESHOLD ?? 5),
    resetAfterMs: Number(process.env.GATEWAY_CIRCUIT_RESET_MS ?? 30_000),
  });
  private readonly inFlightByTarget = new Map<string, number>();
  private readonly bulkheadLimit = Number(process.env.GATEWAY_BULKHEAD_LIMIT ?? 100);
  private readonly upstreamTimeoutMs = Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS ?? 8_000);

  private readonly targets = {
    auth: {
      name: 'auth-service',
      baseUrl: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
    },
    inventory: {
      name: 'inventory-service',
      baseUrl: process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3002',
    },
    order: {
      name: 'order-service',
      baseUrl: process.env.ORDER_SERVICE_URL ?? 'http://localhost:3003',
    },
    reporting: {
      name: 'reporting-service',
      baseUrl: process.env.REPORTING_SERVICE_URL ?? 'http://localhost:3004',
    },
    eventBus: {
      name: 'event-bus-service',
      baseUrl: process.env.EVENT_BUS_URL ?? 'http://localhost:3005',
    },
  };

  async proxy(request: Request, response: ExpressResponse) {
    const normalizedPath = this.stripApiPrefix(request.path);
    const normalizedOriginalUrl = this.stripApiPrefix(request.originalUrl);

    if (normalizedPath === '/health') {
      return this.health(response);
    }
    if (normalizedPath === '/metrics') {
      return response.status(200).json(getServiceMetrics('api-gateway').snapshot());
    }
    if (normalizedPath === '/metrics/prometheus') {
      response.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
      return response.status(200).send(getServiceMetrics('api-gateway').prometheus());
    }

    const target = this.resolveTarget(normalizedPath);
    if (!target) {
      throw new NotFoundException('No upstream service route matched');
    }

    if (!this.isPublicPath(normalizedPath)) {
      await this.verifyJwt(request.headers.authorization);
    }

    const upstreamUrl = `${target.baseUrl}${normalizedOriginalUrl}`;
    const upstreamResponse = await this.resilientFetch(target, upstreamUrl, request);

    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) {
      response.setHeader('content-type', contentType);
    }
    response.status(upstreamResponse.status);
    const text = await upstreamResponse.text();
    if (!text) {
      return response.send();
    }
    return response.send(text);
  }

  private resolveTarget(path: string): Target | undefined {
    if (path.startsWith('/auth')) return this.targets.auth;
    if (
      path.startsWith('/products') ||
      path.startsWith('/inventory') ||
      path.startsWith('/public/products')
    )
      return this.targets.inventory;
    if (path.startsWith('/orders')) return this.targets.order;
    if (path.startsWith('/reports')) return this.targets.reporting;
    if (path.startsWith('/events') || path.startsWith('/subscriptions'))
      return this.targets.eventBus;
    return undefined;
  }

  private isPublicPath(path: string): boolean {
    return (
      path === '/health' ||
      path === '/auth/login' ||
      path === '/auth/register' ||
      path === '/auth/verify' ||
      path.startsWith('/public/products')
    );
  }

  private stripApiPrefix(value: string): string {
    const stripped = value.replace(/^\/api(?=\/|$)/, '').replace(/^\/v1(?=\/|$)/, '');
    return stripped || '/';
  }

  private async verifyJwt(authorization?: string) {
    const [type, token] = authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const response = await this.circuitBreaker.execute('auth-service', () =>
      this.fetchWithTimeout(`${this.targets.auth.baseUrl}/auth/verify`, {
        method: 'POST',
        headers: authorization ? { authorization } : {},
      }),
    );
    if (!response.ok) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async resilientFetch(target: Target, url: string, request: Request): Promise<Response> {
    return this.withBulkhead(target.name, () =>
      this.circuitBreaker.execute(target.name, async () => {
        const attempts = this.isRetryableMethod(request.method) ? 3 : 1;
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= attempts; attempt += 1) {
          try {
            const response = await this.fetchWithTimeout(url, {
              method: request.method,
              headers: this.forwardHeaders(request),
              body: ['GET', 'HEAD'].includes(request.method)
                ? undefined
                : JSON.stringify(request.body ?? {}),
            });
            if (response.status < 500 || attempt === attempts) {
              return response;
            }
            lastError = new ServiceUnavailableException(
              `${target.name} returned ${response.status}`,
            );
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
          }
          await this.delay(attempt * 100);
        }

        throw lastError ?? new ServiceUnavailableException(`${target.name} unavailable`);
      }),
    );
  }

  private async withBulkhead<T>(targetName: string, operation: () => Promise<T>): Promise<T> {
    const inFlight = this.inFlightByTarget.get(targetName) ?? 0;
    if (inFlight >= this.bulkheadLimit) {
      throw new ServiceUnavailableException(`${targetName} bulkhead limit reached`);
    }
    this.inFlightByTarget.set(targetName, inFlight + 1);
    try {
      return await operation();
    } finally {
      this.inFlightByTarget.set(targetName, Math.max(0, (this.inFlightByTarget.get(targetName) ?? 1) - 1));
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.upstreamTimeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      throw new ServiceUnavailableException(
        `Upstream request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private isRetryableMethod(method: string): boolean {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method);
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private forwardHeaders(request: Request): Record<string, string> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (request.headers.authorization) headers.authorization = request.headers.authorization;
    if (request.headers['x-correlation-id'])
      headers['x-correlation-id'] = String(request.headers['x-correlation-id']);
    if (request.headers['x-event-token'])
      headers['x-event-token'] = String(request.headers['x-event-token']);
    return headers;
  }

  private async health(response: ExpressResponse) {
    const services = await Promise.all(
      Object.values(this.targets).map(async (target) => {
        const url = `${target.baseUrl}/health`;
        const ok = await fetch(url)
          .then((res) => res.ok)
          .catch(() => false);
        return { service: target.name, ok, url };
      }),
    );
    const allOk = services.every((service) => service.ok);
    return response.status(allOk ? 200 : 503).json({ status: allOk ? 'ok' : 'degraded', services });
  }
}
