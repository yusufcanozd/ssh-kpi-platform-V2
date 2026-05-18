'use client'

import { useState, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { DashboardContext } from '@/context/DashboardContext'
import { KpiScore, Region, Period } from '@/types'
import styles from './layout.module.css'

export interface Filters {
  regionId: string
  segment: string
  year: string
  quarter: string
}

interface Props {
  initialScores: any[]
  initialRegions: Region[]
  initialPeriods: Period[]
  children: React.ReactNode
}

export default function DashboardClient({ initialScores, initialRegions, initialPeriods, children }: Props) {
  const [filters, setFilters] = useState<Filters>({
    regionId: '', segment: '', year: '', quarter: ''
  })

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const filteredScores = useCallback(() => {
    return initialScores.filter((s: any) => {
      if (filters.regionId && s.regions?.id !== filters.regionId) return false
      if (filters.segment  && s.brands?.segment !== filters.segment) return false
      if (filters.year     && s.periods?.year !== parseInt(filters.year)) return false
      if (filters.quarter  && s.periods?.quarter !== filters.quarter) return false
      return true
    })
  }, [initialScores, filters])

  const filterUI = (
    <div className={styles.filters}>
      <div className={styles.filterTitle}>Filtreler</div>
      <div className={styles.filterRow}>
        <label>Bölge</label>
        <select value={filters.regionId} onChange={e => updateFilter('regionId', e.target.value)}>
          <option value="">Tüm Türkiye</option>
          {initialRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div className={styles.filterRow}>
        <label>Segment</label>
        <select value={filters.segment} onChange={e => updateFilter('segment', e.target.value)}>
          <option value="">Tüm Segmentler</option>
          <option value="Premium">Premium</option>
          <option value="Mass">Mass</option>
          <option value="EV">EV</option>
        </select>
      </div>
      <div className={styles.filterSep}>📅 Dönem</div>
      <div className={styles.filterTwoCol}>
        <div className={styles.filterRow}>
          <label>Yıl</label>
          <select value={filters.year} onChange={e => updateFilter('year', e.target.value)}>
            <option value="">Tümü</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
          </select>
        </div>
        <div className={styles.filterRow}>
          <label>Çeyrek</label>
          <select value={filters.quarter} onChange={e => updateFilter('quarter', e.target.value)}>
            <option value="">Tümü</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
          </select>
        </div>
      </div>
      {(filters.year || filters.quarter) && (
        <div className={styles.periodBadge}>
          {filters.year || 'Tüm Yıllar'}{filters.quarter ? ` / ${filters.quarter}` : ''}
        </div>
      )}
    </div>
  )

  return (
    <DashboardContext.Provider value={{
      scores: filteredScores() as KpiScore[],
      regions: initialRegions,
      periods: initialPeriods,
      loading: false,
      filters,
      updateFilter,
    }}>
      <div className={styles.shell}>
        <Sidebar variant="dashboard" filters={filterUI} />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </DashboardContext.Provider>
  )
}
