import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingRole } from '@/lib/auth/requireWeddingRole'
import { listCampaigns } from '@/lib/data/campaigns'

export async function GET(request: NextRequest) {
  const auth = await requireWeddingRole(request, 'viewer')
  if (!auth.ok) return auth.response
  const { data, error } = await listCampaigns(auth.weddingId)

  if (error) {
    console.error('Failed to load campaigns:', error.message)
    return NextResponse.json({ campaigns: [] })
  }

  return NextResponse.json({ campaigns: data || [] })
}
