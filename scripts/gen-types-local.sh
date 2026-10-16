#!/usr/bin/env bash
# Regenerates lib/database.types.ts without the full Supabase stack: runs the
# same postgres-meta image the Supabase CLI uses against a database built by
# scripts/test-db-local.sh (TEST_DB_NAME, default wedding_web_test).
# Output matches `npm run db:types`; CI still checks drift on real Supabase.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${TEST_DB_NAME:-wedding_web_test}"
IMAGE="${PG_META_IMAGE:-public.ecr.aws/supabase/postgres-meta:v0.100.0}"
DOCKER="${DOCKER:-docker}"
$DOCKER rm -f wedding-pgmeta >/dev/null 2>&1 || true
$DOCKER run -d --name wedding-pgmeta --network host -e PG_META_PORT=18080 \
  -e PG_META_DB_URL="postgresql://${PGUSER:-postgres}@127.0.0.1:${PGPORT:-5432}/${DB}" "$IMAGE" >/dev/null
trap '$DOCKER rm -f wedding-pgmeta >/dev/null' EXIT
for _ in $(seq 30); do curl -sf http://127.0.0.1:18080/health >/dev/null 2>&1 && break; sleep 1; done
curl -sf "http://127.0.0.1:18080/generators/typescript?included_schemas=public&detect_one_to_one_relationships=true" \
  | npx prettier --stdin-filepath lib/database.types.ts > lib/database.types.ts
