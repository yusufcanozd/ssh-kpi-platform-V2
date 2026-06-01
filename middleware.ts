import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRole } from './lib/roles'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  let profile: { role?: string | null; is_active?: boolean | null } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()
    profile = data
  }

  // Login değilse → /login'e yönlendir
  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Login olmuş, /login'e gelirse → role'e göre yönlendir
  if (user && path === '/login') {
    if (!profile?.is_active) {
      return NextResponse.redirect(new URL('/login?inactive=1', request.url))
    }
    return NextResponse.redirect(new URL(isAdminRole(profile?.role) ? '/admin/users' : '/dashboard', request.url))
  }

  // Pasife alınmış kullanıcılar korumalı sayfalara devam edemesin
  if (user && path !== '/login' && profile?.is_active === false) {
    const redirectResponse = NextResponse.redirect(new URL('/login?inactive=1', request.url))
    redirectResponse.cookies.delete('sb-access-token')
    redirectResponse.cookies.delete('sb-refresh-token')
    return redirectResponse
  }

  // Admin sayfasına admin olmayan girmesin
  if (user && path.startsWith('/admin')) {
    if (!profile?.is_active) {
      return NextResponse.redirect(new URL('/login?inactive=1', request.url))
    }
    if (!isAdminRole(profile?.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
