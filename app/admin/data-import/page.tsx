import AdminModulePage from '@/components/admin/AdminModulePage'
import { KPI_META, BOLGELER, SEGMENTLER, DONEMLER } from '@/lib/kpi'

export default function DataImportAdminPage() {
  return (
    <AdminModulePage
      title="Data Import"
      subtitle="Excel/CSV yükleme, kolon eşleştirme, validasyon ve dashboard güncelleme akışı"
      statusLabel="Planlama iskeleti"
      statusVariant="amber"
      metrics={[
        { label: 'Desteklenecek format', value: 'CSV/XLSX', hint: 'İlk aşamada önizleme ve validation' },
        { label: 'KPI kolonu', value: KPI_META.length, hint: 'Import şablonunda beklenen KPI sayısı' },
        { label: 'Boyut', value: 4, hint: 'Segment, bölge, yaş, dönem' },
        { label: 'Mevcut dönem', value: DONEMLER.length, hint: 'Statik veri setinden okunuyor' },
      ]}
      sections={[
        {
          title: 'Import akışı',
          items: [
            'Dosya yükle: CSV veya XLSX dosyası seçilir.',
            'Kolon eşleştir: segment, bölge, yaş, dönem ve KPI kolonları doğrulanır.',
            'Önizleme: ilk satırlar ve veri kalitesi uyarıları gösterilir.',
            'Validasyon: eksik kolon, yanlış dönem, bilinmeyen marka ve sayısal olmayan KPI değerleri listelenir.',
            'Onay: sonraki promptlarda Supabase veya canonical JSON kaynağı güncellenecek.',
          ],
        },
        {
          title: 'Mevcut veri boyutları',
          items: [
            `Segmentler: ${SEGMENTLER.join(', ') || '—'}`,
            `Bölgeler: ${BOLGELER.join(', ') || '—'}`,
            `Dönem sayısı: ${DONEMLER.length}`,
            `KPI sayısı: ${KPI_META.length}`,
          ],
        },
        {
          title: 'Korunan davranış',
          items: [
            'Bu promptta gerçek dosya yükleme aktif edilmez.',
            'Dashboard hâlâ mevcut lib/kpi_data.json kaynağından çalışır.',
            'Veri importu sonrası tüm grafiklerin güncellenmesi sonraki promptta ele alınır.',
          ],
        },
      ]}
      nextSteps={[
        'Client-side dosya seçici ve önizleme tablosu eklenecek.',
        'Kolon eşleştirme sihirbazı oluşturulacak.',
        'Supabase import tabloları ve import geçmişi kurulacak.',
      ]}
    />
  )
}
