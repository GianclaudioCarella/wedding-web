import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from '@/lib/encryption';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SENSITIVE_FIELDS = ['github_token', 'tavily_api_key', 'anthropic_api_key'] as const;

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user ?? null;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
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
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  const { data: existing } = await supabaseAdmin
    .from('user_settings')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    const update: Record<string, string> = {};
    for (const field of SENSITIVE_FIELDS) {
      if (body[field] !== undefined) {
        update[field] = body[field] ? encrypt(body[field]) : '';
      }
    }
    const { error } = await supabaseAdmin
      .from('user_settings')
      .update(update)
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  } else {
    const insert: Record<string, string> = { user_id: user.id };
    for (const field of SENSITIVE_FIELDS) {
      insert[field] = body[field] ? encrypt(body[field]) : '';
    }
    const { error } = await supabaseAdmin
      .from('user_settings')
      .insert(insert);
    if (error) return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
