'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

type AdminAccessGuardProps = {
  children: React.ReactNode
}

const ADMIN_AND_SUPERADMIN_PATHS = new Set(['/admin/users'])

function isAdminUsersPath(pathname: string) {
  return pathname === '/admin/users' || pathname.startsWith('/admin/users/')
}

export default function AdminAccessGuard({ children }: AdminAccessGuardProps) {
  const { loading, profile, isAdmin, isSuperAdmin } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const canAccess = isSuperAdmin || (isAdmin && isAdminUsersPath(pathname))

  useEffect(() => {
    if (loading) return

    if (!profile) {
      router.replace('/login')
      return
    }

    if (isSuperAdmin) return

    if (isAdmin && isAdminUsersPath(pathname)) return

    if (isAdmin) {
      router.replace('/admin/users')
      return
    }

    router.replace('/dashboard')
  }, [isAdmin, isSuperAdmin, loading, pathname, profile, router])

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--tx3)' }}>
        Yetki kontrol ediliyor...
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--tx3)' }}>
        Bu alan için yetki doğrulanıyor...
      </div>
    )
  }

  return <>{children}</>
}
