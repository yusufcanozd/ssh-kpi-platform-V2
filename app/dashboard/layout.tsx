'use client'

import Sidebar from '@/components/layout/Sidebar'
import { useDashboard } from '@/hooks/useDashboard'
import { DashboardContext } from '@/context/DashboardContext'
import styles from './layout.module.css'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const dashData = useDashboard()

  const filters = (
    <div className={styles.filters}>
      <div className={styles.filterTitle}>Filtreler</div>
      <div className={styles.filterRow}>
        <label>Bölge</label>
        <select value={dashData.filters.regionId} onChange={e => dashData.updateFilter('regionId', e.target.value)}>
          <option value="">Tüm Türkiye</option>
          {dashData.regions.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>
      <div className={styles.filterRow}>
        <label>Segment</label>
        <select value={dashData.filters.segment} onChange={e => dashData.updateFilter('segment', e.target.value)}>
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
          <select value={dashData.filters.year} onChange={e => dashData.updateFilter('year', e.target.value)}>
            <option value="">Tümü</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
          </select>
        </div>
        <div className={styles.filterRow}>
          <label>Çeyrek</label>
          <select value={dashData.filters.quarter} onChange={e => dashData.updateFilter('quarter', e.target.value)}>
            <option value="">Tümü</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
          </select>
        </div>
      </div>
      {(dashData.filters.year || dashData.filters.quarter) && (
        <div className={styles.periodBadge}>
          {dashData.filters.year || 'Tüm Yıllar'}
          {dashData.filters.quarter ? ` / ${dashData.filters.quarter}` : ''}
        </div>
      )}
    </div>
  )

  return (
    <DashboardContext.Provider value={dashData}>
      <div className={styles.shell}>
        <Sidebar variant="dashboard" filters={filters} />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </DashboardContext.Provider>
  )
}
