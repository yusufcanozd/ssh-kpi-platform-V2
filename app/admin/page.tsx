import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import { KAT_YAPILAR, KPI_META, SEGMENTLER, BOLGELER, DONEMLER } from '@/lib/kpi'
import { getRawMarkaRanking } from '@/lib/kpi'
import adminStyles from '@/components/admin/adminTheme.module.css'

const modules = [
  { href: '/admin/users', title: 'Kullanıcılar', desc: 'Rol, aktiflik ve mevcut kullanıcı listesi.', status: 'Aktif', tone: 'green' },
  { href: '/admin/kpi-settings', title: 'KPI Ayarları', desc: 'KPI tanımları, yönleri, coverage ve kategori bağlantıları.', status: 'Prompt 4', tone: 'amber' },
  { href: '/admin/categories', title: 'Kategoriler', desc: 'Kategori adı, kısa ad, renk, sıralama ve aktif/pasif yönetimi.', status: 'Prompt 4', tone: 'amber' },
  { href: '/admin/weights', title: 'Kategori Ağırlıkları', desc: 'Kategori ağırlıkları ve metodoloji versiyonlama hazırlığı.', status: 'Hazırlık', tone: 'amber' },
  { href: '/admin/brands', title: 'Markalar', desc: 'Marka listesi, segment dağılımı ve gizlilik kuralı görünümü.', status: 'İskelet', tone: 'blue' },
  { href: '/admin/data-import', title: 'Data Import', desc: 'Excel/CSV import akışı, kolon eşleştirme ve validasyon planı.', status: 'İskelet', tone: 'blue' },
  { href: '/admin/user-permissions', title: 'Kullanıcı Kısıtları', desc: 'Segment, marka ve bölge bazlı görünürlük kurgusu.', status: 'Hazırlık', tone: 'amber' },
  { href: '/admin/theme', title: 'Tema / Görsel Ayarlar', desc: 'Executive renk sistemi, grafik standardı ve rapor görsel dili.', status: 'İskelet', tone: 'blue' },
] as const

function getBadgeClass(tone: typeof modules[number]['tone']) {
  if (tone === 'green') return `${adminStyles.badge} ${adminStyles.badgeGreen}`
  if (tone === 'blue') return `${adminStyles.badge} ${adminStyles.badgeBlue}`
  return `${adminStyles.badge} ${adminStyles.badgeAmber}`
}

export default function AdminHomePage() {
  const markaCount = getRawMarkaRanking('', '', 'Tümü', DONEMLER[DONEMLER.length - 1] ?? '').length
  const totalWeight = KAT_YAPILAR.reduce((sum, c) => sum + c.agirlik, 0)

  const metrics = [
    { label: 'KPI', value: KPI_META.length, hint: 'Statik metadata' },
    { label: 'Kategori', value: KAT_YAPILAR.length, hint: `Toplam ağırlık %${Math.round(totalWeight * 100)}` },
    { label: 'Segment', value: SEGMENTLER.length, hint: 'Mevcut veri seti' },
    { label: 'Bölge', value: BOLGELER.length, hint: 'Mevcut veri seti' },
    { label: 'Marka', value: markaCount || '—', hint: 'Son dönem / tüm Türkiye' },
  ]

  return (
    <div className={adminStyles.shell}>
      <Topbar title="Yönetim Merkezi" subtitle="Super Admin modülleri ve geliştirme yol haritası" pills={[{ label: 'Prompt 4 hazır', variant: 'green' }]} />
      <div className={adminStyles.content}>
        <div className={adminStyles.inner}>
          <section className={adminStyles.section}>
            <div className={adminStyles.eyebrow}>Super Admin Yol Haritası</div>
            <h1 className={adminStyles.pageTitle}>Platform yönetimi tek merkezde toplanıyor</h1>
            <p className={adminStyles.bodyText}>
              KPI ve kategori yönetimi gerçek form/validasyon yapısına taşındı. Diğer modüller güvenli hazırlık modunda kalır; skor motoru ve dashboard hesapları bu sayfadan değiştirilmez.
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
            {modules.map(module => (
              <Link key={module.href} href={module.href} className={adminStyles.moduleCard}>
                <div className={adminStyles.moduleHeader}>
                  <h2 className={adminStyles.cardTitle}>{module.title}</h2>
                  <span className={getBadgeClass(module.tone)}>{module.status}</span>
                </div>
                <p className={adminStyles.mutedText}>{module.desc}</p>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
