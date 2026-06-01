'use client'

import { useState, createContext, useContext, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { BOLGELER, SEGMENTLER, YAS_GRUPLARI, DONEMLER, YAS_COLORS, YAS_STATS } from '@/lib/kpi'
import styles from './layout.module.css'

export interface DashboardCtx {
  selSeg: string; selBolge: string; selYas: string
  selDonem: string; selCmpDonem: string
  setSeg:(s:string)=>void; setBolge:(b:string)=>void
  setYas:(y:string)=>void; setDonem:(d:string)=>void; setCmpDonem:(d:string)=>void
  collapsed: boolean
}

export const DashboardContext = createContext<DashboardCtx>({
  selSeg:'',selBolge:'',selYas:'Tümü',selDonem:'',selCmpDonem:'',
  setSeg:()=>{},setBolge:()=>{},setYas:()=>{},setDonem:()=>{},setCmpDonem:()=>{},
  collapsed: false
})
export const useDashboardCtx = () => useContext(DashboardContext)

export default function DashboardClient({ children }: { children: React.ReactNode }) {
  const [selSeg,      setSeg]      = useState('')
  const [selBolge,    setBolge]    = useState('')
  const [selYas,      setYas]      = useState('Tümü')
  const [selDonem,    setDonem]    = useState('')
  const [selCmpDonem, setCmpDonem] = useState('')
  const [collapsed,   setCollapsed] = useState(false)

  // Topbar'da gösterilecek kompakt filtreler (collapsed modda)
  const topbarFilters = collapsed ? (
    <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'nowrap',overflow:'hidden'}}>
      <select value={selBolge} onChange={e=>setBolge(e.target.value)} style={compactSelect}>
        <option value="">Tüm TR</option>
        {BOLGELER.map(b=><option key={b} value={b}>{b}</option>)}
      </select>
      <select value={selSeg} onChange={e=>setSeg(e.target.value)} style={compactSelect}>
        <option value="">Tüm Seg.</option>
        {SEGMENTLER.map(s=><option key={s} value={s}>{s}</option>)}
      </select>
      <select value={selYas} onChange={e=>setYas(e.target.value)} style={compactSelect}>
        {YAS_GRUPLARI.map(y=><option key={y} value={y}>{y==='Tümü'?'Tüm Yaş':y+'y'}</option>)}
      </select>
      <select value={selDonem} onChange={e=>setDonem(e.target.value)} style={compactSelect}>
        <option value="">Tüm Dönem</option>
        {DONEMLER.map(d=><option key={d} value={d}>{d}</option>)}
      </select>
      <select value={selCmpDonem} onChange={e=>setCmpDonem(e.target.value)} style={compactSelect}>
        <option value="">Karş. Dönem</option>
        {DONEMLER.map(d=><option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  ) : null

  const sidebarFilters = !collapsed ? (
    <div className={styles.filters}>
      <div className={styles.filterTitle}>Filtreler</div>
      <div className={styles.filterRow}>
        <label>Bölge</label>
        <select value={selBolge} onChange={e=>setBolge(e.target.value)}>
          <option value="">Tüm Türkiye</option>
          {BOLGELER.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div className={styles.filterRow}>
        <label>Segment</label>
        <select value={selSeg} onChange={e=>setSeg(e.target.value)}>
          <option value="">Tüm Segmentler</option>
          {SEGMENTLER.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className={styles.filterRow}>
        <label>Araç Yaşı</label>
        <select value={selYas} onChange={e=>setYas(e.target.value)}>
          {YAS_GRUPLARI.map(y=><option key={y} value={y}>{y==='Tümü'?'Tüm Yaşlar':y+' Yıl'}</option>)}
        </select>
      </div>
      <div className={styles.filterRow}>
        <label>Baz Dönem</label>
        <select value={selDonem} onChange={e=>setDonem(e.target.value)}>
          <option value="">Tüm Dönem</option>
          {DONEMLER.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className={styles.filterRow}>
        <label>Karşılaştırma Dönemi</label>
        <select value={selCmpDonem} onChange={e=>setCmpDonem(e.target.value)}>
          <option value="">Seçiniz</option>
          {DONEMLER.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className={styles.filterSep}>📊 Yaş Dağılımı</div>
      {(['0-3','3-7','7+'] as const).map(yg=>(
        <div key={yg} onClick={()=>setYas(yg===selYas?'Tümü':yg)}
          style={{display:'flex',justifyContent:'space-between',alignItems:'center',
            fontSize:10,padding:'5px 8px',borderRadius:6,marginBottom:3,cursor:'pointer',
            background:selYas===yg?`${YAS_COLORS[yg]}22`:'transparent',
            border:`1px solid ${selYas===yg?YAS_COLORS[yg]:'transparent'}`}}>
          <span style={{color:YAS_COLORS[yg],fontWeight:600}}>{yg} Yıl</span>
          <span style={{color:'var(--tx3)',fontSize:9}}>
            {YAS_STATS[yg as keyof typeof YAS_STATS]?.toLocaleString('tr-TR')} İE
          </span>
        </div>
      ))}
    </div>
  ) : null

  return (
    <DashboardContext.Provider value={{selSeg,selBolge,selYas,selDonem,selCmpDonem,setSeg,setBolge,setYas,setDonem,setCmpDonem,collapsed}}>
      <div className={styles.shell}>
        <Sidebar variant="dashboard" filters={sidebarFilters} collapsed={collapsed} onToggle={()=>setCollapsed(v=>!v)}/>
        <main className={styles.main}>
          {/* Collapsed modda filtreler topbar'a taşınır — children içindeki Topbar'a prop geçilemez,
              bu yüzden topbar üstüne ince bir filtre bandı koyuyoruz */}
          {collapsed && (
            <div style={{
              display:'flex',alignItems:'center',gap:8,
              padding:'6px 16px',
              background:'var(--surf)',
              borderBottom:'1px solid var(--bd2)',
              flexShrink:0
            }}>
              <span style={{fontSize:9,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.08em',whiteSpace:'nowrap'}}>
                Filtreler
              </span>
              {topbarFilters}
            </div>
          )}
          {children}
        </main>
      </div>
    </DashboardContext.Provider>
  )
}

const compactSelect: React.CSSProperties = {
  background:'var(--surf2)',
  border:'1px solid var(--bd2)',
  color:'var(--tx)',
  borderRadius:6,
  padding:'3px 6px',
  fontSize:10,
  fontFamily:'var(--font-dm-sans),sans-serif',
  cursor:'pointer',
  outline:'none',
  height:26,
}
