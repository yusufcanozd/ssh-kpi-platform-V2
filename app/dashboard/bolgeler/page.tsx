'use client'

import { useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import {
  BOLGE_KPIS, BOLGE_SEG_KPIS, SEGMENT_KPIS, KPI_META,
  SEGMENT_COLORS, SEGMENT_BG, fmtKpi, heatColor, isLowerBetter, segmentAvg
} from '@/lib/kpi'
import styles from './page.module.css'

export default function BolgelerPage() {
  const [selSeg, setSelSeg] = useState<string>('Mass')
  const [selKpi, setSelKpi] = useState<number>(0)

  const bolgeList = BOLGE_KPIS

  // Bolge x Segment ısı haritası için veri
  const bsData = BOLGE_SEG_KPIS.filter(d => !selSeg || d.segment === selSeg)

  return (
    <div className={styles.wrap}>
      <Topbar title="Bölge Analizi"
        subtitle="7 Bölge · 3 Segment · 12 KPI · Isı haritası segment ortalamasına göre renklendirilir" />
      <div className={styles.content}>

        {/* Bölge iş emri özeti */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8, marginBottom:16 }}>
          {bolgeList.map(b => {
            const maxIO = Math.max(...bolgeList.map(x=>x.io_count))
            const ratio = b.io_count / maxIO
            return (
              <div key={b.bolge} style={{ background:'var(--surf2)', borderRadius:8, padding:'10px 8px', textAlign:'center', border:'1px solid var(--bd)' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'var(--tx3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'.05em', lineHeight:1.3 }}>{b.bolge}</div>
                <div style={{ height:30, display:'flex', alignItems:'flex-end', justifyContent:'center', marginBottom:4 }}>
                  <div style={{ width:20, borderRadius:'2px 2px 0 0', background:'rgba(59,130,246,.5)', borderTop:'2px solid #3b82f6', height:`${(ratio*100).toFixed(0)}%`, minHeight:4 }}/>
                </div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--tx)', fontFamily:'var(--font-dm-mono)' }}>
                  {b.io_count.toLocaleString('tr-TR')}
                </div>
              </div>
            )
          })}
        </div>

        {/* Isı haritası — Bölge x KPI (seçili segment) */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>Bölge × KPI Isı Haritası</h3>
            <div style={{ display:'flex', gap:8 }}>
              {['Mass','Premium','EV'].map(s => (
                <button key={s} onClick={() => setSelSeg(s)}
                  style={{
                    padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:600, cursor:'pointer',
                    border:`1px solid ${selSeg===s?SEGMENT_COLORS[s]:'var(--bd)'}`,
                    background: selSeg===s ? SEGMENT_BG[s] : 'var(--surf2)',
                    color: selSeg===s ? SEGMENT_COLORS[s] : 'var(--tx2)',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Segment ortalaması referans satırı */}
          {selSeg && (
            <div style={{ display:'flex', gap:4, marginBottom:10, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:9, color:'var(--tx3)', marginRight:4 }}>Segment ort. referans →</span>
              {SEGMENT_KPIS.filter(s=>s.segment===selSeg).map(s =>
                s.kpis.map((v,i) => (
                  <span key={i} style={{ fontSize:9, color:'var(--tx3)', background:'var(--surf3)', padding:'1px 6px', borderRadius:4 }}>
                    K{i+1}: {fmtKpi(v, KPI_META[i].fmt)}
                  </span>
                ))
              )}
            </div>
          )}

          <div style={{ overflowX:'auto' }}>
            <table style={{ borderCollapse:'collapse', fontSize:10, minWidth:700, width:'100%' }}>
              <thead>
                <tr>
                  <th style={{ ...thS, width:130 }}>Bölge</th>
                  {KPI_META.map((k,i) => (
                    <th key={i} onClick={() => setSelKpi(i)}
                      style={{ ...thS, cursor:'pointer', color: selKpi===i?'var(--blue)':'var(--tx3)', background: selKpi===i?'rgba(59,130,246,.06)':'transparent' }}>
                      <div style={{ fontSize:8 }}>KPI {k.no}</div>
                      <div style={{ fontSize:7, color:'var(--tx3)', fontWeight:400, whiteSpace:'nowrap' }}>{k.ad.substring(0,8)}</div>
                    </th>
                  ))}
                  <th style={thS}>İE Sayısı</th>
                </tr>
              </thead>
              <tbody>
                {bsData.map(row => (
                  <tr key={row.bolge + row.segment} style={{ borderBottom:'1px solid var(--bd)' }}>
                    <td style={{ padding:'7px 10px', fontWeight:600, color:'var(--tx)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap' }}>
                      {row.bolge}
                    </td>
                    {row.kpis.map((v,i) => {
                      const avg = segmentAvg(row.segment, i)
                      const lob = isLowerBetter(i)
                      const { bg, color } = heatColor(v, avg, !lob)
                      return (
                        <td key={i} style={{
                          padding:'5px 6px', textAlign:'center',
                          fontFamily:'var(--font-dm-mono)', fontWeight:600, fontSize:10,
                          background: selKpi===i ? bg : bg.replace('.18',',.25)').replace('.14',',.20)').replace('.12',',.18)'),
                          color, borderBottom:'1px solid var(--bd)',
                          outline: selKpi===i ? `2px solid ${color}55` : 'none',
                          outlineOffset:-1,
                        }}>
                          {fmtKpi(v, KPI_META[i].fmt)}
                        </td>
                      )
                    })}
                    <td style={{ padding:'5px 8px', textAlign:'right', fontFamily:'var(--font-dm-mono)', fontSize:10, color:'var(--tx2)', borderBottom:'1px solid var(--bd)' }}>
                      {(() => { const bd = BOLGE_KPIS.find(b=>b.bolge===row.bolge); return bd ? bd.io_count.toLocaleString('tr-TR') : '—' })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Renk açıklama */}
          <div style={{ display:'flex', gap:12, marginTop:12, paddingTop:10, borderTop:'1px solid var(--bd)', flexWrap:'wrap' }}>
            {[
              { c:'#10b981', bg:'rgba(16,185,129,.18)', label:'Segment ortalaması ≥ %15 üstü' },
              { c:'#60a5fa', bg:'rgba(59,130,246,.14)', label:'%5–15 üstü' },
              { c:'#fbbf24', bg:'rgba(245,158,11,.12)', label:'±%5 ortalama' },
              { c:'#f87171', bg:'rgba(239,68,68,.14)',  label:'%5 altı' },
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

const thS: React.CSSProperties = {
  padding:'7px 8px', textAlign:'center', fontSize:9, fontWeight:700,
  color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap'
}
