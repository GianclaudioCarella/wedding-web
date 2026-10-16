import { NextRequest, NextResponse } from 'next/server';
import { requireWeddingRole } from '@/lib/auth/requireWeddingRole';
import { encrypt, decrypt } from '@/lib/encryption';
import type { TablesInsert, TablesUpdate } from '@/lib/database.types';

const SENSITIVE_FIELDS = ['github_token', 'tavily_api_key', 'anthropic_api_key'] as const;

export async function GET(request: NextRequest) {
  const auth = await requireWeddingRole(request, 'editor');
  if (!auth.ok) return auth.response;
  // user_settings has per-user RLS policies, so the user-scoped client is enough.
  const { user, supabase } = auth;

  const { data, error } = await supabase
    .from('user_settings')
    .select('github_token, tavily_api_key, anthropic_api_key')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
  if (!data) return NextResponse.json({});

  const result: Record<string, string | null> = {};
  for (const field of SENSITIVE_FIELDS) {
    result[field] = data[field] ? decrypt(data[field]) : null;
  }
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await requireWeddingRole(request, 'editor');
  if (!auth.ok) return auth.response;
  // user_settings has per-user RLS policies, so the user-scoped client is enough.
  const { user, supabase } = auth;

  const body = await request.json();

  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    const update: TablesUpdate<'user_settings'> = {};
    for (const field of SENSITIVE_FIELDS) {
      if (body[field] !== undefined) {
        update[field] = body[field] ? encrypt(body[field]) : '';
      }
    }
    const { error } = await supabase
      .from('user_settings')
      .update(update)
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  } else {
    const insert: TablesInsert<'user_settings'> = { user_id: user.id };
    for (const field of SENSITIVE_FIELDS) {
      insert[field] = body[field] ? encrypt(body[field]) : '';
    }
    const { error } = await supabase
      .from('user_settings')
      .insert(insert);
    if (error) return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
