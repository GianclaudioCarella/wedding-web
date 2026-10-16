import { NextRequest, NextResponse } from 'next/server';
import { requireWeddingRole } from '@/lib/auth/requireWeddingRole';
import { decrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  const auth = await requireWeddingRole(request, 'editor');
  if (!auth.ok) return auth.response;
  // user_settings has per-user RLS policies, so the user-scoped client is enough.
  const { user, supabase } = auth;

  const { data: settings } = await supabase
    .from('user_settings')
    .select('anthropic_api_key')
    .eq('user_id', user.id)
    .single();

  const anthropicKey = settings?.anthropic_api_key
    ? decrypt(settings.anthropic_api_key)
    : null;

  if (!anthropicKey) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 400 });
  }

  const body = await request.json();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
