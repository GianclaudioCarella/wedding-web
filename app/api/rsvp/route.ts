import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { data: guest, error: guestError } = await supabaseAdmin
    .from('guests')
    .select('id, name, email, notes, venue_stay_invited, party_role, party_leader_id')
    .eq('invite_token', token)
    .single()

  if (guestError || !guest) {
    console.error('Guest fetch error:', guestError?.message, '| token:', token)
    return NextResponse.json({ error: guestError?.message || 'Guest not found' }, { status: 404 })
  }

  const { data: guestEvents } = await supabaseAdmin
    .from('guest_events')
    .select('event_id, events(id, name, slug, event_date, event_time, location, sort_order)')
    .eq('guest_id', guest.id)
    .order('event_id')

  const events = (guestEvents || [])
    .map((ge: any) => ge.events)
    .filter(Boolean)
    .sort((a: any, b: any) => a.sort_order - b.sort_order)

  const { data: partyMembers } = await supabaseAdmin
    .from('guests')
    .select('id, name, party_role')
    .eq('party_leader_id', guest.id)

  const { data: existingRsvps } = await supabaseAdmin
    .from('rsvp_responses')
    .select('event_id, status, dietary_requirements, dietary_notes, notes')
    .eq('guest_id', guest.id)

  // Fetch existing dietary and event responses for party members so the form can pre-fill on edit
  const partyRsvps: Record<string, { dietary_requirements: string[]; dietary_notes: string | null; rsvps: Record<string, string> }> = {}
  if (partyMembers?.length) {
    const { data: pmRsvps } = await supabaseAdmin
      .from('rsvp_responses')
      .select('guest_id, event_id, status, dietary_requirements, dietary_notes')
      .in('guest_id', partyMembers.map((m: any) => m.id))
    for (const r of pmRsvps || []) {
      if (!partyRsvps[r.guest_id]) partyRsvps[r.guest_id] = { dietary_requirements: r.dietary_requirements || [], dietary_notes: r.dietary_notes, rsvps: {} }
      partyRsvps[r.guest_id].rsvps[r.event_id] = r.status
    }
  }

  const { data: stayRequest } = await supabaseAdmin
    .from('guest_stay_requests')
    .select('sunday_night, friday_night, saturday_night, notes')
    .eq('guest_id', guest.id)
    .single()

  return NextResponse.json({
    guest: {
      id: guest.id, name: guest.name, email: guest.email,
      notes: guest.notes || '',
      venue_stay_invited: guest.venue_stay_invited,
    },
    events,
    partyMembers: partyMembers || [],
    existingRsvps: existingRsvps || [],
    partyRsvps,
    stayRequest: stayRequest || null,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { token, responses, dietary_requirements, dietary_notes, stay_request, notes, plus_one_name, plus_one_email, party_dietary, party_dietary_notes, party_rsvps } = body

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { data: guest } = await supabaseAdmin
    .from('guests')
    .select('id, language, venue_stay_invited')
    .eq('invite_token', token)
    .single()

  if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 })

  // Create a map of event_id -> status from primary guest responses
  const eventStatusMap = new Map(responses.map((r: any) => [r.event_id, r.status]))

  // Upsert RSVP responses per event
  for (const r of responses) {
    const { error: rsvpError } = await supabaseAdmin.from('rsvp_responses').upsert({
      guest_id: guest.id,
      event_id: r.event_id,
      status: r.status,
      dietary_requirements: dietary_requirements || [],
      dietary_notes: dietary_notes || null,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'guest_id,event_id' })
    if (rsvpError) {
      console.error('RSVP upsert error:', rsvpError)
      return NextResponse.json({ error: 'Failed to save RSVP', detail: rsvpError.message }, { status: 500 })
    }
  }

  // Save RSVP and dietary for party members
  // Get all party members to process (from either party_dietary or party_rsvps)
  const partyMemberIds = new Set<string>();
  if (party_dietary && typeof party_dietary === 'object') {
    Object.keys(party_dietary as Record<string, string[]>).forEach(id => partyMemberIds.add(id));
  }
  if (party_rsvps && typeof party_rsvps === 'object') {
    Object.keys(party_rsvps as Record<string, Record<string, string>>).forEach(id => partyMemberIds.add(id));
  }

  for (const memberId of partyMemberIds) {
    const { data: memberEvents } = await supabaseAdmin
      .from('guest_events')
      .select('event_id')
      .eq('guest_id', memberId)

    for (const me of memberEvents || []) {
      // Use individual party member response if provided, otherwise use primary guest's status
      const memberRsvpsForMember = (party_rsvps as Record<string, Record<string, string>>)?.[memberId] || {}
      const memberStatus = memberRsvpsForMember[me.event_id] || eventStatusMap.get(me.event_id) || 'pending'
      const memberDietary = (party_dietary as Record<string, string[]>)?.[memberId] || []

      await supabaseAdmin.from('rsvp_responses').upsert({
        guest_id: memberId,
        event_id: me.event_id,
        status: memberStatus,
        dietary_requirements: memberDietary,
        dietary_notes: (party_dietary_notes as Record<string, string>)?.[memberId] || null,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'guest_id,event_id' })
    }
  }

  // Upsert stay request if applicable
  if (stay_request) {
    const { error: stayError } = await supabaseAdmin.from('guest_stay_requests').upsert({
      guest_id: guest.id,
      sunday_night: stay_request.sunday_night,
      friday_night: stay_request.friday_night,
      saturday_night: stay_request.saturday_night,
      notes: stay_request.notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'guest_id' })
    if (stayError) console.error('Stay upsert error:', stayError)

    // Replicate stay request to party members
    const { data: partyMembers } = await supabaseAdmin
      .from('guests')
      .select('id')
      .eq('party_leader_id', guest.id)
    if (partyMembers?.length) {
      for (const member of partyMembers) {
        await supabaseAdmin.from('guest_stay_requests').upsert({
          guest_id: member.id,
          sunday_night: stay_request.sunday_night,
          friday_night: stay_request.friday_night,
          saturday_night: stay_request.saturday_night,
          notes: stay_request.notes || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'guest_id' })
      }
    }
  }

  // Update guest notes + plus one fields
  const guestUpdate: Record<string, unknown> = {}
  if (notes !== undefined) guestUpdate.notes = notes
  if (plus_one_name !== undefined) guestUpdate.plus_one_name = plus_one_name || null
  if (plus_one_email !== undefined) guestUpdate.plus_one_email = plus_one_email || null
  if (Object.keys(guestUpdate).length > 0) {
    await supabaseAdmin.from('guests').update(guestUpdate).eq('id', guest.id)
  }

  // Auto-create +1 as a party member if name provided and not already exists
  if (plus_one_name) {
    const { data: existingParty } = await supabaseAdmin
      .from('guests')
      .select('id')
      .eq('party_leader_id', guest.id)
      .maybeSingle()

    if (!existingParty) {
      const { data: newGuest, error: insertError } = await supabaseAdmin
        .from('guests')
        .insert({
          name: plus_one_name,
          email: plus_one_email || null,
          party_leader_id: guest.id,
          party_role: 'partner',
          language: guest.language || 'en',
          venue_stay_invited: guest.venue_stay_invited || false,
          invite_token: crypto.randomUUID(),
        })
        .select('id')
        .single()
      if (insertError) console.error('+1 insert error:', insertError)

      // Assign +1 to the same events as the primary guest
      if (newGuest) {
        const { data: guestEventsList } = await supabaseAdmin
          .from('guest_events')
          .select('event_id')
          .eq('guest_id', guest.id)

        if (guestEventsList?.length) {
          await supabaseAdmin.from('guest_events').insert(
            guestEventsList.map((ge: any) => ({ guest_id: newGuest.id, event_id: ge.event_id }))
          )
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}
