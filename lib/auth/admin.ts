import type { User } from '@supabase/supabase-js'

/**
 * Admin definition shared by the proxy and API route guards.
 *
 * - The user must be an authenticated Supabase user (verified with getUser()).
 * - If ADMIN_EMAILS (comma-separated) is set, the user's email must be in it.
 *   If it is NOT set, any authenticated Supabase user is treated as admin,
 *   matching the previous behaviour of the admin login. Set ADMIN_EMAILS in
 *   production and disable public sign-ups in Supabase.
 */
export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false
  const allowlist = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  if (allowlist.length === 0) return true
  return !!user.email && allowlist.includes(user.email.toLowerCase())
}
