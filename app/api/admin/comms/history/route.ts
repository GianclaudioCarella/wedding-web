import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
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
