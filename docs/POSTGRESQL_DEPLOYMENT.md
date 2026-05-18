# PostgreSQL Deployment

This project uses PostgreSQL through Prisma. Each database-backed service owns its own Prisma schema and connection variables:

| Service | Runtime URL | Migration/direct URL |
| --- | --- | --- |
| Auth | `AUTH_DATABASE_URL` | `AUTH_DIRECT_URL` |
| Inventory | `INVENTORY_DATABASE_URL` | `INVENTORY_DIRECT_URL` |
| Orders | `ORDER_DATABASE_URL` | `ORDER_DIRECT_URL` |
| Reporting | `REPORTING_DATABASE_URL` | `REPORTING_DIRECT_URL` |
| Event bus durable log | `EVENT_STORE_DATABASE_URL` | N/A, created automatically |

## Which Connection String To Use

For production with a pooler, use:

- `*_DATABASE_URL`: **Transaction pooler** connection string.
- `*_DIRECT_URL`: **Direct connection** string.
- `Session pooler`: only use it as the `*_DIRECT_URL` fallback if your host cannot reach the provider's direct database host. Do not use the transaction pooler for migrations.

For local Docker or a plain managed PostgreSQL instance with no external pooler, set `*_DATABASE_URL` and `*_DIRECT_URL` to the same normal direct PostgreSQL URL.

## Recommended Production Layout

Keep service data separated. Use either four databases or four schemas.

### Option A: Four Databases

Use this when your provider lets you create databases:

```text
auth_db
inventory_db
order_db
reporting_db
event_bus_db
```

Connection examples:

```bash
AUTH_DATABASE_URL="postgresql://USER:PASSWORD@TRANSACTION_POOLER_HOST:6543/auth_db?schema=public&pgbouncer=true&connection_limit=1"
AUTH_DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_DB_HOST:5432/auth_db?schema=public"

INVENTORY_DATABASE_URL="postgresql://USER:PASSWORD@TRANSACTION_POOLER_HOST:6543/inventory_db?schema=public&pgbouncer=true&connection_limit=1"
INVENTORY_DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_DB_HOST:5432/inventory_db?schema=public"

ORDER_DATABASE_URL="postgresql://USER:PASSWORD@TRANSACTION_POOLER_HOST:6543/order_db?schema=public&pgbouncer=true&connection_limit=1"
ORDER_DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_DB_HOST:5432/order_db?schema=public"

REPORTING_DATABASE_URL="postgresql://USER:PASSWORD@TRANSACTION_POOLER_HOST:6543/reporting_db?schema=public&pgbouncer=true&connection_limit=1"
REPORTING_DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_DB_HOST:5432/reporting_db?schema=public"

EVENT_STORE_DATABASE_URL="postgresql://USER:PASSWORD@TRANSACTION_POOLER_HOST:6543/event_bus_db?schema=public&pgbouncer=true&connection_limit=1"
```

### Option B: One Database, Four Schemas

Use this for providers that give you one database, such as many Supabase setups. Create these schemas first:

```sql
create schema if not exists auth_service;
create schema if not exists inventory_service;
create schema if not exists order_service;
create schema if not exists reporting_service;
create schema if not exists event_bus_service;
```

Connection examples:

```bash
AUTH_DATABASE_URL="postgresql://USER:PASSWORD@TRANSACTION_POOLER_HOST:6543/postgres?schema=auth_service&pgbouncer=true&connection_limit=1"
AUTH_DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_DB_HOST:5432/postgres?schema=auth_service"

INVENTORY_DATABASE_URL="postgresql://USER:PASSWORD@TRANSACTION_POOLER_HOST:6543/postgres?schema=inventory_service&pgbouncer=true&connection_limit=1"
INVENTORY_DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_DB_HOST:5432/postgres?schema=inventory_service"

ORDER_DATABASE_URL="postgresql://USER:PASSWORD@TRANSACTION_POOLER_HOST:6543/postgres?schema=order_service&pgbouncer=true&connection_limit=1"
ORDER_DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_DB_HOST:5432/postgres?schema=order_service"

REPORTING_DATABASE_URL="postgresql://USER:PASSWORD@TRANSACTION_POOLER_HOST:6543/postgres?schema=reporting_service&pgbouncer=true&connection_limit=1"
REPORTING_DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_DB_HOST:5432/postgres?schema=reporting_service"

EVENT_STORE_DATABASE_URL="postgresql://USER:PASSWORD@TRANSACTION_POOLER_HOST:6543/postgres?schema=event_bus_service&pgbouncer=true&connection_limit=1"
```

## Supabase Mapping

If you are using Supabase, use these exact string types:

- Runtime `*_DATABASE_URL`: **Transaction pooler**, usually host like `aws-0-REGION.pooler.supabase.com`, port `6543`.
- Migration `*_DIRECT_URL`: **Direct connection**, usually host like `db.PROJECT_REF.supabase.co`, port `5432`.
- If direct connection is unavailable from your network, use **Session pooler**, host like `aws-0-REGION.pooler.supabase.com`, port `5432`, for `*_DIRECT_URL`.

Supabase-style one-database example:

```bash
AUTH_DATABASE_URL="postgresql://prisma.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?schema=auth_service&pgbouncer=true&connection_limit=1"
AUTH_DIRECT_URL="postgresql://prisma:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?schema=auth_service"
```

Repeat the same pattern for `INVENTORY_*`, `ORDER_*`, `REPORTING_*`, and `EVENT_STORE_DATABASE_URL`, changing only the `schema=` value.

When running the full Docker stack locally against a remote Supabase database, raise the gateway upstream timeout if order creation crosses regions:

```bash
GATEWAY_UPSTREAM_TIMEOUT_MS=30000
```

This avoids false gateway timeouts while the order service waits for the inventory saga and reporting event projections to finish over the remote database connection.

## Migration Order

Run migrations once per deployment, before scaling the services:

```bash
npm run prisma:migrate -w @inventory/auth-service
npm run prisma:migrate -w @inventory/inventory-service
npm run prisma:migrate -w @inventory/order-service
npm run prisma:migrate -w @inventory/reporting-service
```

Then seed initial data if needed:

```bash
npm run seed -w @inventory/auth-service
npm run seed -w @inventory/inventory-service
npm run seed -w @inventory/order-service
npm run seed -w @inventory/reporting-service
```

After that, start or roll out the service containers.

## Local Docker Values

Docker Compose already sets direct local PostgreSQL URLs for both runtime and migrations:

```bash
AUTH_DATABASE_URL=postgresql://inventory:inventory@postgres:5432/auth_db?schema=public
AUTH_DIRECT_URL=postgresql://inventory:inventory@postgres:5432/auth_db?schema=public
```

The other services follow the same pattern.
