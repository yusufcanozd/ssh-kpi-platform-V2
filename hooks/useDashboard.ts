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
    Promise.all([
      supabase.from('regions').select('*').order('name'),
      supabase.from('periods').select('*').order('year', { ascending: false }),
    ]).then(([{ data: reg }, { data: per }]) => {
      setRegions(reg || [])
      setPeriods(per || [])
    })
  }, [])

  const loadScores = useCallback(async () => {
    setLoading(true)

    // Önce period ID'lerini bul
    let periodIds: string[] = []
    if (filters.year || filters.quarter) {
      let pq = supabase.from('periods').select('id')
      if (filters.year)    pq = pq.eq('year', parseInt(filters.year))
      if (filters.quarter) pq = pq.eq('quarter', filters.quarter)
      const { data: pdata } = await pq
      periodIds = (pdata || []).map(p => p.id)
      if (periodIds.length === 0) {
        setScores([])
        setLoading(false)
        return
      }
    }

    // Skorları çek
    let q = supabase
      .from('kpi_scores')
      .select(`
        id, brand_id, period_id, region_id, vehicle_age_group, segment, is_masked,
        score_operational, score_customer, score_service_capacity, score_coverage, score_overall,
        idx_work_order_duration, idx_work_order_volume, idx_active_customer_base,
        idx_labor_hours_per_wo, idx_customer_retention, idx_service_usage,
        idx_periodic_maintenance, idx_wo_per_service, idx_customer_per_service,
        idx_parts_revenue_per_cust, idx_warranty_coverage,
        brands!inner(id, code, name, segment),
        regions(id, name),
        periods!inner(id, year, quarter)
      `)
      .eq('is_masked', false)
      .limit(5000)

    if (periodIds.length > 0) q = q.in('period_id', periodIds)
    if (filters.regionId)    q = q.eq('region_id', filters.regionId)

    const { data, error } = await q

    if (error) {
      console.error('Hata:', error.message)
      setLoading(false)
      return
    }

    // Segment filtresi JS tarafında
    const filtered = (data || []).filter(s => {
      if (filters.segment && (s as any).brands?.segment !== filters.segment) return false
      return true
    })

    setScores(filtered as any)
    setLoading(false)
  }, [filters])

  useEffect(() => { loadScores() }, [loadScores])

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return { scores, regions, periods, loading, filters, updateFilter }
}
