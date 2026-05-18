#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-ChangeMe123!}"

PRODUCT_ID=""
ORDER_ID=""

cleanup() {
  if [[ -n "$ORDER_ID" ]]; then
    curl -fsS -X DELETE "$BASE_URL/orders/$ORDER_ID" -H "authorization: Bearer $TOKEN" >/dev/null || true
  fi
  if [[ -n "$PRODUCT_ID" ]]; then
    curl -fsS -X DELETE "$BASE_URL/products/$PRODUCT_ID" -H "authorization: Bearer $TOKEN" >/dev/null || true
  fi
}

LOGIN_RESPONSE=$(
  curl -fsS -X POST "$BASE_URL/auth/login" \
    -H 'content-type: application/json' \
    -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}"
)
TOKEN=$(node -e "const data=JSON.parse(process.argv[1]); console.log(data.token)" "$LOGIN_RESPONSE")
trap cleanup EXIT

PRODUCT_PAYLOAD=$(node - <<'NODE'
console.log(JSON.stringify({
  name: `Smoke Test Barcode Scanner ${Date.now()}`,
  description: 'Temporary test product for API smoke verification. Automatically removed by the smoke script.',
  category: 'Warehouse Equipment',
  price: 2499,
  stockLevel: 5,
  reorderThreshold: 2
}))
NODE
)

PRODUCT=$(
  curl -fsS -X POST "$BASE_URL/products" \
    -H 'content-type: application/json' \
    -H "authorization: Bearer $TOKEN" \
    -d "$PRODUCT_PAYLOAD"
)
PRODUCT_ID=$(node -e "const data=JSON.parse(process.argv[1]); console.log(data.id)" "$PRODUCT")

ORDER_PAYLOAD=$(
  node -e "console.log(JSON.stringify({customerName:'Aarav Retail LLP', customerEmail:'ops@aaravretail.in', customerAddress:'Indiranagar, Bengaluru, Karnataka 560038', items:[{productId:process.argv[1], quantity:1}]}))" "$PRODUCT_ID"
)
ORDER=$(
  curl -fsS -X POST "$BASE_URL/orders" \
    -H 'content-type: application/json' \
    -H "authorization: Bearer $TOKEN" \
    -d "$ORDER_PAYLOAD"
)
ORDER_ID=$(node -e "const data=JSON.parse(process.argv[1]); console.log(data.id)" "$ORDER")

STATUS=""
for _ in {1..12}; do
  ORDER_STATUS=$(curl -fsS "$BASE_URL/orders/$ORDER_ID" -H "authorization: Bearer $TOKEN")
  STATUS=$(node -e "const data=JSON.parse(process.argv[1]); console.log(data.status)" "$ORDER_STATUS")
  if [[ "$STATUS" == "CONFIRMED" ]]; then
    echo "$ORDER_STATUS"
    echo
    exit 0
  fi
  if [[ "$STATUS" == "FAILED" || "$STATUS" == "CANCELLED" ]]; then
    echo "$ORDER_STATUS"
    echo
    echo "Smoke test failed: order reached $STATUS" >&2
    exit 1
  fi
  sleep 1
done

echo "Smoke test failed: order did not confirm within timeout, last status: $STATUS" >&2
exit 1
