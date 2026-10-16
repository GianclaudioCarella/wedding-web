import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { isAdminUser } from './admin'

type AdminAuthResult =
  | { ok: true; user: User; supabase: SupabaseClient }
  | { ok: false; response: NextResponse }

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Verifies that the request comes from an admin user.
 *
 * Accepts either the Supabase session cookie (set by the browser client in
 * lib/supabase.ts) or an `Authorization: Bearer <access_token>` header.
 * Returns a user-scoped Supabase client (RLS applies) on success, or a
 * ready-to-return 401/403 response on failure.
 */
export async function requireAdmin(request: NextRequest): Promise<AdminAuthResult> {
  let supabase: SupabaseClient
  let user: User | null = null

  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    supabase = createClient(url(), anonKey(), {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data } = await supabase.auth.getUser(token)
    user = data.user
  } else {
    const cookieStore = await cookies()
    supabase = createServerClient(url(), anonKey(), {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Cookies can be read-only in some contexts; the proxy refreshes them.
          }
        },
      },
    }) as unknown as SupabaseClient
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!isAdminUser(user)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: true, user, supabase }
}
