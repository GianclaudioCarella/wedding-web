# Database (Supabase CLI)

All schema changes live in `supabase/migrations/` and are managed with the
Supabase CLI. The old hand-applied files are frozen in `database/legacy/`.

| Path                                     | Purpose                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `migrations/20261016000000_baseline.sql` | Full `public` schema as of Phase 0                                        |
| `seed.sql`                               | Generic, non-wedding-specific seed applied by `supabase db reset`         |
| `fixtures/tenant1/`                      | Tenant #1 (current wedding) data: hotels, FAQs, rooms. Never auto-applied |
| `config.toml`                            | Local Supabase stack configuration                                        |

## Local workflow

```bash
npx supabase start          # requires Docker
npx supabase db reset       # applies migrations + seed.sql from zero
npm run db:types            # regenerates lib/database.types.ts from the local DB
npx supabase migration new <name>
```

## Baseline verification against production (done 2026-10-16)

A read-only production dump (`pg_dump --schema-only --no-owner --no-privileges`,
`public` only; PostgreSQL 17.6) was compared with the baseline applied on a
local PostgreSQL 17 + pgvector 0.8.0 and dumped the same way. The baseline was
corrected so both dumps are now identical (except CRLF line endings inside five
production function bodies, which is cosmetic). Production is the source of
truth: insecure policies were kept as-is and are fixed in Phase 1.

Differences found and fixed in the baseline:

- `guests.total_guests integer NOT NULL DEFAULT 1` existed only in production.
- `external_accommodations_name_unique UNIQUE (name)` existed only in production.
- `seating_assignments_side_check` allows only `'A','B'` in production (the repo's
  `'H'` value was never applied).
- `broadcast` column order: `recipient_names` is last in production.
- Comment on `guest_stay_requests.sunday_night` existed only in production.
- RLS: enabled on `events` in production; **not** enabled on `api_logs` and
  `tokens_usage` (their policies exist but are inert).
- Extensions: `pg_stat_statements`, `uuid-ossp`, `pgcrypto` in `extensions`,
  `vector` 0.8.0 in `public`, `supabase_vault` in `vault` (platform-managed).

Notes:

- `get_tavily_stats()` does **not** exist in production either; the app's
  `rpc('get_tavily_stats')` call currently fails and falls back to zeros.
- The colliding `28..30` migrations: production matches the variant reflected
  above (no `'H'` side, `recipient_names` added last).

To re-verify later: `npx supabase db dump --schema public` against production
and the local stack after `npx supabase db reset`, then `diff`.

Remaining step for the project owner:

Mark the baseline as already applied in production so the CLI does not try
to run it there:

```bash
npx supabase migration repair --status applied 20261016000000
```
