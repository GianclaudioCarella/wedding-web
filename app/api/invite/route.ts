import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { data: guest, error: guestError } = await supabaseAdmin
    .from('guests')
    .select('id, name, venue_stay_invited')
    .eq('invite_token', token)
    .single()

  if (guestError || !guest) {
    console.error('Invite fetch error:', guestError?.message)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [guestEventsRes, transportRes, externalAccomRes, contentRes, registryRes, faqRes] = await Promise.all([
    supabaseAdmin
      .from('guest_events')
      .select('events(id, name, event_date, event_time, location, description, sort_order)')
      .eq('guest_id', guest.id),
    supabaseAdmin
      .from('transport_options')
      .select('id, name, direction, departure_location, departure_time, capacity, notes')
      .eq('is_active', true)
      .order('sort_order'),
    supabaseAdmin
      .from('external_accommodations')
      .select('id, name, description, url, price_range, distance_from_venue')
      .eq('is_active', true)
      .order('sort_order'),
    supabaseAdmin
      .from('site_content')
      .select('key, value'),
    supabaseAdmin
      .from('registry_items')
      .select('id, title, description, url, store_name, price, currency')
      .eq('is_active', true)
      .eq('is_claimed', false)
      .order('sort_order'),
    supabaseAdmin
      .from('faq_items')
      .select('id, question, answer, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  const events = (guestEventsRes.data || [])
    .map((ge: any) => ge.events)
    .filter(Boolean)
    .sort((a: any, b: any) => a.sort_order - b.sort_order)

  const content: Record<string, string> = {}
  for (const row of contentRes.data || []) content[row.key] = row.value || ''

  return NextResponse.json({
    guest: { id: guest.id, name: guest.name, venue_stay_invited: guest.venue_stay_invited },
    events,
    transport: transportRes.data || [],
    externalAccommodations: externalAccomRes.data || [],
    faqs: faqRes.data || [],
    content,
    registry: registryRes.data || [],
  })
}
