#!/usr/bin/env bash
# Builds a throwaway database from tests/db/supabase-stub.sql + all migrations
# + seed.sql on a local PostgreSQL (no Docker), then runs the database tests.
#
#   PGHOST=/tmp PGPORT=54329 PGUSER=postgres scripts/test-db-local.sh
set -euo pipefail
DB="${TEST_DB_NAME:-wedding_web_test}"
cd "$(dirname "$0")/.."
psql -q -v ON_ERROR_STOP=1 -d postgres -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/db/supabase-stub.sql
for f in supabase/migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"
done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/seed.sql
DATABASE_URL="postgresql://${PGUSER:-postgres}@/${DB}?host=${PGHOST:-/tmp}&port=${PGPORT:-5432}" \
  REQUIRE_DB_TESTS=1 npm run test:db
