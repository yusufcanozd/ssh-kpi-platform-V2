import AdminModulePage from '@/components/admin/AdminModulePage'
import { KAT_YAPILAR } from '@/lib/kpi'

export default function WeightsAdminPage() {
  const totalWeight = KAT_YAPILAR.reduce((sum, category) => sum + category.agirlik, 0)

  return (
    <AdminModulePage
      title="Kategori Ağırlıkları"
      subtitle="Kategori ağırlıkları ve metodoloji versiyonlama hazırlık alanı"
      statusLabel="Prompt 5 hazırlığı"
      statusVariant="amber"
      metrics={[
        { label: 'Kategori', value: KAT_YAPILAR.length, hint: 'Aktif fallback kategori sayısı' },
        { label: 'Toplam ağırlık', value: `%${Math.round(totalWeight * 100)}`, hint: 'Prompt 5’te 100 kontrolü zorunlu olacak' },
        { label: 'Versiyonlama', value: 'Planlandı', hint: 'Metodoloji değişiklik geçmişi' },
      ]}
      sections={[
        {
          title: 'Mevcut fallback ağırlıkları',
          items: KAT_YAPILAR.map(category => `${category.ad} · %${Math.round(category.agirlik * 100)}`),
        },
        {
          title: 'Prompt 5 kapsamı',
          items: [
            'Her aktif kategori için yüzde inputu eklenecek.',
            'Toplam ağırlık canlı hesaplanacak ve 100 değilse kaydetme engellenecek.',
            'Yeni metodoloji versiyonu adı, açıklaması, geçerlilik tarihi ve aktif/pasif durumu yönetilecek.',
            'Mevcut dashboard fallback ağırlıkları korunacak.',
          ],
        },
      ]}
      nextSteps={[
        'Ağırlık editörü oluştur.',
        'Metodoloji versiyonu formu ekle.',
        'METHODOLOGY.md dosyasına versiyonlama notu ekle.',
      ]}
    />
  )
}
