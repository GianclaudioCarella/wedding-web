import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const filter = request.nextUrl.searchParams.get('filter') || 'all'

  const query = supabaseAdmin
    .from('guests')
    .select('id, name, email, invite_token, language, attending')
    .is('party_leader_id', null)
    .not('email', 'is', null)
    .neq('email', '')
    .order('name')

  const { data: guests, error } = await query

  if (error || !guests) {
    return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 })
  }

  // Get party member counts
  const { data: members } = await supabaseAdmin
    .from('guests')
    .select('party_leader_id')
    .not('party_leader_id', 'is', null)

  const memberCounts: Record<string, number> = {}
  members?.forEach(m => {
    if (m.party_leader_id)
      memberCounts[m.party_leader_id] = (memberCounts[m.party_leader_id] || 0) + 1
  })

  const toStatus = (a: string | null) =>
    a === 'yes' ? 'attending' : a === 'no' ? 'declined' : 'pending'

  let parties = guests.map(g => ({
    id:          g.id,
    name:        g.name,
    email:       g.email as string,
    language:    g.language || 'en',
    party_size:  1 + (memberCounts[g.id] || 0),
    rsvp_status: toStatus(g.attending),
    invite_token: g.invite_token,
  }))

  if (filter === 'attending') parties = parties.filter(p => p.rsvp_status === 'attending')
  if (filter === 'pending')   parties = parties.filter(p => p.rsvp_status === 'pending')
  if (filter === 'declined')  parties = parties.filter(p => p.rsvp_status === 'declined')

  return NextResponse.json({ parties })
}
