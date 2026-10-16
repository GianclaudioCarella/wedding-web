/**
 * Documents the CURRENT row-level-security posture encoded in the baseline
 * migration. These tests are a characterisation of today's behaviour, not a
 * statement of what is desirable: several assertions pin known gaps (marked
 * "GAP") that Phase 1 (membership-scoped RLS) must close. When a Phase 1
 * migration fixes a gap, update the corresponding assertion deliberately.
 *
 * They run without a database by parsing supabase/migrations/*.sql. Behavioural
 * RLS tests against a local Supabase stack are planned for Phase 1.
 */
import { describe, expect, test } from 'vitest'
import { loadMigrationsSql, parsePolicies, parseRlsEnabledTables, parseTables, type Policy } from './helpers/baseline-sql'

const sql = loadMigrationsSql()
const tables = parseTables(sql)
const rlsEnabled = parseRlsEnabledTables(sql)
const policies = parsePolicies(sql)

const appliesTo = (p: Policy, role: string) => p.roles.includes(role) || p.roles.includes('public')
const isUnconditional = (p: Policy) => (p.using ?? 'true') === 'true' && (p.withCheck ?? 'true') === 'true'
const tablesWhere = (pred: (p: Policy) => boolean) => [...new Set(policies.filter(pred).map((p) => p.table))].sort()

describe('baseline RLS posture (characterisation)', () => {
  test('the baseline defines the expected 30 public tables', () => {
    expect(tables).toHaveLength(30)
  })

  test('GAP: every table has RLS enabled except events', () => {
    expect(tables.filter((t) => !rlsEnabled.includes(t))).toEqual(['events'])
  })

  test('GAP: no table uses FORCE ROW LEVEL SECURITY', () => {
    expect(sql).not.toMatch(/FORCE ROW LEVEL SECURITY/)
  })

  test('anon can read only public site data', () => {
    const anonReadable = tablesWhere(
      (p) => p.roles.includes('anon') && (p.command === 'SELECT' || p.command === 'ALL'),
    )
    expect(anonReadable).toEqual([
      'external_accommodations',
      'faq_items',
      'registry_items',
      'site_content',
      'transport_options',
    ])
    for (const p of policies.filter((p) => p.roles.includes('anon') && p.table !== 'site_content')) {
      expect(p.using).toBe('is_active = true')
    }
  })

  test('GAP: email_campaigns policy named "service role" actually grants ALL to every role, including anon', () => {
    const [policy] = policies.filter((p) => p.table === 'email_campaigns')
    expect(policy).toMatchObject({ command: 'ALL', roles: ['public'], using: 'true', withCheck: 'true' })
  })

  test('guests are never exposed to anon; RSVP writes go through service_role', () => {
    expect(policies.filter((p) => p.table === 'guests' && p.roles.includes('anon'))).toEqual([])
    for (const table of ['rsvp_responses', 'guest_stay_requests']) {
      const writers = policies.filter((p) => p.table === table && p.command !== 'SELECT')
      expect(writers.length).toBeGreaterThan(0)
      expect(writers.every((p) => p.roles.join() === 'service_role')).toBe(true)
    }
  })

  test('GAP (multi-tenant blocker): any authenticated user has unconditional access to these tables', () => {
    expect(tablesWhere((p) => appliesTo(p, 'authenticated') && isUnconditional(p))).toEqual([
      'api_logs',
      'checklist_items',
      'checklists',
      'email_campaigns',
      'event_guests',
      'events',
      'external_accommodations',
      'faq_items',
      'guest_events',
      'guest_room_assignments',
      'guest_stay_requests',
      'guest_transport',
      'guests',
      'registry_items',
      'rsvp_responses',
      'seating_assignments',
      'seating_tables',
      'site_content',
      'tavily_cache',
      'tokens_usage',
      'transport_options',
      'venue_rooms',
    ])
  })

  test('GAP: documents, chunks, settings and planning are readable by any authenticated user', () => {
    expect(
      tablesWhere((p) => (p.command === 'SELECT' || p.command === 'ALL') && p.using === "auth.role() = 'authenticated'::text"),
    ).toEqual(['chat_settings', 'document_chunks', 'documents', 'planning_tasks'])
  })

  test('per-user data is scoped to auth.uid()', () => {
    for (const table of ['chat_conversations', 'conversation_summaries', 'user_settings']) {
      const ps = policies.filter((p) => p.table === table)
      expect(ps.map((p) => p.command).sort()).toEqual(['DELETE', 'INSERT', 'SELECT', 'UPDATE'])
      for (const p of ps) expect(p.using ?? p.withCheck).toBe('auth.uid() = user_id')
    }
  })
})
