'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  MARKA_KPIS, SEGMENT_KPIS, KPI_META,
  SEGMENT_COLORS, SEGMENT_BG, YAS_COLORS,
  fmtKpi, overallScore, heatColor, isLowerBetter, segmentAvg, getKpis
} from '@/lib/kpi'
import styles from './page.module.css'

export default function MarkalarsPage() {
  const { selSeg, selYas } = useDashboardCtx()
  const [sortKpi, setSortKpi] = useState<number | 'ov'>('ov')

  const markalar = useMemo(() => {
    let list = MARKA_KPIS.map(m => ({ ...m, ov: overallScore(m, selYas), kpis: getKpis(m, selYas) }))
    if (selSeg) list = list.filter(m => m.segment === selSeg)
    if (sortKpi === 'ov') return list.sort((a,b) => b.ov - a.ov)
    const idx = sortKpi as number
    const lob = isLowerBetter(idx)
    return list.sort((a,b) => lob ? a.kpis[idx] - b.kpis[idx] : b.kpis[idx] - a.kpis[idx])
  }, [selSeg, selYas, sortKpi])

  const spBg = (s: string) => SEGMENT_BG[s] || 'rgba(100,100,100,.15)'

  return (
    <div className={styles.wrap}>
      <Topbar title="Marka Sıralaması"
        subtitle={`${markalar.length} marka · ${selYas === 'Tümü' ? 'Tüm yaşlar' : selYas + ' yıl'} · ${selSeg || 'Tüm segmentler'}`} />
      <div className={styles.content}>

        {/* Segment ortalamaları — seçili yaşa göre */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
          {SEGMENT_KPIS.filter(s => !selSeg || s.segment===selSeg).map(s => {
            const kpis = getKpis(s, selYas)
            return (
              <div key={s.segment} style={{ background:'var(--surf2)', border:`1px solid ${SEGMENT_COLORS[s.segment]}44`, borderRadius:8, padding:'10px 14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:11, fontWeight:700, color: SEGMENT_COLORS[s.segment] }}>{s.segment} Ort.</span>
                  <span style={{ fontSize:9, color:'var(--tx3)' }}>
                    {selYas === 'Tümü' ? 'Tüm yaşlar' : selYas + ' yıl'} · {s.marka_count} marka
                  </span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4 }}>
                  {[0,3,4,6].map(i => (
                    <div key={i} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:8, color:'var(--tx3)', marginBottom:1 }}>KPI {i+1}</div>
                      <div style={{ fontSize:10, fontWeight:600, color:'var(--tx)', fontFamily:'var(--font-dm-mono)' }}>
                        {fmtKpi(kpis[i], KPI_META[i].fmt)}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Yaş kırılımı mini */}
                <div style={{ display:'flex', gap:6, marginTop:8, paddingTop:6, borderTop:'1px solid var(--bd)' }}>
                  {['0-3','3-7','7+'].map(yg => (
                    <div key={yg} style={{ flex:1, textAlign:'center' }}>
                      <div style={{ fontSize:8, color: YAS_COLORS[yg], fontWeight:600 }}>{yg}y</div>
                      <div style={{ fontSize:9, color:'var(--tx2)', fontFamily:'var(--font-dm-mono)' }}>
                        {fmtKpi(getKpis(s, yg)[4], 'tl0')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tablo */}
        <div className={styles.card} style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'var(--surf2)' }}>
                  <th style={thS}>#</th>
                  <th style={thS}>Marka</th>
                  <th style={thS}>Segment</th>
                  {KPI_META.map((k,i) => (
                    <th key={i} onClick={() => setSortKpi(i)}
                      style={{ ...thS, cursor:'pointer', color: sortKpi===i?'var(--blue)':'var(--tx3)',
                        background: sortKpi===i?'rgba(59,130,246,.06)':'var(--surf2)', whiteSpace:'nowrap' }}>
                      KPI {k.no}{sortKpi===i?' ↓':''}
                    </th>
                  ))}
                  <th onClick={() => setSortKpi('ov')}
                    style={{ ...thS, cursor:'pointer', color: sortKpi==='ov'?'var(--blue)':'var(--tx3)',
                      background: sortKpi==='ov'?'rgba(59,130,246,.08)':'var(--surf2)' }}>
                    Skor{sortKpi==='ov'?' ↓':''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {markalar.map((b, i) => (
                  <tr key={b.marka} style={{ borderBottom:'1px solid var(--bd)' }}>
                    <td style={tdS}><span style={{ color:'var(--tx3)', fontFamily:'var(--font-dm-mono)' }}>{i+1}</span></td>
                    <td style={{ ...tdS, fontWeight:600, fontSize:12 }}>{b.marka}</td>
                    <td style={tdS}>
                      <span style={{ background:spBg(b.segment), color:SEGMENT_COLORS[b.segment],
                        padding:'2px 7px', borderRadius:20, fontSize:9, fontWeight:700, textTransform:'uppercase' }}>
                        {b.segment}
                      </span>
                    </td>
                    {b.kpis.map((v, ki) => {
                      const avg = segmentAvg(b.segment, ki, selYas)
                      const { bg, color } = heatColor(v, avg, !isLowerBetter(ki))
                      return (
                        <td key={ki} style={{ ...tdS, background:bg, color, fontFamily:'var(--font-dm-mono)', fontWeight:500 }}>
                          {fmtKpi(v, KPI_META[ki].fmt)}
                        </td>
                      )
                    })}
                    <td style={tdS}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ flex:1, background:'var(--surf3)', borderRadius:10, height:4, overflow:'hidden', minWidth:36 }}>
                          <div style={{ width:`${b.ov}%`, height:4, borderRadius:10,
                            background: b.ov>=70?'#10b981':b.ov>=55?'#3b82f6':b.ov>=40?'#f59e0b':'#ef4444' }}/>
                        </div>
                        <span style={{ fontFamily:'var(--font-dm-mono)', fontSize:11, width:24, textAlign:'right',
                          color: b.ov>=70?'#10b981':b.ov>=55?'#3b82f6':b.ov>=40?'#f59e0b':'#ef4444' }}>{b.ov}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Renk açıklaması */}
        <div style={{ display:'flex', gap:12, marginTop:10, flexWrap:'wrap' }}>
          {[
            { c:'#10b981', bg:'rgba(16,185,129,.18)', label:'≥%15 segment üstü' },
            { c:'#60a5fa', bg:'rgba(59,130,246,.14)', label:'%5–15 üstü' },
            { c:'#fbbf24', bg:'rgba(245,158,11,.12)', label:'Ortalama' },
            { c:'#f87171', bg:'rgba(239,68,68,.14)',  label:'Segment altı' },
          ].map(x => (
            <div key={x.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:'var(--tx3)' }}>
              <div style={{ width:12, height:10, borderRadius:3, background:x.bg, border:`1px solid ${x.c}` }}/>
              {x.label}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

const thS: React.CSSProperties = { padding:'9px 10px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap' }
const tdS: React.CSSProperties = { padding:'7px 10px', borderBottom:'1px solid var(--bd)' }
