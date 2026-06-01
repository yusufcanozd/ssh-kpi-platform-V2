import DashboardClient from './DashboardClient'

// Dashboard artık statik KPI datası kullanıyor (lib/kpi_data.json)
// Supabase RPC bağımlılığı kaldırıldı
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardClient>
      {children}
    </DashboardClient>
  )
}
