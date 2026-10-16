import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { decrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  // user_settings has per-user RLS policies, so the user-scoped client is enough.
  const { user, supabase } = auth;

  const { data: settings } = await supabase
    .from('user_settings')
    .select('github_token')
    .eq('user_id', user.id)
    .single();

  const githubToken = settings?.github_token ? decrypt(settings.github_token) : null;
  if (!githubToken) {
    return NextResponse.json({ error: 'GitHub token not configured' }, { status: 400 });
  }

  const body = await request.json();

  const response = await fetch('https://models.inference.ai.azure.com/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${githubToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
