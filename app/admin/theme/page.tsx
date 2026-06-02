import AdminModulePage from '@/components/admin/AdminModulePage'

export default function ThemeAdminPage() {
  return (
    <AdminModulePage
      title="Tema ve Görsel Ayarlar"
      subtitle="C-level executive dashboard görsel dili, grafik standardı ve rapor tasarım prensipleri"
      statusLabel="Tasarım iskeleti"
      statusVariant="blue"
      metrics={[
        { label: 'Renk sistemi', value: '5 ton', hint: 'Nötr, vurgu, başarılı, uyarı, kritik' },
        { label: 'Skor bandı', value: '0-200', hint: '100 referans seviyesi' },
        { label: 'Rapor dili', value: 'Executive', hint: 'Az renk, net hiyerarşi' },
      ]}
      sections={[
        {
          title: 'Executive görsel prensipler',
          items: [
            'Az renk, yüksek okunabilirlik ve net karar hiyerarşisi.',
            'Her grafik ilk bakışta neyin iyi/kötü olduğunu anlatmalı.',
            'Bar üstü değerler profesyonel ve çakışmayacak şekilde gösterilmeli.',
            'Kritik renkler sadece karar gerektiren alanlarda kullanılmalı.',
          ],
        },
        {
          title: 'Önerilen renk mantığı',
          items: [
            '110+ güçlü performans: sade yeşil vurgu.',
            '95-110 referans seviyesi: mavi/gri nötr bant.',
            '85-95 izlenmeli: amber uyarı.',
            '85 altı kritik: kontrollü kırmızı vurgu.',
          ],
        },
        {
          title: 'Korunan davranış',
          items: [
            'Bu promptta dashboard grafikleri yeniden tasarlanmaz.',
            'Tema seçimi mevcut ThemeContext üzerinden çalışmaya devam eder.',
            'Executive grafik standardı sonraki promptta Chart.js pluginleriyle uygulanır.',
          ],
        },
      ]}
      nextSteps={[
        'Smart bar value label plugin eklenecek.',
        'Tüm bar grafiklerinde renk ve label standardı uygulanacak.',
        'Özet rapor executive tasarım sistemine ayrılacak.',
      ]}
    />
  )
}
