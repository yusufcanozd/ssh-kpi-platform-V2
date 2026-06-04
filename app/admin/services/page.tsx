'use client'

import Topbar from '@/components/layout/Topbar'
import adminStyles from '@/components/admin/adminTheme.module.css'

export default function AdminPage() {
  return (
    <div className={adminStyles.shell}>
      <Topbar title="Servis Yönetimi" subtitle="Admin servis araçları hazırlanıyor" />
      <div className={adminStyles.content}>
        <div className={adminStyles.inner}>
          <section className={adminStyles.emptyState}>
            <div className={adminStyles.eyebrow}>Hazırlık Modülü</div>
            <h1 className={adminStyles.emptyTitle}>Bu bölüm hazırlanıyor</h1>
            <p className={adminStyles.emptyText}>
              Servis yönetimi ekranı ortak admin tasarım sistemiyle uyumlu boş durum görünümünü kullanır. İşlevsel kontroller eklendiğinde aynı kart, tipografi ve aralık tokenlarıyla genişletilecek.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
