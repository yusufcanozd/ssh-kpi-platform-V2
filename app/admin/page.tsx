import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import { KAT_YAPILAR, KPI_META, SEGMENTLER, BOLGELER, DONEMLER } from '@/lib/kpi'
import { getRawMarkaRanking } from '@/lib/kpi'

const modules = [
  { href: '/admin/users', title: 'Kullanıcılar', desc: 'Rol, aktiflik ve mevcut kullanıcı listesi.', status: 'Aktif' },
  { href: '/admin/kpi-settings', title: 'KPI Ayarları', desc: 'KPI tanımları, yönleri, coverage ve kategori bağlantıları.', status: 'İskelet' },
  { href: '/admin/categories', title: 'Kategoriler', desc: 'Kategori ağırlıkları, KPI bağlantıları ve skor metodolojisi.', status: 'İskelet' },
  { href: '/admin/brands', title: 'Markalar', desc: 'Marka listesi, segment dağılımı ve gizlilik kuralı görünümü.', status: 'İskelet' },
  { href: '/admin/data-import', title: 'Data Import', desc: 'Excel/CSV import akışı, kolon eşleştirme ve validasyon planı.', status: 'İskelet' },
  { href: '/admin/permissions', title: 'Kullanıcı Kısıtları', desc: 'Segment, marka ve bölge bazlı görünürlük kurgusu.', status: 'İskelet' },
  { href: '/admin/theme', title: 'Tema / Görsel Ayarlar', desc: 'Executive renk sistemi, grafik standardı ve rapor görsel dili.', status: 'İskelet' },
]

const cardStyle = {
  background: 'var(--surf)',
  border: '1px solid var(--bd)',
  borderRadius: 14,
  boxShadow: '0 10px 30px rgba(0,0,0,.10)',
} as const

export default function AdminHomePage() {
  const markaCount = getRawMarkaRanking('', '', 'Tümü', DONEMLER[DONEMLER.length - 1] ?? '').length
  const totalWeight = KAT_YAPILAR.reduce((sum, c) => sum + c.agirlik, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar title="Yönetim Merkezi" subtitle="Super Admin modülleri ve geliştirme yol haritası" pills={[{ label: 'Prompt 2', variant: 'blue' }]} />
      <div style={{ flex: 1, overflow: 'auto', padding: '22px 24px 32px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 18 }}>
          <section style={{ ...cardStyle, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 7 }}>
              Super Admin Yol Haritası
            </div>
            <h1 style={{ margin: 0, fontSize: 26, color: 'var(--tx)' }}>Platform yönetimi tek merkezde toplanıyor</h1>
            <p style={{ color: 'var(--tx3)', fontSize: 13, lineHeight: 1.65, maxWidth: 820, margin: '10px 0 0' }}>
              Bu ekranlar şimdilik güvenli iskelet modundadır. Veriyi değiştirmez, KPI hesaplama motoruna müdahale etmez ve Supabase tablosuna yazmaz. Sonraki promptlarda her modül kontrollü şekilde aktif hale getirilecektir.
            </p>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'KPI', value: KPI_META.length, hint: 'Statik metadata' },
              { label: 'Kategori', value: KAT_YAPILAR.length, hint: `Toplam ağırlık %${Math.round(totalWeight * 100)}` },
              { label: 'Segment', value: SEGMENTLER.length, hint: 'Mevcut veri seti' },
              { label: 'Bölge', value: BOLGELER.length, hint: 'Mevcut veri seti' },
              { label: 'Marka', value: markaCount || '—', hint: 'Son dönem / tüm Türkiye' },
            ].map(metric => (
              <div key={metric.label} style={{ ...cardStyle, padding: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>{metric.label}</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--tx)', marginTop: 8 }}>{metric.value}</div>
                <div style={{ color: 'var(--tx3)', fontSize: 12, marginTop: 5 }}>{metric.hint}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {modules.map(module => (
              <Link key={module.href} href={module.href} style={{ ...cardStyle, padding: 18, textDecoration: 'none', color: 'inherit', display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: 16, color: 'var(--tx)', fontWeight: 850 }}>{module.title}</h2>
                  <span style={{ fontSize: 10, fontWeight: 800, color: module.status === 'Aktif' ? '#10b981' : '#f59e0b', border: `1px solid ${module.status === 'Aktif' ? '#10b98155' : '#f59e0b55'}`, borderRadius: 999, padding: '3px 8px' }}>
                    {module.status}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--tx3)', fontSize: 12, lineHeight: 1.6 }}>{module.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
