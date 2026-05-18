export type UserRole = 'ADMIN' | 'STAFF';

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SHIPPED';

export interface AuthenticatedUser {
  sub: string;
  username: string;
  role: UserRole;
}

export interface ProductSummary {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  stockLevel: number;
  reorderThreshold: number;
  imageUrl?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface OrderCreatedPayload {
  orderId: string;
  items: OrderItemInput[];
  total: number;
  customerInfo: {
    name: string;
    email?: string;
    address?: string;
  };
}

export interface StockSucceededPayload {
  orderId: string;
  total: number;
  items: Array<{
    productId: string;
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
    remainingStock: number;
    reorderThreshold: number;
  }>;
}

export interface StockFailedPayload {
  orderId: string;
  reason: string;
  items: Array<{ productId: string; requested: number; available: number }>;
}

export interface StockAdjustedPayload {
  productId: string;
  name: string;
  category: string;
  stockLevel: number;
  reorderThreshold: number;
  delta: number;
}

export interface StockLowPayload {
  productId: string;
  name: string;
  stockLevel: number;
  reorderThreshold: number;
}

export interface OrderCancelledPayload {
  orderId: string;
  reason: string;
  items: StockFailedPayload['items'];
}

export interface ProductDeletedPayload {
  productId: string;
  name: string;
  category: string;
}

export type DomainEventType =
  | 'OrderCreated'
  | 'StockSucceeded'
  | 'StockFailed'
  | 'OrderCancelled'
  | 'StockAdjusted'
  | 'StockLow'
  | 'ProductDeleted';

export interface DomainEvent<TPayload = unknown> {
  eventId: string;
  type: DomainEventType;
  source: string;
  correlationId: string;
  occurredAt: string;
  payload: TPayload;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
  correlationId?: string;
}

export interface ServiceMetricsSnapshot {
  service: string;
  uptimeSeconds: number;
  requestsTotal: number;
  inFlightRequests: number;
  averageDurationMs: number;
  statusCounts: Record<string, number>;
}

interface HttpLikeRequest {
  method?: string;
  path?: string;
  originalUrl?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface HttpLikeResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  on(event: 'finish', listener: () => void): void;
}

type NextFunction = () => void;

class ServiceMetrics {
  private readonly startedAt = Date.now();
  private requestsTotal = 0;
  private inFlightRequests = 0;
  private totalDurationMs = 0;
  private readonly statusCounts: Record<string, number> = {};

  constructor(private readonly service: string) {}

  start() {
    this.requestsTotal += 1;
    this.inFlightRequests += 1;
  }

  finish(statusCode: number, durationMs: number) {
    this.inFlightRequests = Math.max(0, this.inFlightRequests - 1);
    this.totalDurationMs += durationMs;
    const bucket = `${Math.floor(statusCode / 100)}xx`;
    this.statusCounts[bucket] = (this.statusCounts[bucket] ?? 0) + 1;
  }

  snapshot(): ServiceMetricsSnapshot {
    return {
      service: this.service,
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      requestsTotal: this.requestsTotal,
      inFlightRequests: this.inFlightRequests,
      averageDurationMs:
        this.requestsTotal === 0
          ? 0
          : Number((this.totalDurationMs / this.requestsTotal).toFixed(2)),
      statusCounts: { ...this.statusCounts },
    };
  }

  prometheus(): string {
    const snapshot = this.snapshot();
    const serviceLabel = sanitizePrometheusLabel(this.service);
    const lines = [
      '# HELP inventory_service_uptime_seconds Service uptime in seconds.',
      '# TYPE inventory_service_uptime_seconds gauge',
      `inventory_service_uptime_seconds{service="${serviceLabel}"} ${snapshot.uptimeSeconds}`,
      '# HELP inventory_http_requests_total Total HTTP requests handled by the service.',
      '# TYPE inventory_http_requests_total counter',
      `inventory_http_requests_total{service="${serviceLabel}"} ${snapshot.requestsTotal}`,
      '# HELP inventory_http_requests_in_flight In-flight HTTP requests.',
      '# TYPE inventory_http_requests_in_flight gauge',
      `inventory_http_requests_in_flight{service="${serviceLabel}"} ${snapshot.inFlightRequests}`,
      '# HELP inventory_http_request_duration_average_ms Average HTTP request duration in milliseconds.',
      '# TYPE inventory_http_request_duration_average_ms gauge',
      `inventory_http_request_duration_average_ms{service="${serviceLabel}"} ${snapshot.averageDurationMs}`,
      '# HELP inventory_http_responses_total HTTP responses grouped by status code family.',
      '# TYPE inventory_http_responses_total counter',
      ...Object.entries(snapshot.statusCounts).map(
        ([statusFamily, count]) =>
          `inventory_http_responses_total{service="${serviceLabel}",status_family="${sanitizePrometheusLabel(statusFamily)}"} ${count}`,
      ),
    ];
    return `${lines.join('\n')}\n`;
  }
}

const metricsByService = new Map<string, ServiceMetrics>();

export function getServiceMetrics(service: string): ServiceMetrics {
  let metrics = metricsByService.get(service);
  if (!metrics) {
    metrics = new ServiceMetrics(service);
    metricsByService.set(service, metrics);
  }
  return metrics;
}

export function createObservabilityMiddleware(service: string) {
  const metrics = getServiceMetrics(service);
  return (request: HttpLikeRequest, response: HttpLikeResponse, next: NextFunction) => {
    const startedAt = Date.now();
    const correlationId = getOrCreateCorrelationId(request);
    response.setHeader('x-correlation-id', correlationId);
    metrics.start();

    response.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      metrics.finish(response.statusCode, durationMs);
      writeStructuredLog({
        level: response.statusCode >= 500 ? 'error' : response.statusCode >= 400 ? 'warn' : 'info',
        service,
        correlationId,
        method: request.method,
        path: request.originalUrl ?? request.path,
        statusCode: response.statusCode,
        durationMs,
      });
    });

    next();
  };
}

function getOrCreateCorrelationId(request: HttpLikeRequest): string {
  const existing = request.headers['x-correlation-id'];
  const correlationId = Array.isArray(existing) ? existing[0] : existing;
  if (correlationId) return correlationId;

  const generated = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  request.headers['x-correlation-id'] = generated;
  return generated;
}

function writeStructuredLog(entry: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`);
}

function sanitizePrometheusLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
