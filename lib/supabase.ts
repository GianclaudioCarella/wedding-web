import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Browser client that persists the auth session in cookies (instead of
// localStorage) so the server (proxy + API routes) can verify the admin session.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
