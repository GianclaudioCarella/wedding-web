import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  // guests and rsvp_responses are readable by authenticated users via RLS,
  // so the user-scoped client is sufficient here (no service role).
  const supabase = auth.supabase
  const filter = request.nextUrl.searchParams.get('filter') || 'all'

  const { data: guests, error } = await supabase
    .from('guests')
    .select('id, name, email, invite_token, language')
    .is('party_leader_id', null)
    .not('email', 'is', null)
    .neq('email', '')
    .order('name')

  if (error || !guests) {
    return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 })
  }

  // Get party member counts
  const { data: members } = await supabase
    .from('guests')
    .select('party_leader_id')
    .not('party_leader_id', 'is', null)

  const memberCounts: Record<string, number> = {}
  members?.forEach(m => {
    if (m.party_leader_id)
      memberCounts[m.party_leader_id] = (memberCounts[m.party_leader_id] || 0) + 1
  })

  // Derive RSVP status from rsvp_responses (same logic as admin/guests page)
  const guestIds = guests.map(g => g.id)
  const { data: rsvpRows } = await supabase
    .from('rsvp_responses')
    .select('guest_id, status')
    .in('guest_id', guestIds)

  const rsvpByGuest: Record<string, string[]> = {}
  rsvpRows?.forEach(r => {
    if (!rsvpByGuest[r.guest_id]) rsvpByGuest[r.guest_id] = []
    rsvpByGuest[r.guest_id].push(r.status)
  })

  const deriveStatus = (guestId: string): 'attending' | 'declined' | 'pending' => {
    const statuses = rsvpByGuest[guestId]
    if (!statuses || statuses.length === 0) return 'pending'
    if (statuses.some(s => s === 'attending')) return 'attending'
    if (statuses.some(s => s === 'declined') && statuses.every(s => s === 'declined' || s === 'pending')) return 'declined'
    return 'pending'
  }

  let parties = guests.map(g => ({
    id:           g.id,
    name:         g.name,
    email:        g.email as string,
    language:     g.language || 'en',
    party_size:   1 + (memberCounts[g.id] || 0),
    rsvp_status:  deriveStatus(g.id),
    invite_token: g.invite_token,
  }))

  if (filter === 'attending') parties = parties.filter(p => p.rsvp_status === 'attending')
  if (filter === 'pending')   parties = parties.filter(p => p.rsvp_status === 'pending')
  if (filter === 'declined')  parties = parties.filter(p => p.rsvp_status === 'declined')

  return NextResponse.json({ parties })
}
