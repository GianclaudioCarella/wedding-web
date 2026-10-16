#!/usr/bin/env bash
# Read-only export of the guest list (names, e-mails, language, invite tokens
# and party links) to CSV and JSON, so every guest can always be e-mailed
# even if the database is unavailable. Works on the pre- and post-Phase-1
# schema (it only reads columns present in both).
#
#   SOURCE_DB_URL='postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres' \
#     scripts/export-guests.sh [output-dir]
#
# The session is forced read-only (default_transaction_read_only=on), so the
# script cannot modify the source database. Output contains personal data:
# store it encrypted, outside the repository.
set -euo pipefail
: "${SOURCE_DB_URL:?Set SOURCE_DB_URL to the database connection string}"
OUT="${1:-./guest-export-$(date +%Y%m%dT%H%M%S)}"
mkdir -p "$OUT"
chmod 700 "$OUT"
export PGOPTIONS='-c default_transaction_read_only=on'

QUERY="SELECT g.id, g.name, g.email, g.language, g.invite_token, g.party_role,
              g.party_leader_id, l.name AS party_leader_name, g.plus_one_name, g.plus_one_email,
              g.invited_at, g.created_at
       FROM public.guests g
       LEFT JOIN public.guests l ON l.id = g.party_leader_id
       ORDER BY coalesce(l.name, g.name), g.party_leader_id NULLS FIRST, g.name"

psql "$SOURCE_DB_URL" -v ON_ERROR_STOP=1 -X -q \
  -c "\\copy ($QUERY) TO '$OUT/guests.csv' WITH (FORMAT csv, HEADER true)"
psql "$SOURCE_DB_URL" -v ON_ERROR_STOP=1 -X -q -A -t \
  -c "SELECT coalesce(json_agg(row_to_json(x)), '[]'::json) FROM ($QUERY) x" > "$OUT/guests.json"

ROWS=$(psql "$SOURCE_DB_URL" -X -q -A -t -c "SELECT count(*) FROM public.guests")
CSV_ROWS=$(( $(wc -l < "$OUT/guests.csv") - 1 ))
echo "guests in database: $ROWS, exported: $CSV_ROWS -> $OUT/guests.csv, $OUT/guests.json"
[ "$ROWS" = "$CSV_ROWS" ] || { echo "Row count mismatch (multi-line values?) - check the CSV" >&2; exit 1; }
(cd "$OUT" && sha256sum guests.csv guests.json > SHA256SUMS)
