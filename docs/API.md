# API Contract

Base URL through the gateway: `http://localhost:3000`.

Kubernetes ingress can also expose the gateway under `/api`; for example, `https://inventory.example.com/api/auth/login` is normalized by the gateway to `/auth/login` before forwarding upstream.

The gateway also accepts `/v1` and `/api/v1` prefixes for backward-compatible versioned clients; for example, `/api/v1/products` forwards to `/products`.

## Platform

- `GET /health` returns gateway health and upstream service health.
- `GET /metrics` returns JSON request metrics with uptime, request totals, in-flight requests, average duration, and status buckets.
- `GET /metrics/prometheus` returns Prometheus text-format metrics.
- Every response includes `x-correlation-id`; callers may provide the same header to trace requests across services.

## Auth

- `POST /auth/register` with `{ "username": string, "password": string, "role": "ADMIN" | "STAFF" }`
- Public registration creates `STAFF` users. `ADMIN` self-registration is blocked unless `ALLOW_PUBLIC_ADMIN_REGISTRATION=true`.
- `POST /auth/login` with `{ "username": string, "password": string }` returns `{ token, user }`
- `GET /auth/me` with `Authorization: Bearer <token>`

## Products and Inventory

- `GET /products?page=1&limit=20&search=&category=`
- `GET /public/products`
- `GET /products/:id`
- `POST /products`
- `PUT /products/:id`
- `DELETE /products/:id`
- `POST /products/search/reindex` rebuilds the OpenSearch/Elasticsearch index from PostgreSQL when `SEARCH_BACKEND=opensearch`.
- `PUT /inventory/:id/stock` with `{ "delta": 10, "expectedVersion": 1 }`
- `POST /inventory/bulk-update` with `{ "items": [{ "productId": string, "delta": number }] }`

## Orders

- `POST /orders` with `{ "customerName": string, "customerEmail"?: string, "customerAddress"?: string, "items": [{ "productId": string, "quantity": number }] }`
- `GET /orders?page=1&limit=20&status=CONFIRMED`
- `GET /orders/:id`
- `PUT /orders/:id/status` with `{ "status": "SHIPPED" }`
- `DELETE /orders/:id`
- Order responses include `paymentStatus`, `paymentReference`, and `statusHistory`.

## Reports

- `GET /reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /reports/inventory`
- `GET /reports/stock-alerts`
- `GET /reports/events?type=StockSucceeded`
- Reporting projections consume `StockAdjusted`, `StockLow`, and `ProductDeleted` events from inventory changes.

## Resilience Controls

The gateway applies rate limiting, per-service bulkhead limits, upstream request timeouts, retry attempts for safe HTTP methods, and circuit breakers for upstream failures. Configure these with `GATEWAY_RATE_LIMIT_PER_MINUTE`, `GATEWAY_BULKHEAD_LIMIT`, `GATEWAY_UPSTREAM_TIMEOUT_MS`, `GATEWAY_CIRCUIT_FAILURE_THRESHOLD`, and `GATEWAY_CIRCUIT_RESET_MS`. Set `REDIS_URL` to use Redis-backed distributed rate limiting.
