'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

type AdminAccessGuardProps = {
  children: React.ReactNode
}

export default function AdminAccessGuard({ children }: AdminAccessGuardProps) {
  const { loading, profile, isSuperAdmin } = useAuth()
  const router = useRouter()

  const canAccess = isSuperAdmin

  useEffect(() => {
    if (loading) return

    if (!profile) {
      router.replace('/login')
      return
    }

    if (isSuperAdmin) return

    router.replace('/dashboard')
  }, [isSuperAdmin, loading, profile, router])

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
