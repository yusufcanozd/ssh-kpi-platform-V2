import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import adminStyles from '@/components/admin/adminTheme.module.css'

type StatusVariant = 'blue' | 'amber' | 'green' | 'red'

type AdminModulePageProps = {
  title: string
  subtitle: string
  statusLabel?: string
  statusVariant?: StatusVariant
  metrics?: Array<{ label: string; value: string | number; hint?: string }>
  sections: Array<{ title: string; description?: string; items: string[] }>
  nextSteps?: string[]
  backHref?: string
}


function getModuleBadgeClass(variant: StatusVariant) {
  if (variant === 'green') return `${adminStyles.badge} ${adminStyles.badgeGreen}`
  if (variant === 'red') return `${adminStyles.badge} ${adminStyles.badgeRed}`
  if (variant === 'blue') return `${adminStyles.badge} ${adminStyles.badgeBlue}`
  return `${adminStyles.badge} ${adminStyles.badgeAmber}`
}

const cardStyle = {
  background: 'var(--surf)',
  border: '1px solid var(--bd)',
  borderRadius: 14,
  boxShadow: '0 10px 30px rgba(0,0,0,.10)',
} as const

export default function AdminModulePage({
  title,
  subtitle,
  statusLabel = 'Taslak modül',
  statusVariant = 'blue',
  metrics = [],
  sections,
  nextSteps = [],
  backHref = '/admin',
}: AdminModulePageProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar
        title={title}
        subtitle={subtitle}
        pills={[{ label: statusLabel, variant: statusVariant === 'red' ? 'amber' : statusVariant }]}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '22px 24px 32px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 18 }}>
          <div style={{ ...cardStyle, padding: 18, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Super Admin Hazırlık Alanı
              </div>
              <div style={{ color: 'var(--tx)', fontWeight: 700, fontSize: 18, marginBottom: 5 }}>
                Bu ekran güvenli iskelet modundadır.
              </div>
              <div style={{ color: 'var(--tx3)', fontSize: 13, lineHeight: 1.6, maxWidth: 760 }}>
                Bu aşamada veri kaydetme, KPI motorunu değiştirme veya Supabase tablosuna yazma işlemi yapılmaz. Amaç yönetim mimarisini görünür hale getirip sonraki promptlar için güvenli başlangıç oluşturmaktır.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className={getModuleBadgeClass(statusVariant)}>{statusLabel}</span>
              <Link href={backHref} style={{ textDecoration: 'none', color: '#93c5fd', fontSize: 12, fontWeight: 700, border: '1px solid rgba(147,197,253,.35)', borderRadius: 999, padding: '8px 12px' }}>
                Yönetim özetine dön
              </Link>
            </div>
          </div>

          {metrics.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {metrics.map(metric => (
                <div key={metric.label} style={{ ...cardStyle, padding: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{metric.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--tx)', marginTop: 8 }}>{metric.value}</div>
                  {metric.hint && <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 6, lineHeight: 1.5 }}>{metric.hint}</div>}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {sections.map(section => (
              <section key={section.title} style={{ ...cardStyle, padding: 18 }}>
                <h2 style={{ margin: 0, fontSize: 16, color: 'var(--tx)', fontWeight: 800 }}>{section.title}</h2>
                {section.description && <p style={{ margin: '8px 0 14px', color: 'var(--tx3)', fontSize: 12, lineHeight: 1.6 }}>{section.description}</p>}
                <div style={{ display: 'grid', gap: 9 }}>
                  {section.items.map(item => (
                    <div key={item} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', color: 'var(--tx2)', fontSize: 13, lineHeight: 1.55 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: '#60a5fa', marginTop: 7, flex: '0 0 auto' }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {nextSteps.length > 0 && (
            <section style={{ ...cardStyle, padding: 18, borderColor: 'rgba(245,158,11,.35)' }}>
              <h2 style={{ margin: 0, fontSize: 16, color: 'var(--tx)', fontWeight: 800 }}>Sonraki promptlarda aktif edilecekler</h2>
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                {nextSteps.map((step, idx) => (
                  <div key={step} style={{ display: 'flex', gap: 10, color: 'var(--tx2)', fontSize: 13, lineHeight: 1.55 }}>
                    <span style={{ color: '#f59e0b', fontWeight: 900 }}>{idx + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
