import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const { guest_id, statuses } = await request.json()

  if (!guest_id || !statuses || typeof statuses !== 'object') {
    return NextResponse.json({ error: 'Missing guest_id or statuses' }, { status: 400 })
  }

  const entries = Object.entries(statuses) as [string, string][]
  if (entries.length === 0) {
    return NextResponse.json({ success: true })
  }

  const now = new Date().toISOString()
  const rsvpsToUpsert = entries.map(([event_id, status]) => ({
    guest_id,
    event_id,
    status,
    responded_at: now,
    updated_at: now,
  }))

  const { error } = await supabaseAdmin
    .from('rsvp_responses')
    .upsert(rsvpsToUpsert, { onConflict: 'guest_id,event_id' })

  if (error) {
    console.error('RSVP status upsert error:', error)
    return NextResponse.json({ error: 'Failed to update RSVP status' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
