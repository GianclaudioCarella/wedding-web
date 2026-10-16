import type { User } from '@supabase/supabase-js'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { isAdminUser } from '@/lib/auth/admin'
import { isValidInviteToken } from '@/lib/auth/inviteToken'

const user = (email?: string) => ({ id: 'u1', email }) as User

describe('isAdminUser (current ADMIN_EMAILS behaviour)', () => {
  afterEach(() => vi.unstubAllEnvs())

  test('rejects missing users', () => {
    expect(isAdminUser(null)).toBe(false)
    expect(isAdminUser(undefined)).toBe(false)
  })

  test('GAP: with ADMIN_EMAILS unset, every authenticated user is an admin', () => {
    vi.stubEnv('ADMIN_EMAILS', '')
    expect(isAdminUser(user('anyone@example.com'))).toBe(true)
    expect(isAdminUser(user())).toBe(true)
  })

  test('with ADMIN_EMAILS set, only listed emails (case-insensitive, trimmed) are admins', () => {
    vi.stubEnv('ADMIN_EMAILS', ' Owner@Example.com , partner@example.com ')
    expect(isAdminUser(user('owner@example.com'))).toBe(true)
    expect(isAdminUser(user('PARTNER@example.com'))).toBe(true)
    expect(isAdminUser(user('guest@example.com'))).toBe(false)
    expect(isAdminUser(user())).toBe(false)
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
