import type { TablesInsert } from '@/lib/database.types'
import { serviceDb } from './client'

type RsvpRow = Omit<TablesInsert<'rsvp_responses'>, 'wedding_id'>
type StayRow = Omit<TablesInsert<'guest_stay_requests'>, 'wedding_id'>

export async function listRsvps(weddingId: string, guestIds: string[]) {
  const { data } = await serviceDb
    .from('rsvp_responses')
    .select('guest_id, event_id, status, dietary_requirements, dietary_notes, notes')
    .eq('wedding_id', weddingId)
    .in('guest_id', guestIds)
  return data ?? []
}

export async function hasRsvped(weddingId: string, guestId: string): Promise<boolean> {
  const { count } = await serviceDb
    .from('rsvp_responses')
    .select('id', { count: 'exact', head: true })
    .eq('wedding_id', weddingId)
    .eq('guest_id', guestId)
  return (count ?? 0) > 0
}

export async function upsertRsvps(weddingId: string, rows: RsvpRow[]) {
  if (rows.length === 0) return { error: null }
  return serviceDb
    .from('rsvp_responses')
    .upsert(rows.map((r) => ({ ...r, wedding_id: weddingId })), { onConflict: 'guest_id,event_id' })
}

export async function insertRsvps(weddingId: string, rows: RsvpRow[]) {
  if (rows.length === 0) return { error: null }
  return serviceDb.from('rsvp_responses').insert(rows.map((r) => ({ ...r, wedding_id: weddingId })))
}

export async function getStayRequest(weddingId: string, guestId: string) {
  const { data } = await serviceDb
    .from('guest_stay_requests')
    .select('sunday_night, friday_night, saturday_night, notes')
    .eq('wedding_id', weddingId)
    .eq('guest_id', guestId)
    .maybeSingle()
  return data
}

export async function upsertStayRequest(weddingId: string, row: StayRow) {
  return serviceDb
    .from('guest_stay_requests')
    .upsert({ ...row, wedding_id: weddingId }, { onConflict: 'guest_id' })
}

export async function insertStayRequest(weddingId: string, row: StayRow) {
  return serviceDb.from('guest_stay_requests').insert({ ...row, wedding_id: weddingId })
}
