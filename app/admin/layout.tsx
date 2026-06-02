'use client'

import Sidebar from '@/components/layout/Sidebar'
import AdminAccessGuard from '@/components/admin/AdminAccessGuard'
import styles from './layout.module.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar variant="admin" />
      <main className={styles.main}>
        <AdminAccessGuard>{children}</AdminAccessGuard>
      </main>
    </div>
  )
}
