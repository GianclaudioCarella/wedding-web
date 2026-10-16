import { afterEach, describe, expect, test, vi } from 'vitest'
import { isBootstrapAdmin } from '@/lib/auth/bootstrap'
import { isValidInviteToken } from '@/lib/auth/inviteToken'
import { decideWeddingAccess } from '@/lib/auth/requireWeddingRole'
import { DEFAULT_WEDDING_ID, hasRole, requestedWeddingId, roleRank } from '@/lib/tenant'

const OTHER = '11111111-2222-3333-4444-555555555555'

describe('role hierarchy', () => {
  test('mirrors public.role_rank()', () => {
    expect(['viewer', 'editor', 'planner', 'partner', 'owner'].map((r) => roleRank(r as never))).toEqual([1, 2, 3, 4, 5])
    expect(hasRole('owner', 'partner')).toBe(true)
    expect(hasRole('editor', 'planner')).toBe(false)
    expect(hasRole(null, 'viewer')).toBe(false)
  })
})

describe('decideWeddingAccess (replaces ADMIN_EMAILS)', () => {
  afterEach(() => vi.unstubAllEnvs())

  test('non-members get 404, members below the minimum role get 403', () => {
    vi.stubEnv('ADMIN_EMAILS', '')
    expect(decideWeddingAccess(null, 'viewer', { email: 'x@example.com', weddingId: DEFAULT_WEDDING_ID })).toEqual({ ok: false, status: 404 })
    expect(decideWeddingAccess('viewer', 'editor', { weddingId: OTHER })).toEqual({ ok: false, status: 403 })
    expect(decideWeddingAccess('editor', 'editor', { weddingId: OTHER })).toEqual({ ok: true, role: 'editor' })
  })

  test('was GAP: with ADMIN_EMAILS unset, an authenticated non-member is NOT an admin', () => {
    vi.stubEnv('ADMIN_EMAILS', '')
    expect(isBootstrapAdmin('anyone@example.com', DEFAULT_WEDDING_ID)).toBe(false)
    expect(decideWeddingAccess(null, 'editor', { email: 'anyone@example.com', weddingId: DEFAULT_WEDDING_ID }).ok).toBe(false)
  })

  test('transitional bootstrap: listed e-mails act as owner of the default wedding only', () => {
    vi.stubEnv('ADMIN_EMAILS', ' Owner@Example.com , partner@example.com ')
    expect(decideWeddingAccess(null, 'owner', { email: 'owner@example.com', weddingId: DEFAULT_WEDDING_ID })).toEqual({ ok: true, role: 'owner' })
    expect(decideWeddingAccess(null, 'viewer', { email: 'owner@example.com', weddingId: OTHER })).toEqual({ ok: false, status: 404 })
    expect(decideWeddingAccess(null, 'viewer', { email: 'guest@example.com', weddingId: DEFAULT_WEDDING_ID }).ok).toBe(false)
    expect(decideWeddingAccess(null, 'viewer', { email: null, weddingId: DEFAULT_WEDDING_ID }).ok).toBe(false)
  })

  test('a real membership role takes precedence over the bootstrap', () => {
    vi.stubEnv('ADMIN_EMAILS', 'owner@example.com')
    expect(decideWeddingAccess('viewer', 'editor', { email: 'owner@example.com', weddingId: DEFAULT_WEDDING_ID })).toEqual({ ok: false, status: 403 })
  })
})

describe('requestedWeddingId', () => {
  test('defaults to the current tenant and validates the header', () => {
    expect(requestedWeddingId(new Headers())).toBe(DEFAULT_WEDDING_ID)
    expect(requestedWeddingId(new Headers({ 'x-wedding-id': OTHER }))).toBe(OTHER)
    expect(requestedWeddingId(new Headers({ 'x-wedding-id': "1' OR 1=1" }))).toBeNull()
  })
})

describe('isValidInviteToken', () => {
  test('accepts url-safe tokens of 8 to 128 characters', () => {
    expect(isValidInviteToken('abcDEF12')).toBe(true)
    expect(isValidInviteToken('a-b_c'.repeat(20))).toBe(true)
  })

  test('rejects non-strings, short, long and unsafe tokens', () => {
    for (const t of [undefined, null, 123, 'short', 'x'.repeat(129), "abc' OR 1=1--", '../../etc/passwd']) {
      expect(isValidInviteToken(t)).toBe(false)
    }
  })
})
