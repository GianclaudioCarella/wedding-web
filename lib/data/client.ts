/**
 * The ONLY module allowed to use the service_role client (enforced by ESLint).
 * service_role bypasses RLS, so every function in lib/data/* takes the
 * weddingId explicitly and filters/inserts with it.
 */
export { supabaseAdmin as serviceDb } from '@/lib/supabase-admin'
