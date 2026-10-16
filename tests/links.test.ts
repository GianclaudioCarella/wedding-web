import { afterEach, describe, expect, test, vi } from 'vitest'
import { guestInviteUrl, guestRsvpUrl } from '@/lib/links'

describe('guest links (replace the generated guests.rsvp_link column)', () => {
  afterEach(() => vi.unstubAllEnvs())

  test('uses the configured base URL, locale prefix and invite token', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.test/')
    expect(guestInviteUrl({ invite_token: 'tok_123', language: 'en' })).toBe('https://example.test/invite?guest=tok_123')
    expect(guestRsvpUrl({ invite_token: 'tok_123', language: 'pt' })).toBe('https://example.test/pt/rsvp?guest=tok_123')
    expect(guestInviteUrl({ invite_token: 'a b', language: null })).toBe('https://example.test/invite?guest=a%20b')
  })
})
