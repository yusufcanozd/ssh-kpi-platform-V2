'use client'

import { useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  BOLGE_KPIS, BOLGE_SEG_KPIS, SEGMENT_KPIS, KPI_META,
  SEGMENT_COLORS, SEGMENT_BG, YAS_COLORS,
  fmtKpi, heatColor, isLowerBetter, segmentAvg, getKpis
} from '@/lib/kpi'
import styles from './page.module.css'

export default function BolgelerPage() {
  const { selSeg, selBolge, selYas } = useDashboardCtx()
  const [selKpi, setSelKpi] = useState(0)
  const [viewSeg, setViewSeg] = useState('Mass')

  const bolgeList = BOLGE_KPIS.filter(b => !selBolge || b.bolge === selBolge)
  const bsData    = BOLGE_SEG_KPIS.filter(d =>
    (!selBolge || d.bolge === selBolge) && d.segment === viewSeg
  )

  return (
    <div className={styles.wrap}>
      <Topbar title="Bölge Analizi"
        subtitle={`7 Bölge · ${selYas === 'Tümü' ? 'Tüm yaşlar' : selYas + ' yıl'} · ${viewSeg}`} />
      <div className={styles.content}>

        {/* Bölge iş emri özeti */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8, marginBottom:16 }}>
          {bolgeList.map(b => {
            const maxIO = Math.max(...BOLGE_KPIS.map(x => x.io_count))
            const ratio = b.io_count / maxIO
            const kpis  = getKpis(b, selYas)
            return (
              <div key={b.bolge} style={{ background: selBolge===b.bolge?'rgba(59,130,246,.08)':'var(--surf2)', borderRadius:8, padding:'10px 8px', textAlign:'center', border:`1px solid ${selBolge===b.bolge?'var(--blue)':'var(--bd)'}` }}>
                <div style={{ fontSize:8, fontWeight:700, color:'var(--tx3)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.04em', lineHeight:1.3 }}>{b.bolge}</div>
                <div style={{ height:28, display:'flex', alignItems:'flex-end', justifyContent:'center', marginBottom:3 }}>
                  <div style={{ width:18, borderRadius:'2px 2px 0 0', background:'rgba(59,130,246,.5)', borderTop:'2px solid #3b82f6', height:`${(ratio*100).toFixed(0)}%`, minHeight:4 }}/>
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--tx)', fontFamily:'var(--font-dm-mono)' }}>
                  {b.io_count.toLocaleString('tr-TR')}
                </div>
                {kpis[6] != null && (
                  <div style={{ fontSize:8, color:'var(--tx3)', marginTop:3 }}>
                    Süre: {fmtKpi(kpis[6], 'gun1')}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Isı haritası */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>Bölge × KPI Isı Haritası</h3>
            <div style={{ display:'flex', gap:8 }}>
              {['Mass','Premium','EV'].map(s => (
                <button key={s} onClick={() => setViewSeg(s)}
                  style={{
                    padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:600, cursor:'pointer',
                    border:`1px solid ${viewSeg===s?SEGMENT_COLORS[s]:'var(--bd)'}`,
                    background: viewSeg===s ? SEGMENT_BG[s] : 'var(--surf2)',
                    color: viewSeg===s ? SEGMENT_COLORS[s] : 'var(--tx2)',
                  }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Segment referans */}
          <div style={{ display:'flex', gap:4, marginBottom:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:9, color:'var(--tx3)' }}>Referans ({viewSeg} · {selYas==='Tümü'?'Tüm':''+selYas}y):</span>
            {SEGMENT_KPIS.filter(s => s.segment===viewSeg).map(s =>
              getKpis(s, selYas).map((v,i) => (
                <span key={i} style={{ fontSize:8, color:'var(--tx3)', background:'var(--surf3)', padding:'1px 5px', borderRadius:3 }}>
                  K{i+1}: {fmtKpi(v, KPI_META[i].fmt)}
                </span>
              ))
            )}
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ borderCollapse:'collapse', fontSize:10, minWidth:700, width:'100%' }}>
              <thead>
                <tr>
                  <th style={{ ...thS, width:130 }}>Bölge</th>
                  {KPI_META.map((k,i) => (
                    <th key={i} onClick={() => setSelKpi(i)}
                      style={{ ...thS, cursor:'pointer', color: selKpi===i?'var(--blue)':'var(--tx3)', background: selKpi===i?'rgba(59,130,246,.06)':'transparent' }}>
                      <div style={{ fontSize:8 }}>KPI {k.no}</div>
                      <div style={{ fontSize:7, color:'var(--tx3)', fontWeight:400 }}>{k.ad.substring(0,7)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bsData.map(row => {
                  const kpis = getKpis(row, selYas)
                  if (!kpis || kpis.every(v => !v)) return null
                  return (
                    <tr key={row.bolge} style={{ borderBottom:'1px solid var(--bd)' }}>
                      <td style={{ padding:'7px 10px', fontWeight:600, color:'var(--tx)', whiteSpace:'nowrap' }}>{row.bolge}</td>
                      {kpis.map((v,i) => {
                        const avg = segmentAvg(row.segment, i, selYas)
                        const { bg, color } = heatColor(v, avg, !isLowerBetter(i))
                        return (
                          <td key={i} style={{
                            padding:'5px 6px', textAlign:'center', fontFamily:'var(--font-dm-mono)', fontWeight:600, fontSize:10,
                            background: selKpi===i ? bg : bg,
                            color, outline: selKpi===i?`2px solid ${color}55`:'none', outlineOffset:-1,
                          }}>
                            {fmtKpi(v, KPI_META[i].fmt)}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Renk açıklama */}
          <div style={{ display:'flex', gap:12, marginTop:12, paddingTop:10, borderTop:'1px solid var(--bd)', flexWrap:'wrap' }}>
            {[
              { c:'#10b981', bg:'rgba(16,185,129,.18)', label:'≥%15 segment üstü' },
              { c:'#60a5fa', bg:'rgba(59,130,246,.14)', label:'%5–15 üstü' },
              { c:'#fbbf24', bg:'rgba(245,158,11,.12)', label:'Ortalama' },
              { c:'#f87171', bg:'rgba(239,68,68,.14)',  label:'Segment altı' },
            ].map(x => (
              <div key={x.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:'var(--tx3)' }}>
                <div style={{ width:14, height:10, borderRadius:2, background:x.bg, border:`1px solid ${x.c}` }}/>
                {x.label}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

const thS: React.CSSProperties = { padding:'7px 8px', textAlign:'center', fontSize:9, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap' }
