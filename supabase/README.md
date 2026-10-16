# Database (Supabase CLI)

All schema changes live in `supabase/migrations/` and are managed with the
Supabase CLI. The old hand-applied files are frozen in `database/legacy/`.

| Path | Purpose |
|---|---|
| `migrations/20261016000000_baseline.sql` | Full `public` schema as of Phase 0 |
| `seed.sql` | Generic, non-wedding-specific seed applied by `supabase db reset` |
| `fixtures/tenant1/` | Tenant #1 (current wedding) data: hotels, FAQs, rooms. Never auto-applied |
| `config.toml` | Local Supabase stack configuration |

## Local workflow

```bash
npx supabase start          # requires Docker
npx supabase db reset       # applies migrations + seed.sql from zero
npm run db:types            # regenerates lib/database.types.ts from the local DB
npx supabase migration new <name>
```

## ⚠️ The baseline must be verified against production

The baseline was **derived from the repository**, not dumped from production
(the production project was intentionally not touched). Before the baseline is
relied on (and before any Phase 1 migration runs against production):

1. Dump the production schema (read-only):
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db dump --schema public -f /tmp/prod_schema.sql
   ```
2. Dump the local schema after `npx supabase db reset`:
   ```bash
   npx supabase db dump --local --schema public -f /tmp/local_schema.sql
   ```
3. `diff` them and reconcile. Known or likely differences to check:
   - `get_tavily_stats()` is called by the app (`rpc('get_tavily_stats')`) but is
     not defined in any migration — it probably exists only in production.
   - Legacy seed `22_` expects a unique constraint on
     `external_accommodations.name` that no migration creates.
   - Which legacy files were actually applied, and in which order
     (`supabase/migrations/28..30` vs `database/28..30`).
   - pgvector schema (`public` here) and Postgres major version
     (`config.toml` says 17).
   - Any policy, index, trigger or function created by hand in the SQL editor.
4. If production differs, regenerate the baseline from the production dump
   (keeping the same file name/timestamp), regenerate types, and commit.
5. Mark the baseline as already applied in production so the CLI does not try
   to run it there:
   ```bash
   npx supabase migration repair --status applied 20261016000000
   ```
