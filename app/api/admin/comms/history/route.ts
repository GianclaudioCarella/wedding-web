import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  const { data, error } = await supabaseAdmin
    .from('email_campaigns')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(50)

  if (error) {
    // Table doesn't exist yet — return empty rather than crashing
    return NextResponse.json({ campaigns: [] })
  }

  return NextResponse.json({ campaigns: data || [] })
}
