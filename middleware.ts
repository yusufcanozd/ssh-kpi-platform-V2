import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRole, isSuperAdminRole } from '@/lib/roles'

type ProfileAccessRow = {
  role?: string | null
  is_active?: boolean | null
}

const SUPERADMIN_HOME_PATH = '/admin'
const ADMIN_HOME_PATH = '/admin/user-permissions'
const DASHBOARD_HOME_PATH = '/dashboard'
const LOGIN_PATH = '/login'

function isLegacyAdminUsersPath(path: string) {
  return path === '/admin/users' || path.startsWith('/admin/users/')
}

function isAdminManagementPath(path: string) {
  return (
    path === ADMIN_HOME_PATH ||
    path.startsWith(`${ADMIN_HOME_PATH}/`) ||
    path === '/admin/permissions' ||
    path.startsWith('/admin/permissions/')
  )
}

function getPostLoginPath(role?: string | null) {
  if (isSuperAdminRole(role)) return SUPERADMIN_HOME_PATH
  if (role === 'admin') return ADMIN_HOME_PATH
  return DASHBOARD_HOME_PATH
}

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

  if (!user && path !== LOGIN_PATH) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  }

  let profile: ProfileAccessRow | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single<ProfileAccessRow>()
    profile = data ?? null
  }

  if (user && !profile?.is_active) {
    if (path === LOGIN_PATH) return NextResponse.next({ request })
    const redirectResponse = NextResponse.redirect(new URL('/login?inactive=1', request.url))
    redirectResponse.cookies.delete('sb-access-token')
    redirectResponse.cookies.delete('sb-refresh-token')
    return redirectResponse
  }

  if (user && path === LOGIN_PATH) {
    return NextResponse.redirect(new URL(getPostLoginPath(profile?.role), request.url))
  }

  if (user && path.startsWith('/admin')) {
    if (!isAdminRole(profile?.role)) {
      return NextResponse.redirect(new URL(DASHBOARD_HOME_PATH, request.url))
    }

    if (isLegacyAdminUsersPath(path)) {
      return NextResponse.redirect(new URL(ADMIN_HOME_PATH, request.url))
    }

    if (!isSuperAdminRole(profile?.role) && !isAdminManagementPath(path)) {
      return NextResponse.redirect(new URL(ADMIN_HOME_PATH, request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
