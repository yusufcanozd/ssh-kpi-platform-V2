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

  // Referans verileri (bir kez yükle)
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

    let q = supabase
      .from('kpi_scores')
      .select(`
        *,
        brands(id, code, name, segment),
        regions(id, name),
        periods(id, year, quarter)
      `)
      .eq('is_masked', false)
      .limit(5000)

    if (filters.year)    q = q.eq('periods.year',    parseInt(filters.year))
    if (filters.quarter) q = q.eq('periods.quarter', filters.quarter)

    const { data, error } = await q

    if (error) {
      console.error('Skorlar yüklenemedi:', error)
      setLoading(false)
      return
    }

    // JS tarafında filtrele
    const filtered = (data || []).filter(s => {
      if (!s.brands || !s.periods) return false
      if (filters.regionId && s.regions?.id !== filters.regionId) return false
      if (filters.segment  && s.brands?.segment !== filters.segment) return false
      return true
    })

    setScores(filtered)
    setLoading(false)
  }, [filters, supabase])

  useEffect(() => { loadScores() }, [loadScores])

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  return { scores, regions, periods, loading, filters, updateFilter }
}
