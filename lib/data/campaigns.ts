import type { TablesInsert } from '@/lib/database.types'
import { serviceDb } from './client'

export async function listCampaigns(weddingId: string, limit = 50) {
  return serviceDb
    .from('email_campaigns')
    .select('*')
    .eq('wedding_id', weddingId)
    .order('sent_at', { ascending: false })
    .limit(limit)
}

export async function logCampaign(weddingId: string, row: Omit<TablesInsert<'email_campaigns'>, 'wedding_id'>) {
  const { error } = await serviceDb.from('email_campaigns').insert({ ...row, wedding_id: weddingId })
  if (error) console.error('Failed to log email campaign:', error.message)
}
