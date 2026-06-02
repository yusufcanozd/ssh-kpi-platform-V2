import AdminModulePage from '@/components/admin/AdminModulePage'
import { SEGMENTLER, BOLGELER } from '@/lib/kpi'

export default function UserPermissionsAdminPage() {
  return (
    <AdminModulePage
      title="Kullanıcı Marka / Segment Kısıtları"
      subtitle="Rol bazlı veri görünürlüğü, segment, marka ve bölge izinleri"
      statusLabel="Prompt 7 hazırlığı"
      statusVariant="amber"
      metrics={[
        { label: 'Segment', value: SEGMENTLER.length, hint: 'Kısıtlanabilir segment havuzu' },
        { label: 'Bölge', value: BOLGELER.length, hint: 'Kısıtlanabilir bölge havuzu' },
        { label: 'Varsayılan', value: 'Rol bazlı', hint: 'Prompt 7’de netleştirilecek' },
      ]}
      sections={[
        {
          title: 'Bu ekranda yönetilecek izinler',
          items: [
            'Kullanıcı rolü ve aktif/pasif durumu.',
            'İzin verilen segmentler.',
            'İzin verilen markalar.',
            'İzin verilen bölgeler.',
            'Rapor indirme ve data import yetkileri.',
            'Admin panel erişim durumu.',
          ],
        },
        {
          title: 'Prompt 7 güvenlik ilkesi',
          items: [
            'Superadmin tüm veriyi görür.',
            'Viewer ve analyst sadece izin verilen segment/marka/bölge verisini görür.',
            'Dashboard filtreleri merkezi permission helper’dan geçer.',
            'Supabase RLS ve app-level filter ilişkisi SUPABASE.md içinde dokümante edilir.',
          ],
        },
      ]}
      nextSteps={[
        'Permission TypeScript tiplerini oluştur.',
        'Kullanıcı izinlerini okuyan helper yaz.',
        'Dashboard filtrelerine kademeli uygulama planı çıkar.',
      ]}
    />
  )
}
