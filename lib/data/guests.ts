import type { TablesUpdate } from '@/lib/database.types'
import { serviceDb } from './client'

/**
 * Resolves a guest from a public invite token. The token is globally unique,
 * so it also identifies the wedding: callers must scope every follow-up query
 * with the returned wedding_id.
 */
export async function findGuestByInviteToken(token: string) {
  const { data, error } = await serviceDb
    .from('guests')
    .select('id, wedding_id, name, email, notes, language, invite_token, venue_stay_invited, party_role, party_leader_id, transport_needed, transport_from, transport_return')
    .eq('invite_token', token)
    .maybeSingle()
  if (error) console.error('Guest lookup failed:', error.message)
  return data
}

export async function listGuestsByIds(weddingId: string, ids: string[]) {
  return serviceDb
    .from('guests')
    .select('id, name, email, invite_token, language')
    .eq('wedding_id', weddingId)
    .in('id', ids)
}

export async function getGuest(weddingId: string, id: string) {
  const { data } = await serviceDb
    .from('guests')
    .select('id, name, transport_needed, transport_from, transport_return')
    .eq('wedding_id', weddingId)
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function listPartyMembers(weddingId: string, leaderId: string) {
  const { data } = await serviceDb
    .from('guests')
    .select('id, name, party_role')
    .eq('wedding_id', weddingId)
    .eq('party_leader_id', leaderId)
  return data ?? []
}

export async function updateGuest(weddingId: string, id: string, patch: TablesUpdate<'guests'>) {
  return serviceDb.from('guests').update(patch).eq('wedding_id', weddingId).eq('id', id)
}

export async function createPartyMember(
  weddingId: string,
  leader: { id: string; language: string | null; venue_stay_invited: boolean | null },
  member: { name: string; email: string | null },
) {
  return serviceDb
    .from('guests')
    .insert({
      wedding_id: weddingId,
      name: member.name,
      email: member.email,
      party_leader_id: leader.id,
      party_role: 'partner',
      language: leader.language || 'en',
      venue_stay_invited: leader.venue_stay_invited || false,
      invite_token: crypto.randomUUID(),
    })
    .select('id')
    .single()
}

export async function listGuestEventIds(weddingId: string, guestId: string): Promise<string[]> {
  const { data } = await serviceDb
    .from('guest_events')
    .select('event_id')
    .eq('wedding_id', weddingId)
    .eq('guest_id', guestId)
  return (data ?? []).map((r) => r.event_id)
}

export async function addGuestEvents(weddingId: string, guestId: string, eventIds: string[]) {
  if (eventIds.length === 0) return
  await serviceDb
    .from('guest_events')
    .insert(eventIds.map((event_id) => ({ wedding_id: weddingId, guest_id: guestId, event_id })))
}

/** Events a guest is invited to, ordered by sort_order. */
export async function listGuestEvents(weddingId: string, guestId: string) {
  const { data } = await serviceDb
    .from('guest_events')
    .select('events(id, name, slug, event_date, event_time, location, description, sort_order)')
    .eq('wedding_id', weddingId)
    .eq('guest_id', guestId)
  return (data ?? [])
    .map((ge) => ge.events)
    .filter((e): e is NonNullable<typeof e> => !!e)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}
