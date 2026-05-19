'use client'

import { useMemo, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import {
  MARKA_KPIS, SEGMENT_KPIS, KPI_META,
  SEGMENT_COLORS, SEGMENT_BG, fmtKpi, overallScore, heatColor, isLowerBetter, segmentAvg
} from '@/lib/kpi'
import styles from './page.module.css'

const SEGS = ['Mass','Premium','EV']

export default function MarkalarsPage() {
  const [selSeg, setSelSeg] = useState('')
  const [sortKpi, setSortKpi] = useState<number | 'ov'>('ov')

  const markalar = useMemo(() => {
    let list = MARKA_KPIS.map(m => ({ ...m, ov: overallScore(m) }))
    if (selSeg) list = list.filter(m => m.segment === selSeg)
    if (sortKpi === 'ov') return list.sort((a,b) => b.ov - a.ov)
    const idx = sortKpi as number
    const lob = isLowerBetter(idx)
    return list.sort((a,b) => lob ? a.kpis[idx]-b.kpis[idx] : b.kpis[idx]-a.kpis[idx])
  }, [selSeg, sortKpi])

  const spBg = (s:string) => SEGMENT_BG[s] || 'rgba(100,100,100,.15)'

  return (
    <div className={styles.wrap}>
      <Topbar title="Marka Sıralaması"
        subtitle={`${markalar.length} marka · 12 KPI · Segment ortalamasına göre normalize`} />
      <div className={styles.content}>

        {/* Segment filtre */}
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          {['', ...SEGS].map(s => (
            <button key={s} onClick={() => setSelSeg(s)}
              style={{
                padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer',
                border:`1px solid ${selSeg===s?(s?SEGMENT_COLORS[s]:'var(--blue)'):'var(--bd)'}`,
                background: selSeg===s ? spBg(s||'Mass') : 'var(--surf2)',
                color: selSeg===s ? (s?SEGMENT_COLORS[s]:'var(--blue)') : 'var(--tx2)',
              }}>
              {s || 'Tümü'}
            </button>
          ))}
        </div>

        {/* Segment ortalamaları */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
          {SEGMENT_KPIS.filter(s => !selSeg || s.segment===selSeg).map(s => (
            <div key={s.segment} style={{ background:'var(--surf2)', border:`1px solid ${SEGMENT_COLORS[s.segment]}44`, borderRadius:8, padding:'10px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:11, fontWeight:700, color: SEGMENT_COLORS[s.segment] }}>{s.segment} Ortalaması</span>
                <span style={{ fontSize:9, color:'var(--tx3)' }}>{s.marka_count} marka</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4 }}>
                {[0,3,4,6].map(i => (
                  <div key={i} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:8, color:'var(--tx3)', marginBottom:1 }}>KPI {i+1}</div>
                    <div style={{ fontSize:10, fontWeight:600, color:'var(--tx)', fontFamily:'var(--font-dm-mono)' }}>
                      {fmtKpi(s.kpis[i], KPI_META[i].fmt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Tablo */}
        <div className={styles.card} style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'var(--surf2)' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Marka</th>
                  <th style={thStyle}>Segment</th>
                  {KPI_META.map((k,i) => (
                    <th key={i} onClick={() => setSortKpi(i)}
                      style={{ ...thStyle, cursor:'pointer', color: sortKpi===i?'var(--blue)':'var(--tx3)',
                                background: sortKpi===i?'rgba(59,130,246,.06)':'var(--surf2)',
                                whiteSpace:'nowrap', minWidth:60 }}>
                      KPI {k.no}
                      {sortKpi===i ? ' ↓' : ''}
                    </th>
                  ))}
                  <th onClick={() => setSortKpi('ov')}
                    style={{ ...thStyle, cursor:'pointer', color: sortKpi==='ov'?'var(--blue)':'var(--tx3)',
                              background: sortKpi==='ov'?'rgba(59,130,246,.08)':'var(--surf2)' }}>
                    Skor {sortKpi==='ov'?' ↓':''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {markalar.map((b, i) => (
                  <tr key={b.marka} style={{ borderBottom:'1px solid var(--bd)' }}>
                    <td style={tdStyle}><span style={{ color:'var(--tx3)', fontFamily:'var(--font-dm-mono)' }}>{i+1}</span></td>
                    <td style={{ ...tdStyle, fontWeight:600, fontSize:12 }}>{b.marka}</td>
                    <td style={tdStyle}>
                      <span style={{ background:spBg(b.segment), color:SEGMENT_COLORS[b.segment],
                                    padding:'2px 7px', borderRadius:20, fontSize:9, fontWeight:700, textTransform:'uppercase' }}>
                        {b.segment}
                      </span>
                    </td>
                    {b.kpis.map((v, ki) => {
                      const avg = segmentAvg(b.segment, ki)
                      const lob = isLowerBetter(ki)
                      const { bg, color } = heatColor(v, avg, !lob)
                      return (
                        <td key={ki} style={{ ...tdStyle, background:bg, color, fontFamily:'var(--font-dm-mono)', fontWeight:500 }}>
                          {fmtKpi(v, KPI_META[ki].fmt)}
                        </td>
                      )
                    })}
                    <td style={tdStyle}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ flex:1, background:'var(--surf3)', borderRadius:10, height:4, overflow:'hidden', minWidth:40 }}>
                          <div style={{ width:`${b.ov}%`, height:4, borderRadius:10,
                                        background: b.ov>=70?'#10b981':b.ov>=55?'#3b82f6':b.ov>=40?'#f59e0b':'#ef4444' }}/>
                        </div>
                        <span style={{ fontFamily:'var(--font-dm-mono)', fontSize:11,
                                       color: b.ov>=70?'#10b981':b.ov>=55?'#3b82f6':b.ov>=40?'#f59e0b':'#ef4444',
                                       width:26, textAlign:'right' }}>{b.ov}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Renk açıklama */}
        <div style={{ display:'flex', gap:12, marginTop:10, flexWrap:'wrap' }}>
          {[
            { c:'#10b981', bg:'rgba(16,185,129,.18)', label:'≥ %15 segment üstü' },
            { c:'#60a5fa', bg:'rgba(59,130,246,.14)', label:'%5–15 segment üstü' },
            { c:'#fbbf24', bg:'rgba(245,158,11,.12)', label:'Segment ortalaması' },
            { c:'#f87171', bg:'rgba(239,68,68,.14)',  label:'Segment altı' },
          ].map(x => (
            <div key={x.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:'var(--tx3)' }}>
              <div style={{ width:12, height:12, borderRadius:3, background:x.bg, border:`1px solid ${x.c}` }}/>
              {x.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding:'9px 10px', textAlign:'left', fontSize:9, fontWeight:700,
  letterSpacing:'.07em', textTransform:'uppercase', color:'var(--tx3)',
  borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap'
}
const tdStyle: React.CSSProperties = {
  padding:'7px 10px', borderBottom:'1px solid var(--bd)'
}
