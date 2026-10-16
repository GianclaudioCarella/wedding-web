import { NextRequest, NextResponse } from 'next/server'
import { isValidInviteToken } from '@/lib/auth/inviteToken'
import { findGuestByInviteToken } from '@/lib/data/guests'
import { listRsvps } from '@/lib/data/rsvp'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!isValidInviteToken(token)) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const guest = await findGuestByInviteToken(token)
  if (!guest) {
    return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
  }

  // Public endpoint: expose only what the landing and confirmation pages
  // need. `attending` is null until the guest has answered.
  const rsvps = await listRsvps(guest.wedding_id, [guest.id])
  const attending = rsvps.length === 0 ? null : rsvps.some((r) => r.status === 'attending')
  return NextResponse.json({ name: guest.name, attending })
}
