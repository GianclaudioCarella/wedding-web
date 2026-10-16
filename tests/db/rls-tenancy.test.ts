/**
 * Cross-tenant RLS release gate (PLAN.md §3). Runs against a real database
 * built from supabase/migrations (CI: local Supabase; locally:
 * scripts/test-db-local.sh). Skipped when DATABASE_URL is not set, unless
 * REQUIRE_DB_TESTS=1.
 *
 * These replace the Phase 0 "GAP" characterisation tests with secure
 * assertions: each former gap has a matching test below.
 */
import { randomUUID } from 'node:crypto'
import type { Client } from 'pg'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  as, connect, describeDb, newWedding, PUBLIC_CONTENT_TABLES, TENANT_TABLES, weddingFixtureSql, type Actor,
} from './helpers'

const GLOBAL_TABLES = ['platform_admins', 'tavily_cache', 'user_settings', 'weddings']
const UNFORCED_HELPER_TABLES = ['platform_admins', 'wedding_members']

describe.runIf(describeDb)('multi-tenant RLS', () => {
  let db: Client
  const A = newWedding()
  const B = newWedding()
  const DRAFT = newWedding()
  const users = {
    ownerA: randomUUID(), partnerA: randomUUID(), editorA: randomUUID(), viewerA: randomUUID(),
    ownerB: randomUUID(), outsider: randomUUID(), platformAdmin: randomUUID(),
  }
  const user = (id: string): Actor => ({ role: 'authenticated', userId: id })
  const anon: Actor = { role: 'anon' }
  const count = async (actor: Actor, table: string, weddingId: string) => {
    const r = await as(db, actor, `SELECT count(*)::int AS n FROM public.${table} WHERE wedding_id = $1`, [weddingId])
    expect(r.error).toBeUndefined()
    return r.rows[0].n as number
  }

  beforeAll(async () => {
    db = await connect()
    const values = Object.entries(users).map(([k, id]) => `('${id}', '${k}-${id}@example.test')`).join(',')
    await db.query(`INSERT INTO auth.users (id, email) VALUES ${values}`)
    await db.query(weddingFixtureSql(A, users.ownerA, `a-${A.id.slice(0, 8)}`))
    await db.query(weddingFixtureSql(B, users.ownerB, `b-${B.id.slice(0, 8)}`))
    await db.query(weddingFixtureSql(DRAFT, users.ownerB, `d-${DRAFT.id.slice(0, 8)}`, 'draft'))
    await db.query(`
      INSERT INTO public.wedding_members (wedding_id, user_id, role) VALUES
        ('${A.id}', '${users.ownerA}', 'owner'), ('${A.id}', '${users.partnerA}', 'partner'),
        ('${A.id}', '${users.editorA}', 'editor'), ('${A.id}', '${users.viewerA}', 'viewer'),
        ('${B.id}', '${users.ownerB}', 'owner'), ('${DRAFT.id}', '${users.ownerB}', 'owner');
      INSERT INTO public.platform_admins (user_id) VALUES ('${users.platformAdmin}');`)
  })

  afterAll(async () => {
    if (!db) return
    await db.query('DELETE FROM public.weddings WHERE id = ANY($1)', [[A.id, B.id, DRAFT.id]])
    await db.query('DELETE FROM auth.users WHERE id = ANY($1)', [Object.values(users)])
    await db.end()
  })

  describe('meta (catalog) checks', () => {
    test('every public table has RLS enabled, and forced unless it backs the role helpers', async () => {
      const { rows } = await db.query(`
        SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1`)
      for (const r of rows) {
        expect(r.relrowsecurity, `${r.relname} RLS enabled`).toBe(true)
        if (!UNFORCED_HELPER_TABLES.includes(r.relname)) expect(r.relforcerowsecurity, `${r.relname} RLS forced`).toBe(true)
      }
    })

    test('every table outside the global allow-list has a NOT NULL wedding_id without default', async () => {
      const { rows } = await db.query(`
        SELECT c.relname AS table, a.attnotnull AS notnull, pg_get_expr(d.adbin, d.adrelid) AS def
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'wedding_id' AND NOT a.attisdropped
        LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
        WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1`)
      for (const r of rows) {
        if (GLOBAL_TABLES.includes(r.table)) continue
        expect(r.notnull, `${r.table}.wedding_id NOT NULL`).toBe(true)
        expect(r.def, `${r.table}.wedding_id has no default`).toBeNull()
      }
      expect(rows.map((r) => r.table).filter((t) => !GLOBAL_TABLES.includes(t)).sort()).toEqual(
        [...TENANT_TABLES, 'wedding_domains', 'wedding_invitations', 'wedding_members'].sort(),
      )
    })

    test('no policy is unconditional or applies to the PUBLIC pseudo-role (was: "Allow all for authenticated", email_campaigns open to anon)', async () => {
      const { rows } = await db.query(`SELECT tablename, policyname, roles::text[] AS roles, qual, with_check FROM pg_policies WHERE schemaname = 'public'`)
      for (const p of rows) {
        expect(p.roles, `${p.tablename}.${p.policyname} roles`).not.toContain('public')
        expect(p.qual ?? 'x', `${p.tablename}.${p.policyname} USING`).not.toBe('true')
        expect(p.with_check ?? 'x', `${p.tablename}.${p.policyname} WITH CHECK`).not.toBe('true')
        expect(`${p.qual} ${p.with_check}`).not.toMatch(/auth\.role\(\)/)
      }
    })

    test('anon policies exist only for public content and always require a published wedding', async () => {
      const { rows } = await db.query(`SELECT tablename, cmd, qual FROM pg_policies WHERE schemaname = 'public' AND 'anon' = ANY (roles)`)
      expect([...new Set(rows.map((r) => r.tablename))].sort()).toEqual(PUBLIC_CONTENT_TABLES)
      for (const r of rows) {
        expect(r.cmd).toBe('SELECT')
        expect(r.qual).toMatch(/is_wedding_public\(wedding_id\)/)
      }
    })

    test('no generated column or hardcoded domain remains in the schema', async () => {
      const { rows } = await db.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND is_generated = 'ALWAYS'`)
      expect(rows).toEqual([])
      const defs = await db.query(`SELECT pg_get_functiondef(p.oid) AS d FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.probin IS NULL`)
      for (const r of defs.rows) expect(r.d).not.toMatch(/giancat\.com/)
    })

    test('views run with the caller\'s privileges', async () => {
      const { rows } = await db.query(`SELECT relname, reloptions FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'v'`)
      for (const r of rows) expect(r.reloptions ?? [], r.relname).toContain('security_invoker=true')
    })
  })

  describe('read isolation', () => {
    // Public content of a *published* wedding is readable by everyone (that is
    // the public site), so isolation is asserted on the unpublished wedding.
    const PRIVATE = (t: string) => (PUBLIC_CONTENT_TABLES.includes(t) ? DRAFT : A)

    test.each(TENANT_TABLES)('%s: a member of another wedding sees nothing', async (table) => {
      expect(await count(user(users.editorA), table, DRAFT.id)).toBe(0)
      expect(await count(user(users.ownerB), table, A.id)).toBe(PUBLIC_CONTENT_TABLES.includes(table) ? 1 : 0)
      expect(await count(user(users.ownerA), table, B.id)).toBe(PUBLIC_CONTENT_TABLES.includes(table) ? 1 : 0)
      expect(await count(user(users.ownerA), table, A.id)).toBe(1)
    })

    test.each(TENANT_TABLES)('%s: an authenticated non-member sees nothing private (was: any authenticated user)', async (table) => {
      expect(await count(user(users.outsider), table, PRIVATE(table).id)).toBe(0)
    })

    test.each(PUBLIC_CONTENT_TABLES.filter((t) => t !== 'site_content'))('%s: inactive public rows are hidden from non-members', async (table) => {
      await db.query(`UPDATE public.${table} SET is_active = false WHERE wedding_id = $1`, [A.id])
      try {
        expect(await count(anon, table, A.id)).toBe(0)
        expect(await count(user(users.ownerB), table, A.id)).toBe(0)
        expect(await count(user(users.viewerA), table, A.id)).toBe(1)
      } finally {
        await db.query(`UPDATE public.${table} SET is_active = true WHERE wedding_id = $1`, [A.id])
      }
    })

    test.each(TENANT_TABLES)('%s: anon reads only active public content of published weddings', async (table) => {
      const expected = PUBLIC_CONTENT_TABLES.includes(table) ? 1 : 0
      expect(await count(anon, table, A.id)).toBe(expected)
      expect(await count(anon, table, DRAFT.id)).toBe(0)
    })

    test('a viewer reads guest data but not other members\' chats', async () => {
      expect(await count(user(users.viewerA), 'guests', A.id)).toBe(1)
      expect(await count(user(users.viewerA), 'chat_conversations', A.id)).toBe(0)
      expect(await count(user(users.editorA), 'chat_messages', A.id)).toBe(0)
      expect(await count(user(users.editorA), 'conversation_summaries', A.id)).toBe(0)
    })

    test('a platform admin can read every wedding', async () => {
      expect(await count(user(users.platformAdmin), 'guests', A.id)).toBe(1)
      expect(await count(user(users.platformAdmin), 'guests', B.id)).toBe(1)
    })

    test('weddings and members are visible only to members', async () => {
      const r = await as(db, user(users.ownerA), `SELECT id FROM public.weddings WHERE id = ANY($1)`, [[A.id, B.id]])
      expect(r.rows.map((x) => x.id)).toEqual([A.id])
      const m = await as(db, user(users.ownerA), `SELECT count(*)::int AS n FROM public.wedding_members WHERE wedding_id = $1`, [B.id])
      expect(m.rows[0].n).toBe(0)
      const anonW = await as(db, anon, `SELECT count(*)::int AS n FROM public.weddings`)
      expect(anonW.ok ? anonW.rows[0].n : 0).toBe(0)
    })

    test('RAG search never returns chunks of another wedding', async () => {
      const vec = `array_fill(0.1::real, ARRAY[1536])::public.vector`
      const own = await as(db, user(users.ownerA), `SELECT content FROM public.search_document_chunks($1, ${vec}, 2, 10)`, [A.id])
      expect(own.rows.map((r) => r.content)).toEqual([expect.stringMatching(/^secret a-/)])
      const other = await as(db, user(users.ownerA), `SELECT content FROM public.search_document_chunks($1, ${vec}, 2, 10)`, [B.id])
      expect(other.rows).toEqual([])
    })

    test('the metrics view respects RLS', async () => {
      const r = await as(db, user(users.ownerB), `SELECT count(*)::int AS n FROM public.v_tavily_metrics WHERE wedding_id = $1`, [A.id])
      expect(r.rows[0].n).toBe(0)
    })
  })

  describe('write isolation', () => {
    test.each(TENANT_TABLES)('%s: a member of B can neither update nor delete rows of A', async (table) => {
      const upd = await as(db, user(users.ownerB), `UPDATE public.${table} SET wedding_id = wedding_id WHERE wedding_id = $1`, [A.id])
      expect(upd.rowCount).toBe(0)
      const del = await as(db, user(users.ownerB), `DELETE FROM public.${table} WHERE wedding_id = $1`, [A.id])
      expect(del.rowCount).toBe(0)
    })

    test('a member of B cannot insert rows into A', async () => {
      const r = await as(db, user(users.ownerB), `INSERT INTO public.guests (wedding_id, name) VALUES ($1, 'x')`, [A.id])
      expect(r.ok).toBe(false)
      expect(r.code).toBe('42501')
    })

    test('a member of A cannot move a row to B', async () => {
      const r = await as(db, user(users.ownerA), `UPDATE public.guests SET wedding_id = $1 WHERE id = $2`, [B.id, A.ids.guests])
      expect(r.ok).toBe(false)
    })

    test('anon cannot write anything (was: email_campaigns open to every role)', async () => {
      for (const sql of [
        `INSERT INTO public.email_campaigns (wedding_id, subject, body) VALUES ('${A.id}', 's', 'b')`,
        `INSERT INTO public.guests (wedding_id, name) VALUES ('${A.id}', 'x')`,
        `INSERT INTO public.api_logs (wedding_id, api_name) VALUES ('${A.id}', 'x')`,
      ]) {
        expect((await as(db, anon, sql)).ok).toBe(false)
      }
      const del = await as(db, anon, `DELETE FROM public.email_campaigns WHERE wedding_id = $1`, [A.id])
      expect(del.rowCount).toBe(0)
    })

    test('viewer cannot write; editor can write but not delete guests; partner can', async () => {
      const ins = `INSERT INTO public.guests (wedding_id, name) VALUES ('${A.id}', 'n')`
      expect((await as(db, user(users.viewerA), ins)).ok).toBe(false)
      expect((await as(db, user(users.viewerA), `UPDATE public.faq_items SET sort_order = 9 WHERE wedding_id = $1`, [A.id])).rowCount).toBe(0)
      expect((await as(db, user(users.editorA), ins)).ok).toBe(true)
      expect((await as(db, user(users.editorA), `UPDATE public.guests SET notes = 'n' WHERE id = $1`, [A.ids.guests])).rowCount).toBe(1)
      expect((await as(db, user(users.editorA), `DELETE FROM public.guests WHERE id = $1`, [A.ids.guests])).rowCount).toBe(0)
      expect((await as(db, user(users.partnerA), `DELETE FROM public.guests WHERE id = $1`, [A.ids.guests])).rowCount).toBe(1)
    })

    test('usage logs can only be appended for oneself (were: RLS disabled)', async () => {
      const own = await as(db, user(users.editorA), `INSERT INTO public.api_logs (wedding_id, api_name, user_id) VALUES ($1, 'x', $2)`, [A.id, users.editorA])
      expect(own.ok).toBe(true)
      const spoof = await as(db, user(users.editorA), `INSERT INTO public.tokens_usage (wedding_id, model, provider, user_id) VALUES ($1, 'm', 'p', $2)`, [A.id, users.ownerA])
      expect(spoof.ok).toBe(false)
      const upd = await as(db, user(users.ownerA), `UPDATE public.api_logs SET success = false WHERE wedding_id = $1`, [A.id])
      expect(upd.rowCount).toBe(0)
    })

    test('documents can only be uploaded as oneself by an editor', async () => {
      const sql = `INSERT INTO public.documents (wedding_id, filename, file_type, file_size, uploaded_by) VALUES ($1, 'f', 't', 1, $2)`
      expect((await as(db, user(users.editorA), sql, [A.id, users.editorA])).ok).toBe(true)
      expect((await as(db, user(users.editorA), sql, [A.id, users.ownerA])).ok).toBe(false)
      expect((await as(db, user(users.viewerA), sql, [A.id, users.viewerA])).ok).toBe(false)
    })
  })

  describe('membership management', () => {
    const add = (role: string) => `INSERT INTO public.wedding_members (wedding_id, user_id, role) VALUES ('${A.id}', '${users.outsider}', '${role}')`

    test('only owners manage members, and never grant owner', async () => {
      expect((await as(db, user(users.editorA), add('viewer'))).ok).toBe(false)
      expect((await as(db, user(users.partnerA), add('viewer'))).ok).toBe(false)
      expect((await as(db, user(users.ownerB), add('viewer'))).ok).toBe(false)
      expect((await as(db, user(users.ownerA), add('owner'))).ok).toBe(false)
      expect((await as(db, user(users.ownerA), add('editor'))).ok).toBe(true)
    })

    test('owners cannot be demoted or removed through the API roles', async () => {
      const r = await as(db, user(users.ownerA), `DELETE FROM public.wedding_members WHERE wedding_id = $1 AND user_id = $2`, [A.id, users.ownerA])
      expect(r.rowCount).toBe(0)
    })

    test('platform_admins and wedding creation are service_role only', async () => {
      expect((await as(db, user(users.ownerA), `INSERT INTO public.platform_admins (user_id) VALUES ($1)`, [users.ownerA])).ok).toBe(false)
      expect((await as(db, user(users.ownerA), `INSERT INTO public.weddings (slug, display_name) VALUES ('evil-x', 'x')`)).ok).toBe(false)
      expect((await as(db, { role: 'service_role' }, `INSERT INTO public.weddings (slug, display_name) VALUES ('svc-x', 'x')`)).ok).toBe(true)
    })

    test('role helpers report the caller\'s role', async () => {
      const r = await as(db, user(users.editorA), `SELECT public.wedding_role_of($1) AS r, public.is_wedding_member($1, 'editor') AS e, public.is_wedding_member($1, 'partner') AS p`, [A.id])
      expect(r.rows[0]).toEqual({ r: 'editor', e: true, p: false })
    })
  })

  describe('integrity', () => {
    test('composite foreign keys reject cross-tenant links, even for service_role', async () => {
      const r = await as(db, { role: 'service_role' },
        `INSERT INTO public.guest_events (wedding_id, guest_id, event_id) VALUES ($1, $2, $3)`, [A.id, A.ids.guests, B.ids.events])
      expect(r.ok).toBe(false)
      expect(r.code).toBe('23503')
      const r2 = await as(db, { role: 'service_role' },
        `INSERT INTO public.rsvp_responses (wedding_id, guest_id, event_id) VALUES ($1, $2, $3)`, [B.id, A.ids.guests, B.ids.events])
      expect(r2.code).toBe('23503')
    })

    test('wedding_id is required on insert', async () => {
      const r = await as(db, { role: 'service_role' }, `INSERT INTO public.guests (name) VALUES ('x')`)
      expect(r.code).toBe('23502')
    })

    test('guest language is validated against the wedding locales', async () => {
      const ok = await as(db, { role: 'service_role' }, `INSERT INTO public.guests (wedding_id, name, language) VALUES ($1, 'x', 'pt')`, [A.id])
      expect(ok.ok).toBe(true)
      const bad = await as(db, { role: 'service_role' }, `INSERT INTO public.guests (wedding_id, name, language) VALUES ($1, 'x', 'es')`, [A.id])
      expect(bad.code).toBe('23514')
    })

    test('per-tenant uniqueness: the same keys can exist in two weddings', async () => {
      // Fixtures already insert site_content 'hero', chat_settings 'system_message',
      // accommodation 'Hotel' and event slug 'party' in both A and B.
      const dup = await as(db, { role: 'service_role' }, `INSERT INTO public.site_content (wedding_id, key) VALUES ($1, 'hero')`, [A.id])
      expect(dup.code).toBe('23505')
    })

    test('tenant #1 exists for the existing wedding', async () => {
      const { rows } = await db.query(`SELECT slug::text, status, locales FROM public.weddings WHERE id = '00000000-0000-0000-0000-000000000001'`)
      expect(rows).toEqual([{ slug: 'giancat', status: 'published', locales: ['en', 'pt', 'es'] }])
    })
  })
})
