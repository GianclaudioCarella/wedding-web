import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingRole } from '@/lib/auth/requireWeddingRole'
import { getGuest } from '@/lib/data/guests'
import { upsertRsvps } from '@/lib/data/rsvp'

export async function POST(request: NextRequest) {
  const auth = await requireWeddingRole(request, 'editor')
  if (!auth.ok) return auth.response
  const { guest_id, statuses } = await request.json()

  if (!guest_id || !statuses || typeof statuses !== 'object') {
    return NextResponse.json({ error: 'Missing guest_id or statuses' }, { status: 400 })
  }

  const entries = Object.entries(statuses) as [string, string][]
  if (entries.length === 0) {
    return NextResponse.json({ success: true })
  }
  if (!(await getGuest(auth.weddingId, guest_id))) {
    return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const { error } = await upsertRsvps(auth.weddingId, entries.map(([event_id, status]) => ({
    guest_id, event_id, status, responded_at: now, updated_at: now,
  })))

  if (error) {
    console.error('RSVP status upsert error:', error)
    return NextResponse.json({ error: 'Failed to update RSVP status' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
