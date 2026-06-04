'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import AdminAccessGuard from '@/components/admin/AdminAccessGuard'
import styles from './layout.module.css'

const ADMIN_SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed'
const ADMIN_SIDEBAR_WIDTH = '224px'
const ADMIN_SIDEBAR_COLLAPSED_WIDTH = '44px'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY)
      if (stored !== null) setCollapsed(stored === 'true')
    } catch {
      // localStorage kullanılamıyorsa varsayılan açık görünüm korunur.
    }
  }, [])

  const handleToggle = () => {
    setCollapsed(current => {
      const next = !current
      try {
        window.localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, String(next))
      } catch {
        // Kalıcılık başarısız olsa bile arayüz durumu değişmeye devam eder.
      }
      return next
    })
  }

  return (
    <div
      className={styles.shell}
      data-sidebar-collapsed={collapsed ? 'true' : 'false'}
      style={{
        '--admin-sidebar-width': collapsed ? ADMIN_SIDEBAR_COLLAPSED_WIDTH : ADMIN_SIDEBAR_WIDTH,
      } as CSSProperties}
    >
      <Sidebar variant="admin" collapsed={collapsed} onToggle={handleToggle} />
      <main className={styles.main}>
        <AdminAccessGuard>{children}</AdminAccessGuard>
      </main>
    </div>
  )
}
