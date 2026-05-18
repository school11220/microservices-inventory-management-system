#!/usr/bin/env bash
set -euo pipefail

export AUTH_DATABASE_URL='postgresql://inventory:inventory@postgres:5432/auth_db?schema=public'
export AUTH_DIRECT_URL='postgresql://inventory:inventory@postgres:5432/auth_db?schema=public'
export INVENTORY_DATABASE_URL='postgresql://inventory:inventory@postgres:5432/inventory_db?schema=public'
export INVENTORY_DIRECT_URL='postgresql://inventory:inventory@postgres:5432/inventory_db?schema=public'
export ORDER_DATABASE_URL='postgresql://inventory:inventory@postgres:5432/order_db?schema=public'
export ORDER_DIRECT_URL='postgresql://inventory:inventory@postgres:5432/order_db?schema=public'
export REPORTING_DATABASE_URL='postgresql://inventory:inventory@postgres:5432/reporting_db?schema=public'
export REPORTING_DIRECT_URL='postgresql://inventory:inventory@postgres:5432/reporting_db?schema=public'
export EVENT_STORE_DATABASE_URL='postgresql://inventory:inventory@postgres:5432/event_bus_db?schema=public'
export REDIS_URL='redis://redis:6379'
export SEARCH_BACKEND="${SEARCH_BACKEND:-postgres}"
export EVENT_TRANSPORT="${EVENT_TRANSPORT:-http}"

docker compose up -d --build "$@"
