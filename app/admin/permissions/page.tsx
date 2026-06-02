import AdminModulePage from '@/components/admin/AdminModulePage'
import { BOLGELER, SEGMENTLER } from '@/lib/kpi'

export default function PermissionsAdminPage() {
  return (
    <AdminModulePage
      title="Kullanıcı Kısıtları"
      subtitle="Segment, marka, bölge ve rapor erişim yetkilerinin merkezi yönetimi"
      statusLabel="Planlama iskeleti"
      statusVariant="amber"
      metrics={[
        { label: 'Segment kısıtı', value: SEGMENTLER.length, hint: 'Seçilebilir segment sayısı' },
        { label: 'Bölge kısıtı', value: BOLGELER.length, hint: 'Seçilebilir bölge sayısı' },
        { label: 'Marka kısıtı', value: 'Planlı', hint: 'Marka yönetimi ile birlikte bağlanacak' },
      ]}
      sections={[
        {
          title: 'Kısıtlanacak alanlar',
          items: [
            'Kullanıcının görebileceği segmentler.',
            'Kullanıcının görebileceği markalar.',
            'Kullanıcının görebileceği bölgeler.',
            'Özet rapor/PDF indirme yetkisi.',
            'Data import ve admin ayar ekranlarına erişim yetkisi.',
          ],
        },
        {
          title: 'Önerilen rol davranışı',
          items: [
            'Super Admin: tüm ayarlar, tüm veri ve tüm kullanıcı yönetimi.',
            'Admin: kullanıcı operasyonu ve sınırlı rapor yönetimi.',
            'Analyst: dashboard, trend, rapor ve analiz ekranları.',
            'Viewer: sadece izin verilen segment/marka/bölge görünümü.',
          ],
        },
        {
          title: 'Korunan davranış',
          items: [
            'Bu promptta kullanıcı sorgularına kısıt filtresi uygulanmaz.',
            'Mevcut admin role kontrolü bozulmaz.',
            'Kullanıcı panelindeki mevcut rol/aktiflik işlemleri korunur.',
          ],
        },
      ]}
      nextSteps={[
        'profiles tablosuna allowed_segments / allowed_regions / allowed_brand_ids alanları planlanacak.',
        'Admin kullanıcı düzenleme formuna kısıt seçimleri eklenecek.',
        'Dashboard veri sorguları kullanıcı kısıtlarını dikkate alacak hale getirilecek.',
      ]}
    />
  )
}
