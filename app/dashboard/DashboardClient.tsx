'use client'

import { useState, useMemo, createContext, useContext } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { Region, Period } from '@/types'
import { BrandScore, RegionScore, TrendScore, Filters } from '@/hooks/useDashboard'
import styles from './layout.module.css'

// Context
interface DashboardCtx {
  brandScores: BrandScore[]
  regionScores: RegionScore[]
  trendScores: TrendScore[]
  regions: Region[]
  periods: Period[]
  filters: Filters
  updateFilter: (key: keyof Filters, value: string) => void
}

export const DashboardContext = createContext<DashboardCtx>({} as DashboardCtx)
export const useDashboardCtx = () => useContext(DashboardContext)

interface Props {
  initialBrandScores: BrandScore[]
  initialRegionScores: RegionScore[]
  initialTrendScores: TrendScore[]
  initialRegions: Region[]
  initialPeriods: Period[]
  children: React.ReactNode
}

export default function DashboardClient({
  initialBrandScores,
  initialRegionScores,
  initialTrendScores,
  initialRegions,
  initialPeriods,
  children,
}: Props) {
  const [filters, setFilters] = useState<Filters>({
    regionId: '', segment: '', year: '', quarter: ''
  })

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Filtreleme — tümü JS'de, veri zaten agregat
  const brandScores = useMemo(() => {
    return initialBrandScores.filter(s => {
      if (filters.segment && s.brand_segment !== filters.segment) return false
      if (filters.year    && s.year !== parseInt(filters.year))   return false
      if (filters.quarter && s.quarter !== filters.quarter)        return false
      if (filters.regionId) {
        const region = initialRegions.find(r => r.id === filters.regionId)
        if (region && s.region_name !== region.name) return false
      }
      return true
    })
  }, [initialBrandScores, filters, initialRegions])

  const regionScores = useMemo(() => {
    return initialRegionScores.filter(s => {
      if (filters.segment && !initialBrandScores.some(b => b.brand_segment === filters.segment)) return true
      return true
    })
  }, [initialRegionScores, filters])

  const trendScores = useMemo(() => {
    return initialTrendScores.filter(s => {
      if (filters.year    && s.year !== parseInt(filters.year))   return false
      if (filters.quarter && s.quarter !== filters.quarter)        return false
      return true
    })
  }, [initialTrendScores, filters])

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
      brandScores,
      regionScores,
      trendScores,
      regions: initialRegions,
      periods: initialPeriods,
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
