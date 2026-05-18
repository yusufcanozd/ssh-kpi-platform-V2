'use client'
import { useDashboardCtx } from '../DashboardClient'
import Topbar from '@/components/layout/Topbar'
import { fmt, scoreColor } from '@/lib/kpi'
import { KPI_CONFIG } from '@/types'
import styles from '../page.module.css'

export default function BolgelerPage() {
  const { regionScores } = useDashboardCtx()
  const maxS = Math.max(...regionScores.map(b => b.score_overall), 60)

  return (
    <div className={styles.wrap}>
      <Topbar title="Bölge Analizi" subtitle={`${regionScores.length} bölge`} />
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHd}><h3>Bölge Genel Skorları</h3></div>
          <div className={styles.hbarChart}>
            {regionScores.map(b => {
              const color = scoreColor(b.score_overall)
              const pct = (b.score_overall / maxS * 100).toFixed(1)
              return (
                <div key={b.region_id} className={styles.hbarRow}>
                  <div className={styles.hbarLabel}>{b.region_name}</div>
                  <div className={styles.hbarTrack}>
                    <div className={styles.hbarFill} style={{width:`${pct}%`,background:`${color}44`,borderRight:`3px solid ${color}`}}/>
                    <span className={styles.hbarVal} style={{color}}>{fmt(b.score_overall)}</span>
                  </div>
                  <div className={styles.hbarScore} style={{color}}>{fmt(b.score_overall)}</div>
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
                  {KPI_CONFIG.map(k => <th key={k.key} style={{fontSize:8,color:'var(--tx3)',fontWeight:700,padding:'6px 7px',textAlign:'center',borderBottom:'1px solid var(--bd)',whiteSpace:'nowrap'}}>{k.name.substring(0,8)}</th>)}
                  <th style={{fontSize:8,color:'var(--tx3)',fontWeight:700,padding:'6px 7px',textAlign:'center',borderBottom:'1px solid var(--bd)'}}>Genel</th>
                </tr>
              </thead>
              <tbody>
                {regionScores.map(b => {
                  const kpis = [b.kpi_01,b.kpi_02,b.kpi_03,b.kpi_04,b.kpi_05,b.kpi_06,b.kpi_07,b.kpi_08,b.kpi_09,b.kpi_10,b.kpi_11]
                  return (
                    <tr key={b.region_id}>
                      <td style={{padding:'6px 8px',fontWeight:600,color:'var(--tx)',whiteSpace:'nowrap',borderBottom:'1px solid var(--bd)'}}>{b.region_name}</td>
                      {kpis.map((v,i) => <td key={i} style={{padding:'4px 5px',textAlign:'center',fontFamily:'var(--font-dm-mono)',fontWeight:500,fontSize:10,borderRadius:3,background:v>=80?'rgba(16,185,129,.18)':v>=70?'rgba(59,130,246,.14)':v>=60?'rgba(245,158,11,.18)':'rgba(239,68,68,.14)',color:scoreColor(v),borderBottom:'1px solid var(--bd)'}}>{fmt(v,0)}</td>)}
                      <td style={{padding:'4px 5px',textAlign:'center',fontFamily:'var(--font-dm-mono)',fontWeight:700,fontSize:10,background:b.score_overall>=80?'rgba(16,185,129,.18)':b.score_overall>=70?'rgba(59,130,246,.14)':b.score_overall>=60?'rgba(245,158,11,.18)':'rgba(239,68,68,.14)',color:scoreColor(b.score_overall),borderBottom:'1px solid var(--bd)'}}>{fmt(b.score_overall)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
