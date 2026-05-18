# Microservices Inventory Management System Deliverables Audit

Source of truth: `project.pdf`.

## Functional Requirements

| PDF ID | Requirement                                                                                             | Status   | Evidence                                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01    | Service discovery / API gateway with routing and JWT auth proxy                                         | Complete | `services/api-gateway` routes `/auth`, `/products`, `/inventory`, `/orders`, `/reports`, `/events`; protected paths call `/auth/verify` before proxying.         |
| F02    | Authentication service with JWT issuance, validation, and roles                                         | Complete | `auth-service` supports register, login, `/auth/me`, `/auth/verify`, and `ADMIN` / `STAFF` roles.                                                                |
| F03    | Inventory service with product CRUD, stock levels, low-stock alerts, atomic updates, optimistic locking | Complete | `inventory-service` exposes product CRUD, stock update endpoints, version checks, low-stock event publishing, and tests for stock events.                        |
| F04    | Orders service with order creation, status tracking, payment simulation, saga flow                      | Complete | `order-service` creates orders, records payment/status history, publishes `OrderCreated`, and consumes stock outcomes.                                           |
| F05    | Event bus with async communication, at-least-once delivery, idempotency                                 | Complete | `event-bus-service` stores events, retries delivery, supports optional Kafka mirroring, and consumers store processed event IDs.                                 |
| F06    | Reporting and search with aggregations, faceted search, realtime stock metrics                          | Complete | `reporting-service` projects sales, inventory, alerts, and event audit data; product search supports OpenSearch and PostgreSQL category facets.                  |
| F07    | Resilience patterns: circuit breakers, retries, timeouts, bulkheads                                     | Complete | Gateway has timeout, retry, circuit breaker, rate limiting, and per-upstream bulkhead logic. Event bus retries delivery.                                         |
| F08    | Observability: structured logs, metrics, tracing/correlation                                            | Complete | Shared middleware emits JSON logs, request metrics, Prometheus metrics, and `x-correlation-id` across services; Grafana/Prometheus/Jaeger profiles are included. |

## Project Submission Deliverables

| PDF deliverable                    | Status                | Notes                                                                                                                                                                                                                            |
| ---------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project Documentation / Report PDF | Repo-ready            | `docs/Microservices_Inventory_Management_System_Report.html` is the editable report source. Export to PDF for final upload if `docs/Microservices_Inventory_Management_System_Report.pdf` is not present after local conversion. |
| Live Public Demo URL               | External input needed | Requires a hosting target, public domain, HTTPS/TLS, container registry, and production secrets. See `docs/DEPLOYMENT_RUNBOOK.md`.                                                                                               |
| GitHub Repository                  | External input needed | This workspace is not a Git repository. Create/push a GitHub repo before final submission.                                                                                                                                       |
| README.md per project              | Complete              | Root `README.md` is aligned to the `Microservices Inventory Management System` title and includes run, verify, and deployment notes.                                                                                             |
| Demo Video                         | External input needed | Record a 3-7 minute walkthrough after the public deployment is online.                                                                                                                                                           |

## Current Verification

- `npm run verify`: passed.
- `npm run lint`: passed.
- `docker compose config --quiet`: passed.
- `BASE_URL=http://localhost:3000 ./scripts/smoke-test.sh`: passed against Docker Compose.
- `LOAD_TEST_URL=http://localhost:3000/health LOAD_TEST_REQUESTS=1000 npm run load:test`: passed cleanly after the rate-limit window reset, with 0 failures and >1000 requests/minute.

## Non-Code Items You Must Provide

- GitHub repository URL.
- Public HTTPS deployment URL.
- Container registry namespace or account.
- Production database, Redis, Kafka, and OpenSearch URLs if using managed services.
- Production secrets: `JWT_SECRET`, `INTERNAL_EVENT_TOKEN`, database passwords/URLs, and optional `GRAFANA_ADMIN_PASSWORD`.
- Demo video URL.
