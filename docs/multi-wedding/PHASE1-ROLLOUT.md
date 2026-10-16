# Phase 1 rollout runbook (tenancy in the database)

> **Production is NOT touched by Phase 1 for now.** Phase 1 is validated on a
> separate **staging Supabase project** wired to Vercel **Preview** deployments
> (§2). The production steps (§5) are written down for a later, explicit
> decision and must only be run after the staging rehearsal (§2, §4) passes and
> a verified backup exists (§3).

## 1. What Phase 1 changes

Migrations (applied in this order after the baseline `20261016000000`):

| Migration | Effect |
|---|---|
| `20261016120000_tenancy_core` | `wedding_role` enum; `weddings`, `wedding_members`, `wedding_invitations`, `wedding_domains`, `platform_admins`; helpers `role_rank`, `is_wedding_member`, `wedding_role_of`, `is_platform_admin`, `is_any_wedding_member`, `is_wedding_public` |
| `20261016120100_tenant_columns` | Creates tenant #1 (`00000000-0000-0000-0000-000000000001`, slug `giancat`, status `published`); adds `wedding_id NOT NULL` to 28 tables and assigns every existing row to tenant #1; composite FKs; per-tenant uniqueness; **drops `guests.rsvp_link`** and the `guests_language_check` (replaced by a trigger validating against `weddings.locales`) |
| `20261016120200_membership_rls` | Drops **all** baseline policies; enables + forces RLS on every table; membership-scoped policies |
| `20261016120300_tenant_functions` | `search_document_chunks(p_wedding_id, …)`, `reorder_checklist_items(p_wedding_id, …)`; `v_tavily_metrics` becomes `security_invoker` |
| `20261016120400_tenant1_owners` | Optional: makes the users listed in the DB setting `app.tenant1_owner_emails` owners of tenant #1 (no-op otherwise) |

Application: admin routes use `requireWeddingRole()`; all service-role access
goes through `lib/data/*` (always scoped by `wedding_id`); the dashboard
filters/sets `wedding_id`; guest links come from `lib/links.ts`.

**Compatibility:** the new app needs the new schema and the old app breaks on
it (its inserts lack `wedding_id`, its policies are gone). Database and app must
move together. A Vercel "instant rollback" alone is **not** a rollback.

### Conventions used below

```bash
# Connection strings: use the DIRECT connection or the SESSION pooler (port
# 5432). Never the transaction pooler (6543) for pg_dump/pg_restore/psql tests.
export PROD_DB_URL='postgresql://postgres.<prod-ref>:<password>@<host>:5432/postgres'
export STAGING_DB_URL='postgresql://postgres.<staging-ref>:<password>@<host>:5432/postgres'
# Any command that only reads production MUST run with:
export PROD_RO='-c default_transaction_read_only=on'
```

Client tools must be PostgreSQL **17** (`pg_dump --version`), matching the server.

---

## 2. Staging Supabase project (Phase 1 test environment)

### 2.1 Create and link

1. Supabase dashboard → New project `wedding-web-staging`, same region and
   Postgres major version (17) as production. Save the DB password.
2. Authentication → URL configuration: Site URL = the Preview URL; add
   `https://*-<vercel-team>.vercel.app/**` to the redirect allow-list.
   Disable public sign-ups (Authentication → Providers → Email) as in production.
3. Link the CLI **to staging only**:
   ```bash
   npx supabase link --project-ref <staging-ref>
   npx supabase projects list   # the linked (●) project must be staging
   ```

### 2.2 Option A — empty staging (schema only)

