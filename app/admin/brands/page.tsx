import AdminModulePage from '@/components/admin/AdminModulePage'
import { DONEMLER, SEGMENTLER } from '@/lib/kpi'
import { getRawMarkaRanking } from '@/lib/kpi'

export default function BrandsAdminPage() {
  const latest = DONEMLER[DONEMLER.length - 1] ?? ''
  const brands = getRawMarkaRanking('', '', 'Tümü', latest)
  const segments = new Set(brands.map(b => b.segment).filter(Boolean))

  return (
    <AdminModulePage
      title="Marka Yönetimi"
      subtitle="Marka listesi, segment bağlantısı, aktif/pasif planı ve gizlilik kuralı"
      statusLabel="Salt okunur iskelet"
      statusVariant="amber"
      metrics={[
        { label: 'Marka', value: brands.length || '—', hint: latest ? `Son dönem: ${latest}` : 'Dönem bulunamadı' },
        { label: 'Segment', value: segments.size || SEGMENTLER.length, hint: 'Marka segment dağılımı' },
        { label: 'Gizlilik', value: 'Rule of 3', hint: '1-3 marka varsa maskeleme uygulanır' },
      ]}
      sections={[
        {
          title: 'Bu ekranda yönetilecek alanlar',
          items: [
            'Marka adı, marka kodu ve segment bağlantısı.',
            'Aktif / pasif marka durumu; kalıcı silme yerine pasifleştirme.',
            'Marka gizlilik kuralı ve maskeleme durumunun görünmesi.',
            'Import edilen datadaki marka kolonlarıyla eşleşme kontrolü.',
          ],
        },
        {
          title: 'Mevcut marka görünümü',
          description: 'İlk 12 marka örnek olarak listelenir; bu ekranda veri değiştirilmez.',
          items: brands.slice(0, 12).map(b => `${b.marka} · ${b.segment || 'Segment yok'} · skor ${Math.round(b.score)}`),
        },
        {
          title: 'Korunan davranış',
          items: [
            'Marka skorları şu an hazır genel skor kaynağından okunur.',
            'Marka bazlı kategori/KPI kırılımı bu promptta üretilmez.',
            'Dashboard marka gizlilik kuralı korunur.',
          ],
        },
      ]}
      nextSteps={[
        'Marka ekleme/pasifleştirme formu eklenecek.',
        'Marka-segment eşleştirme validasyonu yapılacak.',
        'Import edilen data ile marka listesi senkronizasyonu kurulacak.',
      ]}
    />
  )
}
