# Multi-wedding (multi-tenant) technical plan

> Baseline analysed: `GianclaudioCarella/wedding-web` @ `33830b4` (merge of PR #16).
> Stack: Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript, Tailwind 4, Supabase (Postgres / Auth / RLS / pgvector), Resend + Nodemailer (Gmail SMTP), Vercel.
>
> Scope: purely technical. The goal is to let one deployment of this codebase serve many independent weddings with strict data isolation. The existing giancat.com wedding has already taken place, so its data becomes **tenant #1** and can be migrated freely, as long as the data itself is preserved intact.

---

## 0. Current state (what the plan must address)

| Area | Current state (evidence in repo) | Multi-tenant impact |
|---|---|---|
| Schema | ~30 tables (`guests`, `events`, `event_guests`, `guest_events`, `rsvp_responses`, `site_content`, `faq_items`, `registry_items`, `external_accommodations`, `venue_rooms`, `guest_room_assignments`, `guest_stay_requests`, `transport_options`, `guest_transport`, `seating_tables`, `seating_assignments`, `planning_tasks`, `checklists`, `checklist_items`, `email_campaigns`, `chat_*`, `documents`, `document_chunks`, `conversation_summaries`, `tavily_cache`, `user_settings`, `api_logs`, `tokens_usage`) with no `wedding_id` | Every domain table needs a tenant key |
| Schema hardcodes | `guests.rsvp_link` is a **GENERATED** column containing `'https://giancat.com/...'`; `guests.language CHECK IN ('en','pt')` (later `es` in `10_`) | Drop generated column (compute link in app); drop fixed language constraint |
| RLS | `"Allow all for authenticated users"` patterns, `site_content FOR SELECT TO authenticated USING (true)`, documents/chunks visible to every `authenticated` user | With more than one wedding, any signed-in user sees everything — blocker #1 |
| Admin auth | `lib/auth/admin.ts` + `ADMIN_EMAILS`; `requireAdmin()` and `proxy.ts` | Replace with per-wedding roles |
| Migrations | `database/01..33` with duplicate numbers (`11_`, `16_`, `32_`; no `19_`) + `supabase/migrations/28..30` colliding with `database/28..30` | Need a single reproducible baseline |
| i18n | `lib/i18n/{locales,translations}.ts` **and** `lib/translations.ts`; pages copied under `app/pt/*` and `app/es/*` (+ `app/pt/page_new.tsx`) | Unify under `app/[locale]` |
| Content | "Gian & Cat", contact email, `giancat.com`, licensed Söhne font, images in `public/` | Per-wedding theme/content; tenant-specific assets out of the codebase |
| Email | `lib/email/mailer.ts` (Gmail SMTP via nodemailer) + Resend; HTML templates + `translations.json` | One provider (Resend), per-wedding sender identity |
| AI | GPT-4o chat via GitHub Models, Tavily, RAG (`vector(1536)`), `user_settings` stores API keys (`lib/encryption.ts`) | Scope conversations, documents and usage per wedding |
| Legacy | `app/pt/rsvp` inserts guests with the public client | Remove; RSVP only via server-side API |
| Quality | 1 test (`tests/dashboard-stats.test.cjs`), no CI, `next lint` (removed in Next 16) | CI + RLS tests before a second tenant exists |
| Misc | `test-email.js`, `statichost.json`, `web/`, `policy.json` at repo root | Cleanup |

---

## 1. Foundation and cleanup

**Migrations — single set via Supabase CLI**
- Freeze `database/` and the current `supabase/migrations/`. Create a **baseline** from production (`supabase db dump --schema public`, plus roles/extensions as needed) as `supabase/migrations/<timestamp>_baseline.sql`.
- From then on, only `supabase migration new` (timestamped). Move old files to `database/legacy/` with a README explaining they are historical.
- Wedding-specific seed data (hotels, FAQs, rooms: `22_`, `24_`, `30_seed_rooms`) moves to `supabase/seed.sql` (generic) or a tenant #1 fixture — never inside migrations.
- CI applies all migrations from scratch on a local Supabase (`supabase start` / `supabase db reset`) to prove reproducibility.

**Generated types**
- `supabase gen types typescript --local > lib/database.types.ts`; all Supabase clients typed with `Database`. CI fails if generated types drift from migrations.

**Remove legacy code paths**
- Delete `app/pt/rsvp` (public-client inserts). RSVP becomes `POST /api/rsvp` (server-side, token-validated, Zod, rate-limited).
- Remove `test-email.js`, `statichost.json`, `web/` and `policy.json` after confirming they are unused.

**Email: Resend only**
- Remove Nodemailer/Gmail SMTP (`lib/email/mailer.ts`) and route all sending through one `lib/email/send.ts` on Resend.

**Tooling and CI (GitHub Actions)**
- ESLint flat config (`eslint .`) replacing `next lint`; `tsc --noEmit`; Vitest.
- Jobs: lint → typecheck → unit tests → `supabase start` + migrations from zero + RLS tests → `next build`. Optional Playwright against Vercel preview.
- Protect `main` with required checks; Dependabot.
- Input validation with Zod in all Route Handlers.
- Hardcode audit: `rg -n "giancat|Gian & Cat|balfour|Söhne|Sohne"` must return nothing outside tenant #1 fixtures.

---

## 2. Tenancy data model

### 2.1 New tables
```sql
create extension if not exists citext;
create type wedding_role as enum ('owner','partner','planner','editor','viewer');

create table public.weddings (
  id             uuid primary key default gen_random_uuid(),
  slug           citext not null unique
                 check (slug ~ '^[a-z0-9](-?[a-z0-9])*$' and length(slug) between 3 and 40),
  display_name   text not null,
  partner_names  text[] not null default '{}',
  wedding_date   date,
  timezone       text not null default 'Europe/Madrid',
  default_locale text not null default 'en',
  locales        text[] not null default '{en}',
  status         text not null default 'draft' check (status in ('draft','published','archived')),
  contact_email  text,
  theme          jsonb not null default '{}'::jsonb,
  settings       jsonb not null default '{}'::jsonb,   -- rsvp_deadline, feature flags, ai settings...
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (default_locale = any(locales))
);

create table public.wedding_members (
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       wedding_role not null,
  created_at timestamptz not null default now(),
  primary key (wedding_id, user_id)
);
create index on public.wedding_members (user_id);

create table public.wedding_invitations (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  email       citext not null,
  role        wedding_role not null check (role <> 'owner'),
  token_hash  text not null unique,
  invited_by  uuid references auth.users(id),
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz
);

-- Host mapping; empty until subdomains/custom domains are introduced (see §5).
create table public.wedding_domains (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  hostname    citext not null unique,
  is_primary  boolean not null default false,
  verified_at timestamptz
);

create table public.platform_admins (user_id uuid primary key references auth.users(id));
```

### 2.2 Helper function (basis of all policies)
```sql
create or replace function public.role_rank(r wedding_role) returns int
language sql immutable as $$
  select array_position(array['viewer','editor','planner','partner','owner']::wedding_role[], r)
$$;

create or replace function public.is_wedding_member(w uuid, min_role wedding_role default 'viewer')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from wedding_members m
    where m.wedding_id = w and m.user_id = auth.uid()
      and role_rank(m.role) >= role_rank(min_role)
  ) or exists (select 1 from platform_admins p where p.user_id = auth.uid());
$$;
revoke all on function public.is_wedding_member(uuid, wedding_role) from public;
grant execute on function public.is_wedding_member(uuid, wedding_role) to authenticated;
```
Hierarchy: `owner` (delete wedding, manage members) > `partner` (everything except ownership transfer/deletion) > `planner` (all organisation data) > `editor` (content and guests) > `viewer` (read-only).

### 2.3 Add `wedding_id` everywhere and migrate existing data as tenant #1
Fixed UUID for the legacy tenant; run in a transaction, rehearsed first on a copy of production.
```sql
begin;
insert into public.weddings (id, slug, display_name, partner_names, default_locale, locales, status, contact_email)
values ('00000000-0000-0000-0000-000000000001','giancat','Gian & Cat','{Gian,Cat}','en','{en,pt,es}','archived','<contact>');

-- owners = users currently listed in ADMIN_EMAILS
insert into public.wedding_members (wedding_id, user_id, role)
select '00000000-0000-0000-0000-000000000001', u.id, 'owner'
from auth.users u where lower(u.email) = any (array['<email1>','<email2>']);

do $$ declare t text; begin
  foreach t in array array['guests','events','event_guests','guest_events','rsvp_responses','site_content',
    'faq_items','registry_items','external_accommodations','venue_rooms','guest_room_assignments',
    'guest_stay_requests','transport_options','guest_transport','seating_tables','seating_assignments',
    'planning_tasks','checklists','checklist_items','email_campaigns','chat_conversations','chat_messages',
    'chat_settings','documents','document_chunks','conversation_summaries','api_logs','tokens_usage']
  loop
    execute format('alter table public.%I add column if not exists wedding_id uuid references public.weddings(id) on delete cascade', t);
    execute format('update public.%I set wedding_id = %L where wedding_id is null', t, '00000000-0000-0000-0000-000000000001');
    execute format('alter table public.%I alter column wedding_id set not null', t);
    execute format('create index if not exists %I on public.%I (wedding_id)', t||'_wedding_id_idx', t);
  end loop;
end $$;

-- Schema hardcodes
alter table public.guests drop column if exists rsvp_link;            -- link computed in app from wedding host + token
alter table public.guests drop constraint if exists guests_language_check;  -- validated against weddings.locales

-- Uniqueness becomes per tenant
alter table public.events drop constraint if exists events_slug_key;
create unique index events_wedding_slug_uq on public.events (wedding_id, slug);
create unique index if not exists guests_invite_token_uq on public.guests (invite_token);  -- global, high entropy
commit;
```
Notes:
- **`rsvp_link`**: before dropping, grep for all readers (UI, email templates, exports, SQL functions) and replace with `lib/links.ts → guestInviteUrl(wedding, guest, locale)`.
- **`guests.language`**: validated in app (Zod) against `weddings.locales`; optional trigger enforcing `language = any(w.locales)`.
- **Child tables** (`event_guests`, `seating_assignments`, `checklist_items`, `chat_messages`, `document_chunks`, …) get a denormalised `wedding_id` to keep policies join-free. Enforce consistency with composite FKs, e.g. `unique (id, wedding_id)` on `events` and `foreign key (event_id, wedding_id) references events(id, wedding_id)` on `event_guests`, making it impossible to link a guest of one wedding to an event of another.
- `tavily_cache` stays **global** (no personal data), `service_role` only.
- `user_settings` API keys: deprecate in favour of server-side provider keys; move `chat_settings` into `weddings.settings->'ai'`.
- `site_content` (key/value) becomes per wedding + locale: `primary key (wedding_id, key, locale)` (later replaced by `site_sections`, §6).
- No default for `wedding_id` on insert: the data layer always passes it explicitly, so a missing value fails loudly instead of landing in the wrong tenant.
- Tenant #1 is archived/read-only, so no freeze window is needed — but take a full backup/dump first and verify row counts per table before and after.

---

## 3. Membership-scoped RLS

Principle: **the browser never writes directly to sensitive tables**; public (guest) access goes only through Route Handlers / Server Actions with token validation. RLS is the second line of defence and fully protects the dashboard, which uses the user-session client.

```sql
-- 1) drop all existing permissive policies
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname='public' loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop; end $$;

-- 2) template for organisation tables (guests, events, seating_*, planning_tasks, checklists, ...)
alter table public.guests enable row level security;
alter table public.guests force row level security;
create policy guests_select on public.guests for select to authenticated
  using (is_wedding_member(wedding_id,'viewer'));
create policy guests_insert on public.guests for insert to authenticated
  with check (is_wedding_member(wedding_id,'editor'));
create policy guests_update on public.guests for update to authenticated
  using (is_wedding_member(wedding_id,'editor')) with check (is_wedding_member(wedding_id,'editor'));
create policy guests_delete on public.guests for delete to authenticated
  using (is_wedding_member(wedding_id,'partner'));
-- no policy for anon = denied

-- 3) weddings
alter table public.weddings enable row level security;
create policy weddings_select on public.weddings for select to authenticated using (is_wedding_member(id));
create policy weddings_update on public.weddings for update to authenticated
  using (is_wedding_member(id,'partner')) with check (is_wedding_member(id,'partner'));
-- insert only via security-definer RPC create_wedding() that creates wedding + owner membership atomically

-- 4) wedding_members
alter table public.wedding_members enable row level security;
create policy members_select on public.wedding_members for select to authenticated
  using (is_wedding_member(wedding_id));
create policy members_manage on public.wedding_members for all to authenticated
  using (is_wedding_member(wedding_id,'owner'))
  with check (is_wedding_member(wedding_id,'owner') and role <> 'owner');

-- 5) public content (faq_items, events, site_content, registry_items, external_accommodations)
create policy faq_public_read on public.faq_items for select to anon, authenticated
  using (exists (select 1 from weddings w where w.id = wedding_id and w.status = 'published'));
create policy faq_member_write on public.faq_items for all to authenticated
  using (is_wedding_member(wedding_id,'editor')) with check (is_wedding_member(wedding_id,'editor'));

-- 6) AI: conversations private to author AND member
create policy chat_conv_rw on public.chat_conversations for all to authenticated
  using (user_id = auth.uid() and is_wedding_member(wedding_id,'editor'))
  with check (user_id = auth.uid() and is_wedding_member(wedding_id,'editor'));

-- 7) api_logs, tokens_usage, tavily_cache, platform_admins: no policies → service_role only
```

| Table | select | insert/update | delete | anon |
|---|---|---|---|---|
| weddings | member | partner (insert via RPC) | owner (RPC) | — (server) |
| wedding_members / invitations | member | owner | owner | — |
| wedding_domains | member | service_role | service_role | — |
| guests, rsvp_responses, guest_* | viewer | editor | partner | — (RSVP via token API) |
| events, faq_items, site_content, registry_items, external_accommodations | public if `published` | editor | editor | optional read |
| venue_rooms, transport_options, seating_*, planning_tasks, checklists, checklist_items | viewer | editor | editor | — |
| email_campaigns | viewer | editor | partner | — |
| chat_*, conversation_summaries | author + editor | author + editor | author | — |
| documents, document_chunks | viewer | editor | editor | — |
| api_logs, tokens_usage, tavily_cache, platform_admins | service_role | service_role | service_role | — |

**Existing SQL functions** (`match_documents`, metrics in `08_setup_metrics_supabase.sql`, `21_generate_missing_invite_tokens`): make them `security invoker` by default and require a `p_wedding_id` parameter.

**Storage**: buckets keyed by path `weddings/<wedding_id>/...`, policies on `storage.objects`:
```sql
create policy "members write public assets" on storage.objects for insert to authenticated
  with check (bucket_id = 'wedding-public'
              and is_wedding_member(((storage.foldername(name))[2])::uuid, 'editor'));
```

### Cross-tenant tests (release gate)
- Vitest (or pgTAP) against local Supabase. Fixture: weddings A and B, users with each role in A, one user in B, and anon.
- Matrix: for every table × operation × role, assert expected allow/deny. In particular: user of A cannot read/insert/update/delete any row of B; anon cannot read `guests`; `viewer` cannot write; `editor` cannot manage members; composite FKs reject cross-tenant links.
- A meta-test queries `information_schema` / `pg_class` and fails if any public table has a `wedding_id` column but RLS is disabled or not forced, or if a new table lacks `wedding_id` without being on an explicit allow-list.
- API tests: RSVP with valid token / invalid token / token from another wedding.

---

## 4. Replace `ADMIN_EMAILS` with per-wedding roles

- `lib/auth/requireAdmin.ts` → `lib/auth/requireWeddingRole.ts`:
  ```ts
  export async function requireWeddingRole(
    req: NextRequest, weddingId: string, min: WeddingRole = 'editor'
  ): Promise<
    | { ok: true; user: User; supabase: SupabaseClient<Database>; role: WeddingRole }
    | { ok: false; response: NextResponse }
  >
  ```
  Keeps the current cookie/Bearer logic; after `getUser()` it queries `wedding_members` (or RPC `my_role(wedding_id)`), compares rank, and returns 401/403/404 (404 when not a member, to avoid leaking existence).
- `requirePlatformAdmin()` uses `platform_admins` (operators only).
- `ADMIN_EMAILS` remains only as a temporary bootstrap during the migration, then is removed.
- API routes: `/api/admin/*` → `/api/w/[weddingId]/...` (wedding id in path, resolved server-side). Dashboard under `/dashboard/[slug]/...`, with `/dashboard` listing the user's weddings.
- `proxy.ts` only refreshes the session and blocks unauthenticated access to `/dashboard` and `/api/w/*`; **role checks live in handlers** (no DB query per request in the proxy).
- Data layer `lib/data/*`: every function takes `weddingId`; code using `service_role` must go through it (lint rule forbidding `supabaseAdmin.from(` elsewhere).

---

## 5. Routing (domain-agnostic)

The routing design does not depend on owning any particular domain. Start with path-based tenancy, and add host-based resolution later once a domain is available.

```
app/
  dashboard/[slug]/(...)/page.tsx          # couple's dashboard
  w/[slug]/[locale]/page.tsx               # public wedding site
              /[locale]/rsvp, /invite/[token], /faq, ...
  api/...
```
- **Step 1 — `/w/[slug]`**: the public site is resolved by slug in the path. Works on any host, including Vercel preview deployments.
- **Step 2 — host resolution (later)**: `proxy.ts` maps `<slug>.<base-domain>` or a hostname in `wedding_domains` to an internal rewrite of `/w/<slug>/...`. Cached host lookup (`'use cache'` / `unstable_cache` with tag `domain:<host>`). No page code changes — only the proxy.
- `lib/links.ts` builds every public URL (invite links, email links, OG URLs) from the wedding's primary host if one exists, otherwise from `/w/<slug>`. Nothing else constructs URLs.
- Tenant #1: legacy links (`/?guest=<id>`, `/pt/...`, `/es/...`) get permanent redirects to `/w/giancat/<locale>/invite/<token>` (or to the giancat.com host mapping once host resolution exists).
- Cache: public pages with ISR/`'use cache'` + `revalidateTag('wedding:<id>')` on content save.
- Auth cookies live on the dashboard host only; guests never log in, so no cross-domain session sharing is needed.
- `noindex` by default for wedding sites; per-wedding `metadata` and OG images.

---

## 6. Per-wedding config, theme and content

**Theme (`weddings.theme` jsonb, validated with Zod):**
```json
{ "template": "classic|modern|garden",
  "palette": {"primary":"#…","accent":"#…","bg":"#…","text":"#…"},
  "fonts": {"heading":"Cormorant Garamond","body":"Inter"}, "radius":"md",
  "hero": {"imagePath":"weddings/<id>/hero.jpg","overlay":0.3}, "logoText":"G & C" }
```
- Tailwind 4: tokens as CSS variables (`@theme { --color-primary: var(--w-primary) }`) injected on the site layout root. Templates are sets of section components.
- Fonts: a curated set loaded via `next/font/google` or Fontsource. The licensed Söhne font must not be served to other tenants; keep it only for tenant #1 (if licensed) or replace it.
- Tenant-specific images move from `public/` to Supabase Storage under `weddings/<id>/...`.

**Content model:** move from loose `site_content` key/value to ordered sections:
```sql
create table public.site_sections (
  id         uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  type       text not null,   -- hero|story|events|schedule|travel|accommodation|faq|registry|gallery|rsvp|custom
  position   int  not null,
  visible    boolean not null default true,
  content    jsonb not null,  -- { "en": {...}, "pt": {...} } validated by Zod per type
  updated_at timestamptz not null default now()
);
```
- `events`, `faq_items`, `external_accommodations` already use per-locale JSONB (`25_`–`27_`), so the same `{locale: {...}}` convention applies.
- Dashboard editor: a form per section type + live preview (site iframe with a preview token). No free-form page builder.

---

## 7. Unified i18n

- Pick **one** solution: `next-intl` (App Router/RSC support, composes with `proxy.ts`) — recommended — or typed in-house dictionaries.
- Two text layers:
  1. **App UI strings** (buttons, labels, default email copy): `messages/{en,pt,es}.json`, consolidating `lib/i18n/translations.ts`, `lib/translations.ts`, `lib/email/translations.json`, `accommodation-translations.json`.
  2. **Wedding content**: per-locale JSONB in the DB with fallback to `weddings.default_locale`.
- Routes: `/[locale]/...` under the wedding route; allowed locales = `weddings.locales`; detection via invite link (`guests.language`) then `Accept-Language`.
- Remove `app/pt/*`, `app/es/*`, `app/pt/page_new.tsx` after redirects are in place.
- Adding a new locale requires no schema change.
- CI script fails when a key exists in `en` and is missing in another locale.

---

## 8. Per-wedding email

- Single provider: **Resend**. One sending module `lib/email/send.ts(weddingId, template, to, data)`.
- Sender: display name from `weddings.display_name`, address on a verified sending domain configured by env (SPF/DKIM/DMARC), and **`Reply-To: weddings.contact_email`**. Optional later: per-wedding verified domains via the Resend domains API.
- Templates: migrate `template.html` / `accommodation-template.html` to React Email, themed per wedding and localised; include plain-text versions.
- `email_messages` table (`wedding_id`, `guest_id`, `template`, `resend_id`, `status`) + Resend webhook (`delivered/bounced/complained`) for status and suppression lists per wedding.
- Per-wedding rate limits; batch sends via a queue/background job (`after()` + cron, or a queue service) instead of the synchronous loop in `broadcast.ts`.
- Unsubscribe link in campaign emails.

---

## 9. AI scoped per tenant

- Every AI table (`chat_conversations`, `chat_messages`, `conversation_summaries`, `documents`, `document_chunks`, `tokens_usage`, `api_logs`) carries `wedding_id`; RLS as in §3.
- RAG: `match_documents(p_wedding_id uuid, query_embedding vector(1536), k int)` filters by `wedding_id` before/with ANN search (HNSW + filter, partial indexes, or pgvector ≥ 0.8 iterative scan if recall degrades with many tenants).
- AI tools/function-calling receive the `weddingId` from the authenticated context, never from model output; tools can only read that wedding's data.
- Provider abstraction `lib/ai/provider.ts` (e.g. Vercel AI SDK), with server-side keys; deprecate per-user keys in `user_settings`. Re-evaluate GitHub Models suitability for multi-tenant use.
- Usage accounting per wedding (`tokens_usage` with `wedding_id`), per-wedding rate limits and configurable hard caps.
- Tavily cache stays global; calls are attributed per wedding.
- AI on/off and settings per wedding in `weddings.settings->'ai'`.

---

## 10. Phased roadmap (PR-sized)

Estimates for one experienced full-stack developer (working days, ±30%).

### Phase 0 — Foundation and cleanup (~1.5–2 weeks)
| # | PR | Effort |
|---|---|---|
| 0.1 | ESLint flat config + `tsc --noEmit` + Vitest + GitHub Actions | 1d |
| 0.2 | Supabase CLI baseline (prod dump → single migration), `database/` → `database/legacy/`, seeds split out | 1.5d |
| 0.3 | Generated Supabase types + typed clients + drift check in CI | 0.5d |
| 0.4 | Remove legacy `app/pt/rsvp`; RSVP only via server API with token + Zod + rate limit | 1d |
| 0.5 | Resend only (remove Nodemailer/Gmail), React Email for existing templates | 1.5d |
| 0.6 | RLS tests of current state (documents the gaps) + error monitoring | 1d |
| 0.7 | Remove stray root files, local setup README | 0.5d |

**Acceptance:** CI green on `main` with required checks; `supabase db reset` rebuilds the schema from zero and types match; no browser-side writes to sensitive tables; no Nodemailer dependency; production behaviour unchanged.

### Phase 1 — Tenancy in the database (~2–2.5 weeks)
| # | PR | Effort |
|---|---|---|
| 1.1 | Migration: `weddings`, `wedding_members`, `wedding_invitations`, `wedding_domains`, `platform_admins`, `is_wedding_member()` | 1d |
| 1.2 | Migration: `wedding_id` on all tables + tenant #1 backfill + composite FKs + drop generated `rsvp_link` + drop language CHECK + per-tenant uniqueness | 2d |
| 1.3 | RLS rewrite (drop permissive policies, per-table template) + cross-tenant test matrix + meta-test | 2d |
| 1.4 | `requireWeddingRole()` / `requirePlatformAdmin()`; APIs take `wedding_id`; `ADMIN_EMAILS` bootstrap only | 2d |
| 1.5 | Data layer `lib/data/*` always filtering by `wedding_id` (including service_role) + lint rule | 2d |
| 1.6 | SQL/RAG functions (`match_documents`, metrics, invite tokens) with `p_wedding_id` | 1d |
| 1.7 | Rehearsal on a production copy, runbook, rollback plan | 1d |

**Acceptance:** tenant #1 data intact (row counts and checksums match pre-migration); all tables have non-null `wedding_id` and forced RLS; cross-tenant matrix passes in CI; no code path reads `ADMIN_EMAILS` except the bootstrap; no reference to `giancat.com` in schema.

### Phase 2 — Routing, i18n, theme and content (~3 weeks)
| # | PR | Effort |
|---|---|---|
| 2.1 | `/w/[slug]` public site + `lib/links.ts`; redirects for tenant #1 legacy URLs | 2d |
| 2.2 | next-intl + `[locale]`; consolidate translation sources; missing-key CI check | 3d |
| 2.3 | Delete copied `app/pt/*` / `app/es/*` pages | 1d |
| 2.4 | Theme via CSS variables + 2–3 templates; free font set; tenant images to Storage + storage policies | 3d |
| 2.5 | `site_sections` + migration of tenant #1 `site_content` | 2d |
| 2.6 | Dashboard under `/dashboard/[slug]` (move `/admin/*`), wedding switcher | 2d |
| 2.7 | Per-wedding cache tags, metadata/OG, `noindex` default | 1d |

**Acceptance:** a second test wedding is fully reachable at `/w/<slug>` with its own theme, locales and content, with no shared data visible; tenant #1 renders from DB/Storage only; old URLs redirect; a single i18n system in the codebase.

### Phase 3 — Membership management, per-wedding email and AI (~2–3 weeks)
| # | PR | Effort |
|---|---|---|
| 3.1 | `create_wedding()` RPC + sign-in (magic link/OAuth) + minimal creation flow | 2d |
| 3.2 | Member invitations (`wedding_invitations`) + role management UI | 2d |
| 3.3 | Section editor + preview | 3d |
| 3.4 | Per-wedding email (sender, Reply-To, `email_messages`, webhook, queued batches, rate limits) | 2d |
| 3.5 | AI scoping: `wedding_id` on AI tables, `match_documents(p_wedding_id…)`, provider abstraction, per-wedding usage + caps | 3d |
| 3.6 | Back-office modules (accommodation, transport, seating, checklists, campaigns) reviewed for tenancy | 3d |
| 3.7 | Playwright E2E: create wedding → publish → guest RSVPs → visible in dashboard; cross-tenant negative cases | 1.5d |

**Acceptance:** a new user can create a wedding and invite a partner with a role; emails for wedding B carry B's identity and never A's data; AI retrieval/chat for B never returns A's documents (tested); E2E suite green in CI.

### Phase 4 — Host-based routing (once a domain exists) (~1 week)
| # | PR | Effort |
|---|---|---|
| 4.1 | `proxy.ts` host → slug resolution (wildcard subdomains + `wedding_domains`), cached | 2d |
| 4.2 | Custom-domain verification flow (provider domains API, DNS instructions, verification job) | 3d |
| 4.3 | `lib/links.ts` prefers primary host; map tenant #1 to its original host | 0.5d |

**Acceptance:** the same wedding is served identically via `/w/<slug>`, its subdomain and a verified custom domain; unknown hosts 404; host spoofing tests (`Host` header) pass.

---

## 11. Risks

1. **Cross-tenant leaks** from a forgotten policy or unfiltered `service_role` use → FORCE RLS, single data layer, test matrix + meta-test in CI, lint rule.
2. **Data loss for tenant #1** during migration → full backup, rehearsal on a production copy, row-count/checksum verification, rollback runbook.
3. **Broken links** already sent (`?guest=<uuid>`, `/pt?guest=`) → permanent redirects with tests (lower impact since the wedding is over, but keep them).
4. **Hidden readers of `rsvp_link`** (templates, exports, SQL) breaking on drop → grep audit and replace with `lib/links.ts` first.
5. **Licensed assets** (Söhne, photos) leaking to other tenants → tenant-scoped storage, font catalogue of free fonts.
6. **Email reputation** shared across tenants → dedicated sending domain, per-wedding limits, bounce/complaint suppression.
7. **pgvector recall/performance** with tenant filtering at scale → filtered indexes / iterative scan, monitoring.
8. **Personal data** (dietary needs, phone, address) now from many tenants → per-wedding export/delete, logs tagged with `wedding_id`, region choice.
9. **Scope**: the back-office has many screens to adapt; mitigate by doing data-layer changes first so UI changes are mechanical.

---

## 12. Technical open questions

1. Who are the owners of tenant #1 (the users currently in `ADMIN_EMAILS`) and should any other members be added?
2. Should tenant #1 be `archived` (read-only) or `published` after migration?
3. Do `web/`, `statichost.json` and `policy.json` have any remaining use?
4. i18n library: `next-intl` or typed in-house dictionaries?
5. Which back-office modules (accommodation/rooms, transport, seating, campaigns) must be tenant-ready in the first pass versus hidden behind flags?
6. AI provider: keep GitHub Models or move to a direct provider API; keep any "bring your own key" support in `user_settings` or remove it?
7. Is a public guest-facing AI chat in scope, or AI only inside the dashboard?
8. Supabase plan/features available (PITR, branching per PR, image transformations) — affects CI and rehearsal strategy.
9. Background job mechanism for email batches: `after()` + cron, Vercel Queues, or an external queue?
10. RLS test tooling: Vitest against local Supabase or pgTAP?
11. Is the Söhne license valid for web use, or should tenant #1 also switch to a free font?
12. Should wedding sites support optional password protection in addition to `noindex`?
13. Keep the per-wedding `timezone` default (`Europe/Madrid`) or require it at creation?
