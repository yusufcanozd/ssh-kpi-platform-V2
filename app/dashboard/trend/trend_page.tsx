'use client'

import { useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import { SEGMENT_KPIS, KPI_META, SEGMENT_COLORS, SEGMENT_BG, YAS_COLORS, fmtKpi, getKpis } from '@/lib/kpi'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const MONTHS = [
  'Oca 24','Şub 24','Mar 24','Nis 24','May 24','Haz 24',
  'Tem 24','Ağu 24','Eyl 24','Eki 24','Kas 24','Ara 24',
  'Oca 25','Şub 25','Mar 25','Nis 25','May 25','Haz 25',
  'Tem 25','Ağu 25','Eyl 25','Eki 25','Kas 25','Ara 25'
]

function genTrend(base: number, noise: number) {
  return Array.from({ length: 24 }, (_, i) =>
    +(base + Math.sin(i * 0.5) * noise + i * 0.01).toFixed(2)
  )
}

const SEGS = ['Mass', 'Premium', 'EV'] as const

export default function TrendPage() {
  const { selSeg, selYas } = useDashboardCtx()
  const [selKpiIdx, setSelKpiIdx] = useState(3) // KPI4 default

  const kpiMeta = KPI_META[selKpiIdx]

  const filteredSegs = SEGMENT_KPIS.filter(s => !selSeg || s.segment === selSeg)

  const datasets = filteredSegs.map(s => {
    const base = getKpis(s, selYas)[selKpiIdx] ?? 0
    return {
      label: s.segment,
      data: genTrend(base, base * 0.08),
      borderColor: SEGMENT_COLORS[s.segment],
      backgroundColor: SEGMENT_BG[s.segment].replace('.35', ',.08)'),
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      fill: false,
      tension: 0.4,
    }
  })

  return (
    <div className={styles.wrap}>
      <Topbar title="Dönemsel Trend"
        subtitle={`2024–2025 · ${selYas === 'Tümü' ? 'Tüm yaşlar' : selYas + ' yıl'} · ${selSeg || 'Tüm segmentler'}`} />
      <div className={styles.content}>

        {/* KPI seçim */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6, marginBottom:14 }}>
          {[3, 4, 5, 6, 8, 9].map(i => (
            <button key={i} onClick={() => setSelKpiIdx(i)}
              style={{
                padding:'6px 10px', borderRadius:8, fontSize:10, fontWeight:600, cursor:'pointer', textAlign:'left',
                border:`1px solid ${selKpiIdx===i ? 'var(--blue)' : 'var(--bd)'}`,
                background: selKpiIdx===i ? 'rgba(59,130,246,.08)' : 'var(--surf2)',
                color: selKpiIdx===i ? 'var(--blue)' : 'var(--tx2)',
              }}>
              <div style={{ fontSize:8, color:'var(--tx3)', marginBottom:2 }}>KPI {i+1}</div>
              {KPI_META[i].ad}
            </button>
          ))}
        </div>

        {/* Trend grafik */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>KPI {kpiMeta.no}: {kpiMeta.ad} — Aylık Trend</h3>
            <span className={styles.hint}>{selYas === 'Tümü' ? 'Tüm yaşlar' : selYas + ' yıl'} · segment başına ortalama</span>
          </div>
          <div className={styles.chartWrap} style={{ height:300 }}>
            <Line
              data={{ labels: MONTHS, datasets }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position:'top', labels:{ color:'#8496b0', font:{size:10}, boxWidth:14 } },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtKpi(ctx.parsed.y as number, kpiMeta.fmt)}` } }
                },
                scales: {
                  y: { grid:{ color:'rgba(255,255,255,.05)' }, ticks:{ color:'#8496b0', font:{size:9}, callback:(v) => fmtKpi(Number(v), kpiMeta.fmt) } },
                  x: { grid:{ display:false }, ticks:{ color:'#8496b0', font:{size:8}, maxRotation:45, autoSkip:true, maxTicksLimit:12 } }
                }
              }}
            />
          </div>
        </div>

        {/* Segment × Yaş kırılımı */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {filteredSegs.map(s => (
            <div key={s.segment} style={{ background:'var(--surf2)', border:`1px solid ${SEGMENT_COLORS[s.segment]}44`, borderRadius:8, padding:'14px 16px' }}>
              <div style={{ fontSize:11, fontWeight:700, color: SEGMENT_COLORS[s.segment], marginBottom:8 }}>{s.segment}</div>
              <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-dm-mono)', color:'var(--tx)', marginBottom:2 }}>
                {fmtKpi(getKpis(s, selYas)[selKpiIdx], kpiMeta.fmt)}
              </div>
              <div style={{ fontSize:9, color:'var(--tx3)', marginBottom:10 }}>
                {selYas === 'Tümü' ? 'Tüm yaşlar' : selYas + ' yıl'} · {s.marka_count} marka
              </div>

              {/* Yaş kırılımı */}
              <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                {['0-3','3-7','7+'].map(yg => (
                  <div key={yg} style={{ flex:1, textAlign:'center', background:`${YAS_COLORS[yg]}12`,
                    border:`1px solid ${YAS_COLORS[yg]}33`, borderRadius:6, padding:'5px 4px' }}>
                    <div style={{ fontSize:8, color: YAS_COLORS[yg], fontWeight:700, marginBottom:2 }}>{yg}y</div>
                    <div style={{ fontSize:10, fontWeight:600, color:'var(--tx)', fontFamily:'var(--font-dm-mono)' }}>
                      {fmtKpi(getKpis(s, yg)[selKpiIdx], kpiMeta.fmt)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Diğer KPI'lar */}
              <div style={{ paddingTop:8, borderTop:'1px solid var(--bd)' }}>
                {[0,1,2,10,11].map(i => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'var(--tx3)', marginBottom:3 }}>
                    <span>KPI {i+1} · {KPI_META[i].ad}</span>
                    <span style={{ fontFamily:'var(--font-dm-mono)', color:'var(--tx)' }}>
                      {fmtKpi(getKpis(s, selYas)[i], KPI_META[i].fmt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
