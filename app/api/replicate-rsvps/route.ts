import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingRole } from '@/lib/auth/requireWeddingRole'
import { getGuest, updateGuest } from '@/lib/data/guests'
import { getStayRequest, insertRsvps, insertStayRequest, listRsvps } from '@/lib/data/rsvp'

export async function POST(request: NextRequest) {
  const auth = await requireWeddingRole(request, 'editor')
  if (!auth.ok) return auth.response
  const w = auth.weddingId
  const { new_guest_id, primary_guest_id } = await request.json()

  if (!new_guest_id || !primary_guest_id) {
    return NextResponse.json({ error: 'Missing guest IDs' }, { status: 400 })
  }

  try {
    // Both guests must belong to this wedding.
    const [primaryGuest, newGuest] = await Promise.all([getGuest(w, primary_guest_id), getGuest(w, new_guest_id)])
    if (!primaryGuest || !newGuest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 })

    const now = new Date().toISOString()
    const primaryRsvps = await listRsvps(w, [primary_guest_id])
    const { error: insertError } = await insertRsvps(w, primaryRsvps.map((r) => ({
      guest_id: new_guest_id,
      event_id: r.event_id,
      status: r.status,
      dietary_requirements: r.dietary_requirements,
      dietary_notes: r.dietary_notes,
      responded_at: now,
      updated_at: now,
    })))
    if (insertError) throw insertError

    await updateGuest(w, new_guest_id, {
      transport_needed: primaryGuest.transport_needed,
      transport_from: primaryGuest.transport_from,
      transport_return: primaryGuest.transport_return,
    })

    const primaryStay = await getStayRequest(w, primary_guest_id)
    if (primaryStay) await insertStayRequest(w, { guest_id: new_guest_id, ...primaryStay })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Replicate RSVPs error:', error)
    return NextResponse.json({ error: 'Failed to replicate RSVPs' }, { status: 500 })
  }
}
