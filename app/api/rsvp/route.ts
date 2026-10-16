import { NextRequest, NextResponse } from 'next/server'
import { isValidInviteToken } from '@/lib/auth/inviteToken'
import type { TablesUpdate } from '@/lib/database.types'
import {
  addGuestEvents, createPartyMember, findGuestByInviteToken, listGuestEventIds, listGuestEvents,
  listPartyMembers, updateGuest,
} from '@/lib/data/guests'
import { getStayRequest, listRsvps, upsertRsvps, upsertStayRequest } from '@/lib/data/rsvp'

const ALLOWED_STATUSES = new Set(['attending', 'declined', 'pending'])

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!isValidInviteToken(token)) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const guest = await findGuestByInviteToken(token)
  if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
  const w = guest.wedding_id

  const [events, partyMembers, existing, stayRequest] = await Promise.all([
    listGuestEvents(w, guest.id),
    listPartyMembers(w, guest.id),
    listRsvps(w, [guest.id]),
    getStayRequest(w, guest.id),
  ])

  // Existing dietary and event responses of party members, to pre-fill on edit.
  const partyRsvps: Record<string, { dietary_requirements: string[]; dietary_notes: string | null; rsvps: Record<string, string> }> = {}
  if (partyMembers.length) {
    for (const r of await listRsvps(w, partyMembers.map((m) => m.id))) {
      if (!partyRsvps[r.guest_id]) partyRsvps[r.guest_id] = { dietary_requirements: r.dietary_requirements || [], dietary_notes: r.dietary_notes, rsvps: {} }
      partyRsvps[r.guest_id].rsvps[r.event_id] = r.status
    }
  }

  return NextResponse.json({
    guest: {
      id: guest.id, name: guest.name, email: guest.email,
      notes: guest.notes || '',
      venue_stay_invited: guest.venue_stay_invited,
      transport_needed: guest.transport_needed ?? null,
      transport_from: guest.transport_from ?? null,
      transport_return: guest.transport_return ?? null,
    },
    events: events.map(({ description: _description, ...e }) => e),
    partyMembers,
    existingRsvps: existing.map(({ guest_id: _guestId, ...r }) => r),
    partyRsvps,
    stayRequest: stayRequest || null,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { token, responses, dietary_requirements, dietary_notes, stay_request, notes, plus_one_name, plus_one_email, party_dietary, party_dietary_notes, party_rsvps, transport_needed, transport_from, transport_return } = body

  if (!isValidInviteToken(token)) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  if (!Array.isArray(responses)) return NextResponse.json({ error: 'Invalid responses' }, { status: 400 })

  const guest = await findGuestByInviteToken(token)
  if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
  // Every read and write below is scoped to the guest's own wedding.
  const w = guest.wedding_id
  const now = () => new Date().toISOString()

  // Only allow writes for events this guest is invited to, and party members that
  // actually belong to this guest's party (prevents tampering with other guests).
  const invitedEventIds = new Set(await listGuestEventIds(w, guest.id))
  for (const r of responses) {
    if (!r || !invitedEventIds.has(String(r.event_id)) || !ALLOWED_STATUSES.has(r.status)) {
      return NextResponse.json({ error: 'Invalid RSVP response' }, { status: 400 })
    }
  }

  const partyMembers = await listPartyMembers(w, guest.id)
  const ownPartyIds = new Set(partyMembers.map((m) => String(m.id)))
  const eventStatusMap = new Map<string, string>(responses.map((r: { event_id: string; status: string }) => [r.event_id, r.status]))

  const { error: rsvpError } = await upsertRsvps(w, responses.map((r: { event_id: string; status: string }) => ({
    guest_id: guest.id,
    event_id: r.event_id,
    status: r.status,
    dietary_requirements: dietary_requirements || [],
    dietary_notes: dietary_notes || null,
    responded_at: now(),
    updated_at: now(),
  })))
  if (rsvpError) {
    console.error('RSVP upsert error:', rsvpError)
    return NextResponse.json({ error: 'Failed to save RSVP', detail: rsvpError.message }, { status: 500 })
  }

  // RSVP and dietary for party members (from either party_dietary or party_rsvps).
  const partyMemberIds = new Set<string>()
  if (party_dietary && typeof party_dietary === 'object') Object.keys(party_dietary).forEach((id) => partyMemberIds.add(id))
  if (party_rsvps && typeof party_rsvps === 'object') Object.keys(party_rsvps).forEach((id) => partyMemberIds.add(id))

  for (const memberId of partyMemberIds) {
    if (!ownPartyIds.has(String(memberId))) {
      return NextResponse.json({ error: 'Invalid party member' }, { status: 400 })
    }
    const memberRsvps = (party_rsvps as Record<string, Record<string, string>>)?.[memberId] || {}
    const rows = (await listGuestEventIds(w, memberId)).map((eventId) => {
      const requested = memberRsvps[eventId]
      return {
        guest_id: memberId,
        event_id: eventId,
        status: (requested && ALLOWED_STATUSES.has(requested) ? requested : null) || eventStatusMap.get(eventId) || 'pending',
        dietary_requirements: (party_dietary as Record<string, string[]>)?.[memberId] || [],
        dietary_notes: (party_dietary_notes as Record<string, string>)?.[memberId] || null,
        responded_at: now(),
        updated_at: now(),
      }
    })
    await upsertRsvps(w, rows)
  }

  // Stay request, replicated to party members.
  if (stay_request) {
    for (const guestId of [guest.id, ...partyMembers.map((m) => m.id)]) {
      const { error: stayError } = await upsertStayRequest(w, {
        guest_id: guestId,
        sunday_night: stay_request.sunday_night,
        friday_night: stay_request.friday_night,
        saturday_night: stay_request.saturday_night,
        notes: stay_request.notes || null,
        updated_at: now(),
      })
      if (stayError) console.error('Stay upsert error:', stayError)
    }
  }

  // Guest notes + plus one fields.
  const guestUpdate: TablesUpdate<'guests'> = {}
  if (notes !== undefined) guestUpdate.notes = notes
  if (plus_one_name !== undefined) guestUpdate.plus_one_name = plus_one_name || null
  if (plus_one_email !== undefined) guestUpdate.plus_one_email = plus_one_email || null
  if (transport_needed !== undefined) guestUpdate.transport_needed = transport_needed ?? null
  if (transport_from !== undefined) guestUpdate.transport_from = transport_from || null
  if (transport_return !== undefined) guestUpdate.transport_return = transport_return ?? null
  if (Object.keys(guestUpdate).length > 0) await updateGuest(w, guest.id, guestUpdate)

  // Party members travel together: replicate the transport answer.
  if (transport_needed !== undefined) {
    const transportUpdate = {
      transport_needed: transport_needed ?? null,
      transport_from: transport_needed ? (transport_from || null) : null,
      transport_return: transport_needed ? (transport_return ?? null) : null,
    }
    for (const member of partyMembers) await updateGuest(w, member.id, transportUpdate)
  }

  // Auto-create the +1 as a party member if a name is given and none exists yet.
  if (plus_one_name && partyMembers.length === 0) {
    const { data: newGuest, error: insertError } = await createPartyMember(w, guest, {
      name: plus_one_name,
      email: plus_one_email || null,
    })
    if (insertError) console.error('+1 insert error:', insertError)
    if (newGuest) await addGuestEvents(w, newGuest.id, [...invitedEventIds])
  }

  return NextResponse.json({ success: true })
}
