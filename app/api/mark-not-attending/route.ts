import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingRole } from '@/lib/auth/requireWeddingRole'
import { getGuest, listGuestEventIds, listPartyMembers } from '@/lib/data/guests'
import { upsertRsvps, upsertStayRequest } from '@/lib/data/rsvp'

async function markGuestAsNotAttending(weddingId: string, guestId: string) {
  const now = new Date().toISOString()
  const eventIds = await listGuestEventIds(weddingId, guestId)

  const { error: rsvpError } = await upsertRsvps(weddingId, eventIds.map((event_id) => ({
    guest_id: guestId, event_id, status: 'declined', responded_at: now, updated_at: now,
  })))
  if (rsvpError) throw rsvpError

  const { error: stayError } = await upsertStayRequest(weddingId, {
    guest_id: guestId, sunday_night: false, friday_night: false, saturday_night: false, updated_at: now,
  })
  if (stayError) throw stayError
}

export async function POST(request: NextRequest) {
  const auth = await requireWeddingRole(request, 'editor')
  if (!auth.ok) return auth.response
  const { guest_id } = await request.json()

  if (!guest_id) {
    return NextResponse.json({ error: 'Missing guest_id' }, { status: 400 })
  }
  if (!(await getGuest(auth.weddingId, guest_id))) {
    return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
  }

  try {
    await markGuestAsNotAttending(auth.weddingId, guest_id)
    const partyMembers = await listPartyMembers(auth.weddingId, guest_id)
    for (const member of partyMembers) await markGuestAsNotAttending(auth.weddingId, member.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark not attending error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
