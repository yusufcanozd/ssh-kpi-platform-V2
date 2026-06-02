import AdminModulePage from '@/components/admin/AdminModulePage'
import { KAT_YAPILAR, KPI_META } from '@/lib/kpi'

export default function CategoriesAdminPage() {
  const totalWeight = KAT_YAPILAR.reduce((sum, cat) => sum + cat.agirlik, 0)

  return (
    <AdminModulePage
      title="Kategori Yönetimi"
      subtitle="Kategori ağırlıkları, KPI bağlantıları ve yönetici seviyesinde skor metodolojisi"
      statusLabel="Salt okunur iskelet"
      statusVariant="amber"
      metrics={[
        { label: 'Kategori', value: KAT_YAPILAR.length, hint: 'Aktif kategori sayısı' },
        { label: 'Toplam ağırlık', value: `%${Math.round(totalWeight * 100)}`, hint: 'Kaydetme öncesi 100 kontrolü şart olacak' },
        { label: 'Bağlı KPI', value: KAT_YAPILAR.reduce((sum, cat) => sum + cat.kpis.length, 0), hint: 'Kategori matrisindeki KPI bağlantıları' },
      ]}
      sections={[
        {
          title: 'Mevcut kategori matrisi',
          items: KAT_YAPILAR.map(cat => {
            const kpiNames = cat.kpis.map(idx => KPI_META[idx]?.ad ?? `KPI ${idx + 1}`).join(', ')
            return `${cat.ad} · %${Math.round(cat.agirlik * 100)} · ${kpiNames}`
          }),
        },
        {
          title: 'Bu ekranda yapılacaklar',
          items: [
            'Kategori adı, açıklaması, rengi ve sırası yönetilecek.',
            'Kategori ağırlıkları toplamı her zaman %100 olmak zorunda olacak.',
            'Kategoriye bağlı KPI listesi açıkça görülecek.',
            'Silme yerine pasifleştirme yaklaşımı kullanılacak.',
          ],
        },
        {
          title: 'Korunan davranış',
          items: [
            'Bu promptta ağırlıklar kaydedilmez ve skorlar değişmez.',
            'Mevcut kategori hesaplama motoru aynen korunur.',
            'Executive kategori adları tek merkezden kullanılmaya devam eder.',
          ],
        },
      ]}
      nextSteps={[
        'Ağırlık editörü eklenecek.',
        'Toplam %100 validation ve simülasyon kartı eklenecek.',
        'Kategori metodoloji versiyonlama ile kaydedilecek.',
      ]}
    />
  )
}
