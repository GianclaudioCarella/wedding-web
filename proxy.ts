import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isAdminUser } from '@/lib/auth/admin'

/**
 * Server-side protection for /admin pages (except /admin/login) and /api/admin/*.
 * API routes additionally enforce auth themselves via requireAdmin(), so this is
 * defence in depth. Bearer-token API calls are passed through to the route guard.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')

  if (pathname === '/admin/login') return NextResponse.next()
  if (isApi && request.headers.get('Authorization')?.startsWith('Bearer ')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminUser(user)) {
    if (isApi) {
      return NextResponse.json(
        { error: user ? 'Forbidden' : 'Unauthorized' },
        { status: user ? 403 : 401 },
      )
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/admin/login'
    loginUrl.search = ''
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/replicate-rsvps',
    '/api/mark-not-attending',
    '/api/send-invitation',
    '/api/send-accommodation-email',
  ],
}
