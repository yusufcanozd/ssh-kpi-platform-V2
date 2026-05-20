'use client'

import { useState, createContext, useContext } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { BOLGE_KPIS, SEGMENT_KPIS, YAS_GRUPLARI, YAS_COLORS } from '@/lib/kpi'
import styles from './layout.module.css'

interface DashboardCtx {
  selSeg:   string
  selBolge: string
  selYas:   string
  setSeg:   (s: string) => void
  setBolge: (b: string) => void
  setYas:   (y: string) => void
}

export const DashboardContext = createContext<DashboardCtx>({
  selSeg: '', selBolge: '', selYas: 'Tümü',
  setSeg: ()=>{}, setBolge: ()=>{}, setYas: ()=>{},
})
export const useDashboardCtx = () => useContext(DashboardContext)

export default function DashboardClient({ children }: { children: React.ReactNode }) {
  const [selSeg,   setSeg]   = useState('')
  const [selBolge, setBolge] = useState('')
  const [selYas,   setYas]   = useState('Tümü')

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

      <div className={styles.filterRow}>
        <label>Araç Yaşı</label>
        <select value={selYas} onChange={e => setYas(e.target.value)}>
          {YAS_GRUPLARI.map(y => <option key={y} value={y}>{y === 'Tümü' ? 'Tüm Yaşlar' : `${y} Yıl`}</option>)}
        </select>
      </div>

      <div className={styles.filterSep}>📊 Yaş Kırılımı</div>
      {['0-3','3-7','7+'].map(yg => (
        <div key={yg}
          onClick={() => setYas(yg)}
          style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            fontSize:10, padding:'5px 8px', borderRadius:6, marginBottom:3, cursor:'pointer',
            background: selYas===yg ? `${YAS_COLORS[yg]}22` : 'transparent',
            border: `1px solid ${selYas===yg ? YAS_COLORS[yg] : 'transparent'}`,
          }}>
          <span style={{ color: YAS_COLORS[yg], fontWeight:600 }}>{yg} Yıl</span>
          <span style={{ color:'var(--tx3)', fontSize:9 }}>
            {yg==='0-3'?'16.692':yg==='3-7'?'22.030':'16.459'} İE
          </span>
        </div>
      ))}
    </div>
  )

  return (
    <DashboardContext.Provider value={{ selSeg, selBolge, selYas, setSeg, setBolge, setYas }}>
      <div className={styles.shell}>
        <Sidebar variant="dashboard" filters={filterUI} />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </DashboardContext.Provider>
  )
}
