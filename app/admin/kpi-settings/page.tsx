import AdminModulePage from '@/components/admin/AdminModulePage'
import { KPI_META, KAT_YAPILAR } from '@/lib/kpi'
import { getExcludedKpiIdxs } from '@/lib/kpi'

export default function KpiSettingsAdminPage() {
  const lowerBetterCount = KPI_META.filter(kpi => kpi.is_lower_better).length
  const excluded = getExcludedKpiIdxs()

  return (
    <AdminModulePage
      title="KPI Ayarları"
      subtitle="KPI tanımları, hesap yönü, kategori bağlantısı ve coverage görünümü"
      statusLabel="Salt okunur iskelet"
      statusVariant="amber"
      metrics={[
        { label: 'Toplam KPI', value: KPI_META.length, hint: 'Mevcut lib/kpi_data.json metadata' },
        { label: 'Düşük daha iyi', value: lowerBetterCount, hint: 'KPI 4 ve KPI 7 gibi ters yönde normalize edilir' },
        { label: 'Coverage dışı', value: excluded.length, hint: excluded.length ? excluded.map(i => `KPI ${i + 1}`).join(', ') : 'Şu an yok' },
        { label: 'Kategori', value: KAT_YAPILAR.length, hint: 'Aktif kategori matrisi' },
      ]}
      sections={[
        {
          title: 'Bu ekranda gösterilecek alanlar',
          description: 'Prompt 2 aşamasında veri kaydetme yoktur; yapı sonraki promptlara hazırlanır.',
          items: [
            'KPI adı, kısa açıklaması, sıra numarası ve format bilgisi.',
            'Yüksek daha iyi / düşük daha iyi hesap yönü.',
            'Bağlı olduğu kategori ve kategori içindeki sırası.',
            'Coverage dışı kalma nedeni ve veri kalitesi notu.',
            'Aktif / pasif KPI durumu ve metodoloji versiyonu bağlantısı.',
          ],
        },
        {
          title: 'Mevcut KPI listesi',
          items: KPI_META.map(kpi => `KPI ${kpi.no}: ${kpi.ad}${kpi.is_lower_better ? ' · düşük daha iyi' : ''}`),
        },
        {
          title: 'Korunan davranış',
          items: [
            'KPI hesaplama motoru bu promptta değiştirilmedi.',
            'Dashboard ve rapor ekranları mevcut fonksiyonları kullanmaya devam eder.',
            'KPI ekleme/çıkarma sonraki dinamik motor promptuna bırakıldı.',
          ],
        },
      ]}
      nextSteps={[
        'KPI düzenleme formu ve validation kuralları eklenecek.',
        'Metodoloji versiyonu ile KPI değişiklik geçmişi tutulacak.',
        'Supabase tabanlı dinamik KPI konfigürasyonuna geçilecek.',
      ]}
    />
  )
}
