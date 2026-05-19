'use client'

import { useState, useMemo } from 'react'
import Topbar from '@/components/layout/Topbar'
import {
  MARKA_KPIS, SEGMENT_KPIS, KPI_META, CAT_COLORS,
  SEGMENT_COLORS, SEGMENT_BG, fmtKpi, isLowerBetter
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
         ReferenceLine } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function KpilerPage() {
  const [selKpi, setSelKpi] = useState(0)
  const [selSeg, setSelSeg] = useState('')

  const meta = KPI_META[selKpi]
  const lob  = isLowerBetter(selKpi)

  const markalar = useMemo(() => {
    let list = MARKA_KPIS.filter(m => !selSeg || m.segment === selSeg)
    return [...list].sort((a,b) => lob ? a.kpis[selKpi]-b.kpis[selKpi] : b.kpis[selKpi]-a.kpis[selKpi])
  }, [selKpi, selSeg, lob])

  // Segment ortalamaları bu KPI için
  const segAvgLines = SEGMENT_KPIS.map(s => ({
    segment: s.segment,
    avg: s.kpis[selKpi],
    color: SEGMENT_COLORS[s.segment],
  }))

  const chartLabels = markalar.map(m => m.marka)
  const chartData   = markalar.map(m => m.kpis[selKpi])
  const chartColors = markalar.map(m => SEGMENT_BG[m.segment] || 'rgba(100,100,100,.35)')
  const chartBorders = markalar.map(m => SEGMENT_COLORS[m.segment] || '#aaa')

  // Her bar için plugin referans çizgisi yerine annotation şeklinde segment avg dataset ekle
  const segDatasets = SEGMENT_KPIS.filter(s => !selSeg || s.segment===selSeg).map(s => ({
    label: `${s.segment} Ort.`,
    data: markalar.map(() => s.kpis[selKpi]),
    type: 'line' as const,
    borderColor: SEGMENT_COLORS[s.segment],
    borderWidth: 1.5,
    borderDash: [5,4],
    pointRadius: 0,
    fill: false,
    tension: 0,
  }))

  return (
    <div className={styles.wrap}>
      <Topbar title="KPI Detay"
        subtitle="12 KPI · Tıklayarak marka dağılımını görün · Kesik çizgi = segment ortalaması" />
      <div className={styles.content}>

        {/* KPI Kartları */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
          {KPI_META.map((k,i) => {
            // Genel ortalama bu KPI için
            const allAvg = MARKA_KPIS.reduce((a,m)=>a+m.kpis[i],0) / MARKA_KPIS.length
            return (
              <div key={k.no} onClick={() => setSelKpi(i)}
                style={{
                  background: selKpi===i ? 'rgba(59,130,246,.06)' : 'var(--surf)',
                  border: `1px solid ${selKpi===i?'var(--blue)':'var(--bd)'}`,
                  borderRadius:9, padding:'10px 12px', cursor:'pointer', transition:'all .12s'
                }}>
                <div style={{ fontSize:9, fontWeight:700, color: CAT_COLORS[k.kat]||'var(--tx3)', marginBottom:3, textTransform:'uppercase', letterSpacing:'.05em' }}>
                  {k.kat}
                </div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--tx)', marginBottom:4, lineHeight:1.3 }}>
                  KPI {k.no} · {k.ad}
                </div>
                <div style={{ fontSize:14, fontWeight:700, fontFamily:'var(--font-dm-mono)', color:selKpi===i?'var(--blue)':'var(--tx)' }}>
                  {fmtKpi(allAvg, k.fmt)}
                </div>
                <div style={{ fontSize:9, color:'var(--tx3)', marginTop:2 }}>Genel Ort.</div>
              </div>
            )
          })}
        </div>

        {/* Seçili KPI detay */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>KPI {meta.no}: {meta.ad} — Marka Dağılımı</h3>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {['', 'Mass','Premium','EV'].map(s => (
                <button key={s} onClick={() => setSelSeg(s)}
                  style={{
                    padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:600, cursor:'pointer',
                    border:`1px solid ${selSeg===s?(s?SEGMENT_COLORS[s]:'var(--blue)'):'var(--bd)'}`,
                    background: selSeg===s ? (s?SEGMENT_BG[s]:'rgba(59,130,246,.12)') : 'var(--surf2)',
                    color: selSeg===s ? (s?SEGMENT_COLORS[s]:'var(--blue)') : 'var(--tx2)',
                  }}>
                  {s || 'Tümü'}
                </button>
              ))}
              {lob && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:4, background:'rgba(16,185,129,.12)', color:'#10b981' }}>↓ Düşük daha iyi</span>}
            </div>
          </div>

          {/* Segment ortalaması göstergesi */}
          <div style={{ display:'flex', gap:16, marginBottom:10, flexWrap:'wrap' }}>
            {segAvgLines.filter(s => !selSeg || s.segment===selSeg).map(s => (
              <div key={s.segment} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:20, height:2, background:s.color, borderTop:`2px dashed ${s.color}` }}/>
                <span style={{ fontSize:10, color:s.color, fontWeight:600 }}>
                  {s.segment}: {fmtKpi(s.avg, meta.fmt)}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.chartWrap} style={{ height: 280 }}>
            <Bar
              data={{
                labels: chartLabels,
                datasets: [
                  {
                    label: meta.ad,
                    data: chartData,
                    backgroundColor: chartColors,
                    borderColor: chartBorders,
                    borderWidth: 1,
                    borderRadius: 3,
                    order: 2,
                  },
                  ...segDatasets.map(d => ({ ...d, order: 1 }))
                ]
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true, position: 'top',
                    labels:{ color:'#8496b0', font:{size:9}, boxWidth:12, filter: (item) => item.text.includes('Ort.') }
                  },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        if (ctx.dataset.type === 'line') return `${ctx.dataset.label}: ${fmtKpi(ctx.parsed.y, meta.fmt)}`
                        return `${ctx.label}: ${fmtKpi(ctx.parsed.y, meta.fmt)}`
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    grid:{ color:'rgba(255,255,255,.05)' },
                    ticks:{ color:'#8496b0', font:{size:9}, callback:(v)=>fmtKpi(Number(v), meta.fmt) }
                  },
                  x: {
                    grid:{ display:false },
                    ticks:{ color:'#8496b0', font:{size:8}, maxRotation:45, autoSkip:false }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Segment KPI özet tablo */}
        <div className={styles.card}>
          <div className={styles.cardHd}><h3>Segment × KPI Özet</h3></div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'var(--surf2)' }}>
                  <th style={{ padding:'8px 12px', textAlign:'left', fontSize:9, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)' }}>Segment</th>
                  {KPI_META.map(k => (
                    <th key={k.no} style={{ padding:'8px 8px', textAlign:'center', fontSize:8, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap' }}>
                      KPI {k.no}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SEGMENT_KPIS.map(s => (
                  <tr key={s.segment} style={{ borderBottom:'1px solid var(--bd)' }}>
                    <td style={{ padding:'8px 12px', fontWeight:700, color: SEGMENT_COLORS[s.segment] }}>
                      <span style={{ background:SEGMENT_BG[s.segment], padding:'2px 8px', borderRadius:20, fontSize:10 }}>
                        {s.segment}
                      </span>
                    </td>
                    {s.kpis.map((v,i) => (
                      <td key={i} style={{ padding:'7px 8px', textAlign:'center', fontFamily:'var(--font-dm-mono)', fontSize:10, color:'var(--tx)', borderBottom:'none' }}>
                        {fmtKpi(v, KPI_META[i].fmt)}
                      </td>
                    ))}
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
