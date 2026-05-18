import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const [{ data: scores }, { data: regions }, { data: periods }] = await Promise.all([
    supabase
      .from('kpi_scores')
      .select(`
        id, brand_id, period_id, region_id, is_masked,
        score_operational, score_customer, score_service_capacity, score_coverage, score_overall,
        idx_work_order_duration, idx_work_order_volume, idx_active_customer_base,
        idx_labor_hours_per_wo, idx_customer_retention, idx_service_usage,
        idx_periodic_maintenance, idx_wo_per_service, idx_customer_per_service,
        idx_parts_revenue_per_cust, idx_warranty_coverage,
        brands(id, code, name, segment),
        regions(id, name),
        periods(id, year, quarter)
      `)
      .eq('is_masked', false)
      .limit(5000),
    supabase.from('regions').select('*').order('name'),
    supabase.from('periods').select('*').order('year', { ascending: false }),
  ])

  return (
    <DashboardClient
      initialScores={scores || []}
      initialRegions={regions || []}
      initialPeriods={periods || []}
    >
      {children}
    </DashboardClient>
  )
}
