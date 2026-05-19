'use client'

import { useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import { SEGMENT_KPIS, KPI_META, SEGMENT_COLORS, SEGMENT_BG, fmtKpi } from '@/lib/kpi'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Legend
} from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

// Simüle edilmiş aylık trend — 2024 yılı veri vardı, 2025 yılı eklendi
// KPI4 (İşçilik saati) ve KPI9 (servis başına IE) için
const MONTHS = ['Oca 24','Şub 24','Mar 24','Nis 24','May 24','Haz 24','Tem 24','Ağu 24','Eyl 24','Eki 24','Kas 24','Ara 24',
                'Oca 25','Şub 25','Mar 25','Nis 25','May 25','Haz 25','Tem 25','Ağu 25','Eyl 25','Eki 25','Kas 25','Ara 25']

function genTrend(base: number, noise: number, months: number) {
  return Array.from({length: months}, (_,i) => +(base + (Math.sin(i*0.5)*noise) + (i*0.01)).toFixed(2))
}

const TREND_DATA = {
  Mass:    { kpi4: genTrend(4.25, 0.3, 24), kpi9: genTrend(277, 20, 24) },
  Premium: { kpi4: genTrend(6.46, 0.4, 24), kpi9: genTrend(137, 15, 24) },
  EV:      { kpi4: genTrend(6.57, 0.5, 24), kpi9: genTrend(104, 12, 24) },
}

export default function TrendPage() {
  const [selKpi, setSelKpi] = useState<'kpi4' | 'kpi9'>('kpi4')
  const kpiLabel = selKpi === 'kpi4' ? 'İE Başına İşçilik Saati' : 'Servis Başına İş Emri'
  const kpiFmt   = selKpi === 'kpi4' ? 'saat1' : 'ratio1'
  const kpiMeta  = KPI_META[selKpi === 'kpi4' ? 3 : 8]

  return (
    <div className={styles.wrap}>
      <Topbar title="Dönemsel Trend"
        subtitle="2024–2025 · Aylık KPI değişimi · Segment bazlı karşılaştırma" />
      <div className={styles.content}>

        {/* KPI seçim */}
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {(['kpi4','kpi9'] as const).map(k => (
            <button key={k} onClick={() => setSelKpi(k)}
              style={{
                padding:'5px 14px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer',
                border:`1px solid ${selKpi===k?'var(--blue)':'var(--bd)'}`,
                background: selKpi===k ? 'rgba(59,130,246,.12)' : 'var(--surf2)',
                color: selKpi===k ? 'var(--blue)' : 'var(--tx2)',
              }}>
              {k==='kpi4' ? 'KPI 4 · İşçilik Saati/İE' : 'KPI 9 · Servis Başına İE'}
            </button>
          ))}
        </div>

        {/* Trend grafik */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>{kpiLabel} — Aylık Trend</h3>
            <span className={styles.hint}>Segment başına ortalama · Kesik çizgi = referans</span>
          </div>
          <div className={styles.chartWrap} style={{ height:300 }}>
            <Line
              data={{
                labels: MONTHS,
                datasets: (['Mass','Premium','EV'] as const).map(seg => ({
                  label: seg,
                  data: TREND_DATA[seg][selKpi],
                  borderColor: SEGMENT_COLORS[seg],
                  backgroundColor: SEGMENT_BG[seg].replace('.35',',.08)'),
                  borderWidth: 2,
                  pointRadius: 3,
                  pointHoverRadius: 5,
                  fill: false,
                  tension: 0.4,
                }))
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position:'top', labels:{ color:'#8496b0', font:{size:10}, boxWidth:14 } },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtKpi(ctx.parsed.y, kpiFmt)}` } }
                },
                scales: {
                  y: { grid:{ color:'rgba(255,255,255,.05)' }, ticks:{ color:'#8496b0', font:{size:9}, callback:(v)=>fmtKpi(Number(v), kpiFmt) } },
                  x: { grid:{ display:false }, ticks:{ color:'#8496b0', font:{size:8}, maxRotation:45, autoSkip:true, maxTicksLimit:12 } }
                }
              }}
            />
          </div>
        </div>

        {/* Segment mevcut değerleri */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {SEGMENT_KPIS.map(s => {
            const kpiIdx = selKpi === 'kpi4' ? 3 : 8
            return (
              <div key={s.segment} style={{ background:'var(--surf2)', border:`1px solid ${SEGMENT_COLORS[s.segment]}44`, borderRadius:8, padding:'14px 16px' }}>
                <div style={{ fontSize:11, fontWeight:700, color: SEGMENT_COLORS[s.segment], marginBottom:8 }}>{s.segment}</div>
                <div style={{ fontSize:24, fontWeight:700, fontFamily:'var(--font-dm-mono)', color:'var(--tx)', marginBottom:4 }}>
                  {fmtKpi(s.kpis[kpiIdx], kpiMeta.fmt)}
                </div>
                <div style={{ fontSize:9, color:'var(--tx3)' }}>2024–2025 ortalaması · {s.marka_count} marka</div>
                <div style={{ marginTop:10, paddingTop:8, borderTop:'1px solid var(--bd)' }}>
                  {[0,1,2,5,6,10,11].map(i => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'var(--tx3)', marginBottom:3 }}>
                      <span>KPI {i+1} · {KPI_META[i].ad}</span>
                      <span style={{ fontFamily:'var(--font-dm-mono)', color:'var(--tx)' }}>{fmtKpi(s.kpis[i], KPI_META[i].fmt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
