/**
 * Builds every public URL for a guest. Phase 1: one deployment serves tenant
 * #1 at NEXT_PUBLIC_APP_URL with the legacy paths (/, /pt, /es). Phase 2 will
 * resolve the wedding's own host or /w/<slug> here; nothing else should
 * construct guest URLs. Replaces the generated guests.rsvp_link column.
 */
export interface LinkGuest {
  invite_token: string | null
  language: string | null
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

function localePrefix(language: string | null): string {
  return !language || language === 'en' ? '' : `/${language}`
}

function link(path: 'invite' | 'rsvp', guest: LinkGuest): string {
  const query = guest.invite_token ? `?guest=${encodeURIComponent(guest.invite_token)}` : ''
  return `${appBaseUrl()}${localePrefix(guest.language)}/${path}${query}`
}

export const guestInviteUrl = (guest: LinkGuest) => link('invite', guest)
export const guestRsvpUrl = (guest: LinkGuest) => link('rsvp', guest)
