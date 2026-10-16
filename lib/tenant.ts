import type { Database } from './database.types'

export type WeddingRole = Database['public']['Enums']['wedding_role']

/** Fixed id of tenant #1 (the existing wedding), created by the migrations. */
export const TENANT1_WEDDING_ID = '00000000-0000-0000-0000-000000000001'

/**
 * The wedding served by this deployment until Phase 2 introduces routing by
 * slug (/w/[slug], /dashboard/[slug]). Overridable per environment.
 */
export const DEFAULT_WEDDING_ID = process.env.NEXT_PUBLIC_DEFAULT_WEDDING_ID || TENANT1_WEDDING_ID

/** Wedding used by the admin dashboard pages (browser). */
export function currentWeddingId(): string {
  return DEFAULT_WEDDING_ID
}

const ROLE_ORDER: WeddingRole[] = ['viewer', 'editor', 'planner', 'partner', 'owner']

/** Mirrors public.role_rank(): higher means more privileges. */
export function roleRank(role: WeddingRole): number {
  return ROLE_ORDER.indexOf(role) + 1
}

export function hasRole(role: WeddingRole | null | undefined, min: WeddingRole): boolean {
  return !!role && roleRank(role) >= roleRank(min)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/**
 * Wedding targeted by an API request: the `x-wedding-id` header when present
 * (validated), otherwise the default tenant. Membership is always checked
 * afterwards by requireWeddingRole(); this only selects the tenant.
 */
export function requestedWeddingId(headers: Headers): string | null {
  const header = headers.get('x-wedding-id')
  if (header === null) return DEFAULT_WEDDING_ID
  return isUuid(header) ? header : null
}

/** Adds wedding_id to a row (or rows) before an insert/upsert. */
export function withWedding<T extends object>(rows: T[], weddingId?: string): (T & { wedding_id: string })[]
export function withWedding<T extends object>(rows: T, weddingId?: string): T & { wedding_id: string }
export function withWedding<T extends object>(rows: T | T[], weddingId: string = currentWeddingId()) {
  return Array.isArray(rows)
    ? rows.map((r) => ({ ...r, wedding_id: weddingId }))
    : { ...rows, wedding_id: weddingId }
}
