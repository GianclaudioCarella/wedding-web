import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const { new_guest_id, primary_guest_id } = await request.json()

  if (!new_guest_id || !primary_guest_id) {
    return NextResponse.json({ error: 'Missing guest IDs' }, { status: 400 })
  }

  try {
    // Fetch primary guest's RSVPs
    const { data: primaryRsvps, error: rsvpError } = await supabaseAdmin
      .from('rsvp_responses')
      .select('event_id, status, dietary_requirements, dietary_notes, notes')
      .eq('guest_id', primary_guest_id)

    if (rsvpError) throw rsvpError

    // Replicate RSVPs to new party member
    if (primaryRsvps && primaryRsvps.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('rsvp_responses')
        .insert(
          primaryRsvps.map(r => ({
            guest_id: new_guest_id,
            event_id: r.event_id,
            status: r.status,
            dietary_requirements: r.dietary_requirements,
            dietary_notes: r.dietary_notes,
            responded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
        )

      if (insertError) {
        console.error('RSVP insert error:', insertError)
        throw insertError
      }
    }

    // Replicate primary guest's transport answer
    const { data: primaryGuest } = await supabaseAdmin
      .from('guests')
      .select('transport_needed, transport_from, transport_return')
      .eq('id', primary_guest_id)
      .single()

    if (primaryGuest) {
      await supabaseAdmin.from('guests').update({
        transport_needed: primaryGuest.transport_needed,
        transport_from: primaryGuest.transport_from,
        transport_return: primaryGuest.transport_return,
      }).eq('id', new_guest_id)
    }

    // Replicate primary guest's stay request
    const { data: primaryStay, error: stayError } = await supabaseAdmin
      .from('guest_stay_requests')
      .select('sunday_night, friday_night, saturday_night, notes')
      .eq('guest_id', primary_guest_id)
      .single()

    if (!stayError && primaryStay) {
      await supabaseAdmin.from('guest_stay_requests').insert({
        guest_id: new_guest_id,
        sunday_night: primaryStay.sunday_night,
        friday_night: primaryStay.friday_night,
        saturday_night: primaryStay.saturday_night,
        notes: primaryStay.notes,
      })
    }

    console.log(`Replicated RSVPs from ${primary_guest_id} to ${new_guest_id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Replicate RSVPs error:', error)
    return NextResponse.json({ error: 'Failed to replicate RSVPs' }, { status: 500 })
  }
}
