'use client'
import { useMemo } from 'react'
import { useDashboardCtx } from '@/context/DashboardContext'
import Topbar from '@/components/layout/Topbar'
import { groupByBolge, fmt, scoreColor } from '@/lib/kpi'
import { KPI_CONFIG } from '@/types'
import styles from '../page.module.css'

export default function BolgelerPage() {
  const { scores, loading } = useDashboardCtx()
  const bolgeler = useMemo(() => groupByBolge(scores), [scores])
  const maxS = Math.max(...bolgeler.map(b => b.ov), 60)

  return (
    <div className={styles.wrap}>
      <Topbar title="Bölge Analizi" subtitle={`${bolgeler.length} bölge`} />
      <div className={styles.content}>
        {loading && <div className={styles.loading}><span className="loading-spin" /> Yükleniyor...</div>}

        <div className={styles.card}>
          <div className={styles.cardHd}><h3>Bölge Genel Skorları</h3></div>
          <div className={styles.hbarChart}>
            {bolgeler.map(b => {
              const color = scoreColor(b.ov)
              const pct = (b.ov / maxS * 100).toFixed(1)
              return (
                <div key={b.name} className={styles.hbarRow}>
                  <div className={styles.hbarLabel}>{b.name}</div>
                  <div className={styles.hbarTrack}>
                    <div className={styles.hbarFill} style={{ width: `${pct}%`, background: `${color}44`, borderRight: `3px solid ${color}` }} />
                    <span className={styles.hbarVal} style={{ color }}>{fmt(b.ov)}</span>
                  </div>
                  <div className={styles.hbarScore} style={{ color }}>{fmt(b.ov)}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHd}><h3>Bölge × KPI Isı Haritası</h3></div>
          <div style={{overflowX:'auto'}}>
            <table style={{borderCollapse:'collapse',fontSize:10,minWidth:600}}>
              <thead>
                <tr>
                  <th style={{fontSize:9,color:'var(--tx3)',fontWeight:700,padding:'6px 8px',textAlign:'left',borderBottom:'1px solid var(--bd)',whiteSpace:'nowrap'}}>Bölge</th>
                  {KPI_CONFIG.map(k => (
                    <th key={k.key} style={{fontSize:8,color:'var(--tx3)',fontWeight:700,padding:'6px 7px',textAlign:'center',borderBottom:'1px solid var(--bd)',whiteSpace:'nowrap'}}>
                      {k.name.substring(0,8)}
                    </th>
                  ))}
                  <th style={{fontSize:8,color:'var(--tx3)',fontWeight:700,padding:'6px 7px',textAlign:'center',borderBottom:'1px solid var(--bd)'}}>Genel</th>
                </tr>
              </thead>
              <tbody>
                {bolgeler.map(b => (
                  <tr key={b.name}>
                    <td style={{padding:'6px 8px',fontWeight:600,color:'var(--tx)',whiteSpace:'nowrap',borderBottom:'1px solid var(--bd)'}}>{b.name}</td>
                    {b.kpis.map((v, i) => (
                      <td key={i} style={{padding:'4px 5px',textAlign:'center',fontFamily:'var(--font-dm-mono)',fontWeight:500,fontSize:10,borderRadius:3,background:v>=80?'rgba(16,185,129,.18)':v>=70?'rgba(59,130,246,.14)':v>=60?'rgba(245,158,11,.18)':'rgba(239,68,68,.14)',color:scoreColor(v),borderBottom:'1px solid var(--bd)'}}>
                        {fmt(v,0)}
                      </td>
                    ))}
                    <td style={{padding:'4px 5px',textAlign:'center',fontFamily:'var(--font-dm-mono)',fontWeight:700,fontSize:10,background:b.ov>=80?'rgba(16,185,129,.18)':b.ov>=70?'rgba(59,130,246,.14)':b.ov>=60?'rgba(245,158,11,.18)':'rgba(239,68,68,.14)',color:scoreColor(b.ov),borderBottom:'1px solid var(--bd)'}}>
                      {fmt(b.ov)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