```bash
npx supabase db push            # applies baseline + all Phase 1 migrations
psql "$STAGING_DB_URL" -f supabase/seed.sql
# Optional tenant #1 sample content:
for f in supabase/fixtures/tenant1/*.sql; do psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

### 2.3 Option B — staging with a copy of production data (rehearsal)

This is the rehearsal of the production migration. Production is only **read**.

1. **Dump production (read-only):**
   ```bash
   PGOPTIONS="$PROD_RO" pg_dump "$PROD_DB_URL" \
     --format=custom --no-owner --no-privileges \
     --schema=public --file=prod-public-$(date +%Y%m%d).dump
   pg_restore --list prod-public-*.dump | head        # sanity check
   ```
   (`auth.users` is intentionally NOT copied: staging gets its own test users,
   so no password hashes or sessions leave production.)

2. **Restore into staging** (the dump is the baseline schema + data):
   ```bash
   psql "$STAGING_DB_URL" -c 'CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public'
   # Skip the "CREATE SCHEMA public" and extension entries that already exist.
   pg_restore --list prod-public-*.dump | grep -v -E ' SCHEMA - public | EXTENSION ' > restore.list
   pg_restore --no-owner --no-privileges --exit-on-error \
     --use-list=restore.list --dbname="$STAGING_DB_URL" prod-public-*.dump
   ```

3. **Scrub guest contact data** (mandatory if staging can send e-mail):
   ```sql
   -- psql "$STAGING_DB_URL"
   UPDATE public.guests
      SET email = CASE WHEN email IS NULL OR email = '' THEN email
                       ELSE 'guest+' || left(md5(email), 10) || '@example.invalid' END,
          plus_one_email = NULL, phone = NULL, address = NULL;
   ```

4. **Snapshot row counts and checksums** (save the output as `pre.txt`):
   see the snapshot SQL in §3.3.

5. **Mark the baseline as applied, then apply Phase 1:**
   ```bash
   npx supabase migration list                         # baseline shows as remote-missing
   npx supabase migration repair --status applied 20261016000000
   npx supabase db push --dry-run                      # must list ONLY the 5 Phase 1 migrations
   npx supabase db push
   ```

6. **Run the verification** in §5.5 (counts/checksums must equal `pre.txt`).

### 2.4 Staging users and owners

Create the two owner test users in staging (Authentication → Users → Add user,
with the owners' real addresses or aliases), then run the owner SQL of §5.4
against `$STAGING_DB_URL`.

### 2.5 Database tests against staging

The cross-tenant suite creates and deletes its own fixtures (random ids), so it
is safe on staging — **never run it against production**:

```bash
DATABASE_URL="$STAGING_DB_URL" REQUIRE_DB_TESTS=1 npm run test:db
```

### 2.6 Vercel Preview environment

Vercel → Project → Settings → Environment Variables, scope **Preview** (optionally
restricted to branch `feat/multi-wedding`). Production values stay untouched.

| Variable | Preview value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<staging-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | staging service-role key (sensitive) |
| `NEXT_PUBLIC_APP_URL` | the preview URL (or the branch alias URL) |
| `NEXT_PUBLIC_DEFAULT_WEDDING_ID` | unset (defaults to tenant #1) |
| `ADMIN_EMAILS` | **unset** (owners come from `wedding_members`) |
| `RESEND_API_KEY` | a separate test key, or unset to disable sending |
| `RESEND_FROM_EMAIL` / `EMAIL_CC` / `EMAIL_REPLY_TO` | test values; **no real guest-facing CC** |
| `ENCRYPTION_KEY` | a staging-only key |

Redeploy the branch after changing variables (`vercel redeploy <preview-url>` or
push a commit). Then test in the preview: owner login, dashboard pages, invite
page and RSVP with a staging guest token, invitation e-mail to a test address.

---

## 3. Backups (required before ANY production change)

### 3.1 Full logical backup (custom format, data included), stored off Supabase

```bash
STAMP=$(date +%Y%m%dT%H%M%S)
mkdir -p backups/$STAMP && chmod 700 backups/$STAMP && cd backups/$STAMP

# 1) Everything the app owns: public (schema + data) and auth (users/identities).
PGOPTIONS="$PROD_RO" pg_dump "$PROD_DB_URL" --format=custom --no-owner --no-privileges \
  --schema=public --schema=auth --file=prod-full-$STAMP.dump

# 2) Supabase CLI dumps (plain SQL, useful for a fresh project):
npx supabase db dump --db-url "$PROD_DB_URL" --role-only -f roles.sql
npx supabase db dump --db-url "$PROD_DB_URL" -f schema.sql
npx supabase db dump --db-url "$PROD_DB_URL" --data-only --use-copy -f data.sql

# 3) Verify the archive is readable and lists the tables.
pg_restore --list prod-full-$STAMP.dump | grep -c 'TABLE DATA'

