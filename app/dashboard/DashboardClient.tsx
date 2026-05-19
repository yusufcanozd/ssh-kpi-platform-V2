'use client'

import { useState, createContext, useContext } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { BOLGE_KPIS, SEGMENT_KPIS } from '@/lib/kpi'
import styles from './layout.module.css'

interface DashboardCtx {
  selSeg: string
  selBolge: string
  setSeg: (s: string) => void
  setBolge: (b: string) => void
}

export const DashboardContext = createContext<DashboardCtx>({
  selSeg: '', selBolge: '', setSeg: ()=>{}, setBolge: ()=>{}
})
export const useDashboardCtx = () => useContext(DashboardContext)

export default function DashboardClient({ children }: { children: React.ReactNode }) {
  const [selSeg,   setSeg]   = useState('')
  const [selBolge, setBolge] = useState('')

  const bolgeler = BOLGE_KPIS.map(b => b.bolge)

  const filterUI = (
    <div className={styles.filters}>
      <div className={styles.filterTitle}>Filtreler</div>

      <div className={styles.filterRow}>
        <label>Bölge</label>
        <select value={selBolge} onChange={e => setBolge(e.target.value)}>
          <option value="">Tüm Türkiye</option>
          {bolgeler.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className={styles.filterRow}>
        <label>Segment</label>
        <select value={selSeg} onChange={e => setSeg(e.target.value)}>
          <option value="">Tüm Segmentler</option>
          <option value="Premium">Premium</option>
          <option value="Mass">Mass</option>
          <option value="EV">EV</option>
        </select>
      </div>

      <div className={styles.filterSep}>📊 Segment Ortalamaları</div>
      {SEGMENT_KPIS.filter(s => !selSeg || s.segment===selSeg).map(s => (
        <div key={s.segment} style={{ fontSize:10, color:'var(--tx2)', marginBottom:4, padding:'4px 0', borderBottom:'1px solid var(--bd)' }}>
          <span style={{ fontWeight:700, color: s.segment==='Premium'?'#8b5cf6':s.segment==='Mass'?'#3b82f6':'#10b981' }}>
            {s.segment}
          </span>
          <span style={{ float:'right', color:'var(--tx3)', fontSize:9 }}>
            {s.marka_count} marka
          </span>
        </div>
      ))}
    </div>
  )

  return (
    <DashboardContext.Provider value={{ selSeg, selBolge, setSeg, setBolge }}>
      <div className={styles.shell}>
        <Sidebar variant="dashboard" filters={filterUI} />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </DashboardContext.Provider>
  )
}
