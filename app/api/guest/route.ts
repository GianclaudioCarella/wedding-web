import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('guests')
    .select('id, name, email, invite_token')
    .eq('invite_token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
