import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { data: guest, error } = await supabaseAdmin
    .from('guests')
    .select('id, name, venue_stay_invited, transport_needed, transport_from, transport_brunch')
    .eq('invite_token', token)
    .single()

  if (error || !guest) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check if guest is invited to the Sunday brunch (slug: 'aftermath')
  const { data: brunchEvent } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('slug', 'aftermath')
    .single()

  let hasBrunch = false
  if (brunchEvent) {
    const { data: ge } = await supabaseAdmin
      .from('guest_events')
      .select('id')
      .eq('guest_id', guest.id)
      .eq('event_id', brunchEvent.id)
      .single()
    hasBrunch = !!ge
  }

  return NextResponse.json({
    name: guest.name,
    venue_stay_invited: guest.venue_stay_invited,
    has_brunch: hasBrunch,
    transport_needed: guest.transport_needed ?? null,
    transport_from: guest.transport_from ?? null,
    transport_brunch: guest.transport_brunch ?? null,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { token, transport_needed, transport_from, transport_brunch } = body

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { data: guest } = await supabaseAdmin
    .from('guests')
    .select('id')
    .eq('invite_token', token)
    .single()

  if (!guest) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('guests')
    .update({
      transport_needed: transport_needed ?? null,
      transport_from: transport_from ?? null,
      transport_brunch: transport_brunch ?? null,
    })
    .eq('id', guest.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
