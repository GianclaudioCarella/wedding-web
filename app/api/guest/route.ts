import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isValidInviteToken } from '@/lib/auth/inviteToken'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!isValidInviteToken(token)) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('guests')
    .select('name')
    .eq('invite_token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
  }

  // Public endpoint: expose only what the landing page needs.
  return NextResponse.json({ name: data.name })
}
