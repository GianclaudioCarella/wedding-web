import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const { guest_id } = await request.json()

  if (!guest_id) {
    return NextResponse.json({ error: 'Missing guest_id' }, { status: 400 })
  }

  try {
    // Get all events the guest is invited to
    const { data: guestEvents, error: geError } = await supabaseAdmin
      .from('guest_events')
      .select('event_id')
      .eq('guest_id', guest_id)

    if (geError) throw geError

    // Upsert declined RSVP for each event
    if (guestEvents && guestEvents.length > 0) {
      const rsvpsToUpsert = guestEvents.map(ge => ({
        guest_id,
        event_id: ge.event_id,
        status: 'declined',
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { error: rsvpError } = await supabaseAdmin
        .from('rsvp_responses')
        .upsert(rsvpsToUpsert, { onConflict: 'guest_id,event_id' })

      if (rsvpError) {
        console.error('RSVP upsert error:', rsvpError)
        throw rsvpError
      }
    }

    // Update stay request to not staying
    const { error: stayError } = await supabaseAdmin
      .from('guest_stay_requests')
      .upsert({
        guest_id,
        sunday_night: false,
        friday_night: false,
        saturday_night: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'guest_id' })

    if (stayError) {
      console.error('Stay request update error:', stayError)
      throw stayError
    }

    console.log(`Marked guest ${guest_id} as not attending with ${guestEvents?.length || 0} events`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark not attending error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
