'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import { KAT_YAPILAR, KPI_META, SEGMENTLER, BOLGELER, DONEMLER } from '@/lib/kpi'
import { getRawMarkaRanking } from '@/lib/kpi'
import {
  ADMIN_MODULES,
  checkAdminModules,
  getInitialModuleHealth,
  type ModuleHealthResult,
  type ModuleHealthTone,
} from '@/lib/admin/module-health'
import adminStyles from '@/components/admin/adminTheme.module.css'

function getBadgeClass(tone: ModuleHealthTone) {
  if (tone === 'green') return `${adminStyles.badge} ${adminStyles.badgeGreen}`
  if (tone === 'red') return `${adminStyles.badge} ${adminStyles.badgeRed}`
  if (tone === 'blue') return `${adminStyles.badge} ${adminStyles.badgeBlue}`
  return `${adminStyles.badge} ${adminStyles.badgeAmber}`
}

export default function AdminHomePage() {
  const [moduleHealth, setModuleHealth] = useState<Record<string, ModuleHealthResult>>(() => getInitialModuleHealth())

  useEffect(() => {
    let mounted = true
    setModuleHealth(getInitialModuleHealth())

    checkAdminModules().then(results => {
      if (mounted) setModuleHealth(results)
    })

    return () => {
      mounted = false
    }
  }, [])

  const markaCount = useMemo(
    () => getRawMarkaRanking('', '', 'Tümü', DONEMLER[DONEMLER.length - 1] ?? '').length,
    []
  )
  const totalWeight = useMemo(() => KAT_YAPILAR.reduce((sum, c) => sum + c.agirlik, 0), [])
  const activeModuleCount = ADMIN_MODULES.filter(module => moduleHealth[module.href]?.status === 'active').length
  const hasChecksInProgress = ADMIN_MODULES.some(module => moduleHealth[module.href]?.status === 'checking')

  const metrics = [
    { label: 'KPI', value: KPI_META.length, hint: 'Statik metadata' },
    { label: 'Kategori', value: KAT_YAPILAR.length, hint: `Toplam ağırlık %${Math.round(totalWeight * 100)}` },
    { label: 'Segment', value: SEGMENTLER.length, hint: 'Mevcut veri seti' },
    { label: 'Bölge', value: BOLGELER.length, hint: 'Mevcut veri seti' },
    { label: 'Marka', value: markaCount || '—', hint: 'Son dönem / tüm Türkiye' },
    {
      label: 'Modül Sağlığı',
      value: hasChecksInProgress ? '…' : `${activeModuleCount}/${ADMIN_MODULES.length}`,
      hint: hasChecksInProgress ? 'Kontrol ediliyor' : 'Aktif modül sayısı',
    },
  ]

  return (
    <div className={adminStyles.shell}>
      <Topbar title="Yönetim Merkezi" subtitle="Super Admin modülleri ve canlı sağlık durumu" pills={[{ label: hasChecksInProgress ? 'Kontrol ediliyor' : 'Sağlık kontrolü tamamlandı', variant: hasChecksInProgress ? 'blue' : 'green' }]} />
      <div className={adminStyles.content}>
        <div className={adminStyles.inner}>
          <section className={adminStyles.section}>
            <div className={adminStyles.eyebrow}>Super Admin Kontrol Merkezi</div>
            <h1 className={adminStyles.pageTitle}>Admin modülleri gerçek durumlarıyla izleniyor</h1>
            <p className={adminStyles.bodyText}>
              Modül kartları sayfa açılışında route ve ilgili Supabase kaynaklarını hızlıca kontrol eder. Erişilemeyen modüller sayfayı çökertmeden Pasif/Hata olarak işaretlenir.
            </p>
          </section>

          <section className={adminStyles.metricGrid} aria-label="Admin özet metrikleri">
            {metrics.map(metric => (
              <div key={metric.label} className={adminStyles.metricCard}>
                <div className={adminStyles.metricLabel}>{metric.label}</div>
                <div className={adminStyles.metricValue}>{metric.value}</div>
                <div className={adminStyles.metricHint}>{metric.hint}</div>
              </div>
            ))}
          </section>

          <section className={adminStyles.moduleGrid} aria-label="Admin modülleri">
            {ADMIN_MODULES.map(module => {
              const health = moduleHealth[module.href] ?? getInitialModuleHealth()[module.href]

              return (
                <Link key={module.href} href={module.href} className={adminStyles.moduleCard}>
                  <div className={adminStyles.moduleHeader}>
                    <h2 className={adminStyles.cardTitle}>{module.title}</h2>
                    <span className={getBadgeClass(health.tone)}>{health.label}</span>
                  </div>
                  <p className={adminStyles.mutedText}>{module.desc}</p>
                  <p className={adminStyles.moduleHealthText}>{health.detail}</p>
                </Link>
              )
            })}
          </section>
        </div>
      </div>
    </div>
  )
}
