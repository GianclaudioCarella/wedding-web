import { DEFAULT_WEDDING_ID } from '@/lib/tenant'

/**
 * TEMPORARY transition fallback (PLAN.md §4: "ADMIN_EMAILS remains only as a
 * temporary bootstrap during the migration, then is removed").
 *
 * Until tenant #1 owners exist in wedding_members, server routes may treat an
 * e-mail listed in ADMIN_EMAILS as owner of the DEFAULT wedding only. Unlike
 * the old behaviour, an empty ADMIN_EMAILS grants nothing. It does not affect
 * RLS (the browser dashboard needs real memberships). Remove ADMIN_EMAILS from
 * the environment once owners are assigned; see PHASE1-ROLLOUT.md.
 */
export function isBootstrapAdmin(email: string | null | undefined, weddingId: string): boolean {
  if (!email || weddingId !== DEFAULT_WEDDING_ID) return false
  const allowlist = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allowlist.includes(email.toLowerCase())
}
