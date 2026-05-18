'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KpiScore, Region, Period } from '@/types'

export interface Filters {
  regionId: string
  segment: string
  year: string
  quarter: string
}

export function useDashboard() {
  const [scores, setScores]   = useState<KpiScore[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({
    regionId: '', segment: '', year: '', quarter: ''
  })

  const supabase = createClient()

  useEffect(() => {
    supabase.from('regions').select('*').order('name')
      .then(({ data }) => setRegions(data || []))
    supabase.from('periods').select('*').order('year', { ascending: false })
      .then(({ data }) => setPeriods(data || []))
  }, [])

  const loadScores = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
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
      .limit(5000)

    if (error) {
      console.error('Supabase hatası:', error.message)
      setLoading(false)
      return
    }

    console.log('Gelen veri sayısı:', data?.length)

    // Tüm filtreleri JS tarafında uygula
    const filtered = (data || []).filter((s: any) => {
      if (filters.regionId && s.regions?.id !== filters.regionId) return false
      if (filters.segment  && s.brands?.segment !== filters.segment) return false
      if (filters.year     && s.periods?.year !== parseInt(filters.year)) return false
      if (filters.quarter  && s.periods?.quarter !== filters.quarter) return false
      return true
    })

    console.log('Filtrelenmiş veri:', filtered.length)
    setScores(filtered as any)
    setLoading(false)
  }, [filters])

  useEffect(() => { loadScores() }, [loadScores])

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return { scores, regions, periods, loading, filters, updateFilter }
}
