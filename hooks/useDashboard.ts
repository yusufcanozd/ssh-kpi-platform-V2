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

// Modül seviyesi cache
let allScoresCache: any[] | null = null
let regionsCache: Region[] | null = null
let periodsCache: Period[] | null = null

export function useDashboard() {
  const [scores, setScores]   = useState<KpiScore[]>([])
  const [regions, setRegions] = useState<Region[]>(regionsCache || [])
  const [periods, setPeriods] = useState<Period[]>(periodsCache || [])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({
    regionId: '', segment: '', year: '', quarter: ''
  })

  const supabase = createClient()

  const applyFilters = useCallback((data: any[]) => {
    const filtered = data.filter((s: any) => {
      if (filters.regionId && s.regions?.id !== filters.regionId) return false
      if (filters.segment  && s.brands?.segment !== filters.segment) return false
      if (filters.year     && s.periods?.year !== parseInt(filters.year)) return false
      if (filters.quarter  && s.periods?.quarter !== filters.quarter) return false
      return true
    })
    setScores(filtered)
  }, [filters])

  const fetchAll = useCallback(async (retryCount = 0) => {
    setLoading(true)

    try {
      // Referans verileri
      if (!regionsCache) {
        const { data } = await supabase.from('regions').select('*').order('name')
        regionsCache = data || []
        setRegions(regionsCache)
      }
      if (!periodsCache) {
        const { data } = await supabase.from('periods').select('*').order('year', { ascending: false })
        periodsCache = data || []
        setPeriods(periodsCache)
      }

      // Cache varsa kullan
      if (allScoresCache) {
        applyFilters(allScoresCache)
        setLoading(false)
        return
      }

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

      if (error) throw error

      if (!data || data.length === 0) {
        // Veri gelmediyse 1 saniye bekle ve tekrar dene (max 3 kez)
        if (retryCount < 3) {
          setTimeout(() => fetchAll(retryCount + 1), 1000)
          return
        }
      }

      allScoresCache = data || []
      applyFilters(allScoresCache)
    } catch (err: any) {
      console.error('Veri yükleme hatası:', err?.message)
      // Hata durumunda tekrar dene
      if (retryCount < 3) {
        setTimeout(() => fetchAll(retryCount + 1), 1500)
        return
      }
    }

    setLoading(false)
  }, [applyFilters])

  useEffect(() => {
    fetchAll()
  }, [])

  // Filtre değişince cache'den filtrele
  useEffect(() => {
    if (allScoresCache) {
      applyFilters(allScoresCache)
    }
  }, [filters, applyFilters])

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return { scores, regions, periods, loading, filters, updateFilter }
}
