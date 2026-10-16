import { NextRequest, NextResponse } from 'next/server'
import { isValidInviteToken } from '@/lib/auth/inviteToken'
import { findGuestByInviteToken, listGuestEvents } from '@/lib/data/guests'
import { hasRsvped } from '@/lib/data/rsvp'
import { getPublicSiteData } from '@/lib/data/site'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!isValidInviteToken(token)) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  // The invite token identifies the guest and therefore the wedding; every
  // following query is scoped to that wedding.
  const guest = await findGuestByInviteToken(token)
  if (!guest) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [events, site, rsvped] = await Promise.all([
    listGuestEvents(guest.wedding_id, guest.id),
    getPublicSiteData(guest.wedding_id),
    hasRsvped(guest.wedding_id, guest.id),
  ])

  return NextResponse.json({
    guest: { id: guest.id, name: guest.name, venue_stay_invited: guest.venue_stay_invited },
    hasRsvped: rsvped,
    events,
    ...site,
  })
}
