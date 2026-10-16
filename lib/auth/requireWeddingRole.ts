import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { hasRole, requestedWeddingId, type WeddingRole } from '@/lib/tenant'
import { isBootstrapAdmin } from './bootstrap'

type Failure = { ok: false; response: NextResponse }
export type AuthedUser = { ok: true; user: User; supabase: SupabaseClient<Database> }
export type WeddingAuth = AuthedUser & { weddingId: string; role: WeddingRole }

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const fail = (status: number, error: string): Failure => ({
  ok: false,
  response: NextResponse.json({ error }, { status }),
})

/**
 * Verifies the Supabase user from the session cookie or an
 * `Authorization: Bearer <access_token>` header, and returns a user-scoped
 * client (RLS applies).
 */
export async function requireUser(request: NextRequest): Promise<AuthedUser | Failure> {
  let supabase: SupabaseClient<Database>
  let user: User | null

  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    supabase = createClient<Database>(url(), anonKey(), {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    user = (await supabase.auth.getUser(token)).data.user
  } else {
    const cookieStore = await cookies()
    supabase = createServerClient<Database>(url(), anonKey(), {
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
    }) as unknown as SupabaseClient<Database>
    user = (await supabase.auth.getUser()).data.user
  }

  if (!user) return fail(401, 'Unauthorized')
  return { ok: true, user, supabase }
}

export type AccessDecision = { ok: true; role: WeddingRole } | { ok: false; status: 403 | 404 }

/**
 * Pure access decision. Non-members get 404 (do not leak that the wedding
 * exists); members below `min` get 403. The ADMIN_EMAILS bootstrap applies to
 * the default wedding only and is transitional (lib/auth/bootstrap.ts).
 */
export function decideWeddingAccess(
  role: WeddingRole | null,
  min: WeddingRole,
  ctx: { email?: string | null; weddingId: string },
): AccessDecision {
  const effective: WeddingRole | null = role ?? (isBootstrapAdmin(ctx.email, ctx.weddingId) ? 'owner' : null)
  if (!effective) return { ok: false, status: 404 }
  if (!hasRole(effective, min)) return { ok: false, status: 403 }
  return { ok: true, role: effective }
}

/**
 * Requires the caller to hold at least `min` in the requested wedding
 * (x-wedding-id header, defaulting to the current tenant). Replaces the old
 * ADMIN_EMAILS-based requireAdmin().
 */
export async function requireWeddingRole(
  request: NextRequest,
  min: WeddingRole = 'editor',
  weddingId: string | null = requestedWeddingId(request.headers),
): Promise<WeddingAuth | Failure> {
  if (!weddingId) return fail(400, 'Invalid wedding id')
  const auth = await requireUser(request)
  if (!auth.ok) return auth

  const { data: role, error } = await auth.supabase.rpc('wedding_role_of', { w: weddingId })
  if (error) {
    console.error('wedding_role_of failed:', error.message)
    return fail(500, 'Authorization check failed')
  }

  const decision = decideWeddingAccess((role as WeddingRole | null) ?? null, min, {
    email: auth.user.email,
    weddingId,
  })
  if (!decision.ok) return fail(decision.status, decision.status === 404 ? 'Not found' : 'Forbidden')
  if (!role) console.warn(`[auth] ADMIN_EMAILS bootstrap used for ${auth.user.id}; assign wedding owners and remove ADMIN_EMAILS`)
  return { ...auth, weddingId, role: decision.role }
}

/** Requires a platform operator (public.platform_admins). */
export async function requirePlatformAdmin(request: NextRequest): Promise<AuthedUser | Failure> {
  const auth = await requireUser(request)
  if (!auth.ok) return auth
  const { data, error } = await auth.supabase.rpc('is_platform_admin')
  if (error || !data) return fail(403, 'Forbidden')
  return auth
}
