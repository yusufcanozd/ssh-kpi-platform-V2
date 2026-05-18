import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Sadece agregat sonuçları çek — ham veri yok
  const [
    { data: brandScores },
    { data: regionScores },
    { data: trendScores },
    { data: regions },
    { data: periods },
  ] = await Promise.all([
    supabase.rpc('get_dashboard_scores'),
    supabase.rpc('get_region_scores'),
    supabase.rpc('get_trend_scores'),
    supabase.from('regions').select('*').order('name'),
    supabase.from('periods').select('*').order('year', { ascending: false }),
  ])

  return (
    <DashboardClient
      initialBrandScores={brandScores || []}
      initialRegionScores={regionScores || []}
      initialTrendScores={trendScores || []}
      initialRegions={regions || []}
      initialPeriods={periods || []}
    >
      {children}
    </DashboardClient>
  )
}