# 4) Checksums, then encrypt and copy to TWO locations outside Supabase
#    (e.g. an encrypted local disk + a private cloud bucket).
sha256sum * > SHA256SUMS
tar czf - . | age -r <your-age-public-key> > ../prod-backup-$STAMP.tar.gz.age
```

If the Supabase plan has PITR, also note the exact timestamp before the change;
PITR is an additional safety net, not a replacement for the off-site dump.

### 3.2 Guest list export (CSV + JSON) — always able to e-mail every guest

```bash
SOURCE_DB_URL="$PROD_DB_URL" scripts/export-guests.sh backups/$STAMP/guests
```

The script is read-only (forces `default_transaction_read_only`), exports
id, name, email, language, invite token, party role/leader, plus-one and
invitation timestamps, checks the row count and writes `SHA256SUMS`. Open the
CSV once to confirm it is complete, and keep it with the encrypted backup.

### 3.3 Row-count and checksum snapshot (before and after)

Checksums ignore the columns Phase 1 adds/removes (`wedding_id`, `rsvp_link`),
so the same query must return identical results before and after migrating.

```sql
-- psql "$DB_URL" -X -A -F ' ' -o pre.txt   (then post.txt after migrating)
DO $$ BEGIN PERFORM set_config('default_transaction_read_only', 'on', false); END $$;
SELECT t.relname AS table_name,
       (xpath('/row/c/text()', query_to_xml(format(
         'SELECT count(*) AS c FROM public.%I', t.relname), false, true, '')))[1]::text AS row_count,
       (xpath('/row/c/text()', query_to_xml(format(
         'SELECT md5(coalesce(string_agg((to_jsonb(x) - ''wedding_id'' - ''rsvp_link'')::text, ''|'' ORDER BY x.id), '''')) AS c FROM public.%I x',
         t.relname), false, true, '')))[1]::text AS checksum
FROM pg_class t JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public' AND t.relkind = 'r'
  AND t.relname NOT IN ('weddings','wedding_members','wedding_invitations','wedding_domains','platform_admins')
ORDER BY 1;
```

```bash
diff pre.txt post.txt && echo "tenant #1 data intact"
```

### 3.4 Restore commands

**Restore into a fresh/staging project (preferred for drills):**
```bash
psql "$TARGET_DB_URL" -c 'CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public'
pg_restore --list prod-full-<STAMP>.dump | grep -v -E ' SCHEMA - (public|auth) | EXTENSION ' > restore.list
# public only (app data):
pg_restore --no-owner --no-privileges --exit-on-error --schema=public \
  --use-list=restore.list --dbname="$TARGET_DB_URL" prod-full-<STAMP>.dump
```

**Roll production back to the backup (only after a failed rollout):**
```bash
# 1) Drop the Phase 1 schema objects and restore public as it was.
psql "$PROD_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
COMMIT;
SQL
pg_restore --list prod-full-<STAMP>.dump | grep -v -E ' SCHEMA - (public|auth) | EXTENSION ' > restore.list
pg_restore --no-owner --no-privileges --exit-on-error --schema=public \
  --use-list=restore.list --dbname="$PROD_DB_URL" prod-full-<STAMP>.dump
# 2) Re-grant API role privileges (--no-privileges skipped them):
psql "$PROD_DB_URL" -c 'GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
                       GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
                       GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;'
# 3) Make the migration history match the restored schema.
npx supabase migration repair --status reverted 20261016120000 20261016120100 20261016120200 20261016120300 20261016120400
# 4) Redeploy the previous production build in Vercel (Deployments → … → Promote / Instant Rollback).
# 5) Verify with §3.3 that the snapshot equals pre.txt.
```
`auth` is not dropped by the rollback (Phase 1 does not change it); restore it
only on a fresh project. Any data written between the backup and the rollback
is lost — the wedding is archived, so the window should be empty; check
`rsvp_responses.updated_at` / `guests.updated_at` first.

### 3.5 Rollback drill on staging (must pass before production)

1. Staging with prod copy (§2.3) **before** `db push`: take the §3.1 dump of
   staging and the `pre.txt` snapshot.
2. `npx supabase db push` (Phase 1), verify (§5.5).
3. Run the §3.4 production-rollback commands against `$STAGING_DB_URL`.
4. Snapshot again: must equal `pre.txt`; the old app (production build pointed
   at staging, or `git checkout 6059b49 && npm run dev`) must work.
5. Re-apply Phase 1 (`migration repair` back is not needed: `db push` sees the
   reverted versions and applies them again) and verify again.

---

## 4. Pre-flight checks (run read-only on production before deciding)

```sql
-- PGOPTIONS="$PROD_RO" psql "$PROD_DB_URL"
-- (a) Event slugs become unique: must return 0 rows.
SELECT slug, count(*) FROM public.events WHERE slug IS NOT NULL GROUP BY slug HAVING count(*) > 1;
-- (b) Guest languages must be in tenant #1 locales {en,pt,es}: must return 0 rows.
SELECT language, count(*) FROM public.guests WHERE language IS NOT NULL AND language NOT IN ('en','pt','es') GROUP BY 1;
-- (c) The owners exist in auth (expect 2 rows). Replace with the two addresses.
SELECT id, email FROM auth.users WHERE lower(email) IN (lower(:'owner1'), lower(:'owner2'));
-- (d) Migration history (expect empty or only the baseline):
SELECT version FROM supabase_migrations.schema_migrations ORDER BY 1;
```

---

## 5. Production rollout (future — only after §2–§4)

1. **Announce / freeze**: no dashboard edits during the window (~10 min).
2. **Backup**: §3.1 + §3.2, and `pre.txt` from §3.3. Confirm the encrypted copy exists in two places.
3. **Migrations**:
   ```bash
   npx supabase link --project-ref <prod-ref>
   npx supabase migration list
   npx supabase migration repair --status applied 20261016000000   # baseline already in prod
   npx supabase db push --dry-run    # exactly the 5 Phase 1 migrations
   npx supabase db push
   ```
   Each migration runs in its own transaction; a failure leaves the previous
   state of that migration intact (fix and re-run, or roll back via §3.4).
4. **Owners of tenant #1** (personal e-mails are passed at run time, never committed):
   ```bash
   psql "$PROD_DB_URL" -v ON_ERROR_STOP=1 -v owner1='<owner 1 e-mail>' -v owner2='<owner 2 e-mail>' <<'SQL'
   INSERT INTO public.wedding_members (wedding_id, user_id, role)
   SELECT '00000000-0000-0000-0000-000000000001', u.id, 'owner'
   FROM auth.users u
   WHERE lower(u.email) IN (lower(:'owner1'), lower(:'owner2'))
   ON CONFLICT (wedding_id, user_id) DO UPDATE SET role = 'owner';
   SELECT m.role, u.email FROM public.wedding_members m JOIN auth.users u ON u.id = m.user_id;  -- expect 2 owners
   SQL
   ```
   (Alternative: `ALTER DATABASE postgres SET app.tenant1_owner_emails = '<e1>,<e2>'`
   before `db push` lets migration `20261016120400` do it; reset it afterwards with
   `ALTER DATABASE postgres RESET app.tenant1_owner_emails`.)
5. **Verify** (before switching the app):
   ```sql
   SELECT count(*) FROM public.weddings;                                     -- 1
   SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity; -- 0 rows
   SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND qual = 'true'; -- 0
   ```
   and §3.3 → `post.txt`, `diff pre.txt post.txt` must be empty.
6. **Environment (Production scope in Vercel)**:
   - `NEXT_PUBLIC_APP_URL` must be set (the old `https://giancat.com` fallback in
     comms was removed; links are built from this variable).
   - Keep `ADMIN_EMAILS` only until step 8 succeeds (transition bootstrap for
     server routes; it does not grant dashboard access). Then **remove it**.
   - `NEXT_PUBLIC_DEFAULT_WEDDING_ID`: leave unset.
7. **Deploy the app** immediately (merge to `main` → Vercel production build).
   Between steps 3 and 7 the old app cannot write.
8. **Smoke test**: owner login → dashboard numbers equal pre-migration; open an
   invite link from `guests.csv`; submit a test RSVP on a test guest; send an
   invitation to your own address; a second, non-member account sees "not a
   member". Then remove `ADMIN_EMAILS` and redeploy.
9. **Rollback criteria**: data mismatch in step 5, or owners cannot use the
   dashboard and a forward fix is not trivial → §3.4.

---

## 6. Known follow-ups

- `seating_assignments_side_check` allows only `A`/`B`, but the seating page writes
  side `H` (head-table seats) — those writes fail today in production. Decide:
  extend the constraint to `H` (new migration) or remove head seats from the UI.
- `get_tavily_stats()` is called by the metrics service but exists nowhere; the
  call always falls back to zeros. Implement it (scoped by `p_wedding_id`) or remove the call.
- `tavily_cache`, `api_logs`, `tokens_usage` are still written from the browser
  (member-scoped RLS); move them server-side in Phase 3 (plan: service_role only).
- Legacy invite links with a guest **UUID** (`?guest=<uuid>`) never resolved for
  anonymous visitors (RLS); only invite-token links work. Phase 2 adds redirects.
- Remove `ADMIN_EMAILS` support (`lib/auth/bootstrap.ts`) once production owners exist.
