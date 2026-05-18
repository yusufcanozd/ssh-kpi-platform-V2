'use client'

import { useMemo } from 'react'
import { useDashboardCtx } from './DashboardClient'
import Topbar from '@/components/layout/Topbar'
import StatCard from '@/components/ui/StatCard'
import { scoreColor, fmt, SEGMENT_COLORS, SEGMENT_BG } from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

function groupByBrand(scores: any[]) {
  const map: Record<string, any> = {}
  scores.forEach(s => {
    if (!map[s.brand_id]) {
      map[s.brand_id] = { id: s.brand_id, name: s.brand_name, segment: s.brand_segment, n: 0, op: 0, cu: 0, sv: 0, co: 0, ov: 0, kpis: Array(11).fill(0) }
    }
    const b = map[s.brand_id]
    b.n++; b.op += s.score_op; b.cu += s.score_cu; b.sv += s.score_sv; b.co += s.score_co; b.ov += s.score_overall
    ;[s.kpi_01,s.kpi_02,s.kpi_03,s.kpi_04,s.kpi_05,s.kpi_06,s.kpi_07,s.kpi_08,s.kpi_09,s.kpi_10,s.kpi_11].forEach((v,i) => { b.kpis[i] += (v||0) })
  })
  return Object.values(map).map(b => ({
    ...b, op: +(b.op/b.n).toFixed(1), cu: +(b.cu/b.n).toFixed(1),
    sv: +(b.sv/b.n).toFixed(1), co: +(b.co/b.n).toFixed(1), ov: +(b.ov/b.n).toFixed(1),
    kpis: b.kpis.map((v:number) => +(v/b.n).toFixed(1))
  })).sort((a:any,b:any) => b.ov - a.ov)
}

export default function DashboardPage() {
  const { brandScores, regionScores } = useDashboardCtx()
  const brands   = useMemo(() => groupByBrand(brandScores), [brandScores])
  const bolgeler = regionScores

  const avg = (key: string) => brands.length ? +(brands.reduce((s:any,b:any) => s+b[key], 0) / brands.length).toFixed(1) : 0
  const segs = ['Premium','Mass','EV'].filter(s => brands.some((b:any) => b.segment===s))
  const segAvg = segs.map(s => { const mb = brands.filter((b:any) => b.segment===s); return mb.length ? +(mb.reduce((a:any,b:any) => a+b.ov, 0)/mb.length).toFixed(1) : 0 })
  const maxS = Math.max(...bolgeler.map(b => b.score_overall), 60)

  return (
    <div className={styles.wrap}>
      <Topbar
        title="SSH KPI Rekabet Skorkartı"
        subtitle={`${brands.length} Marka · ${bolgeler.length} Bölge · 11 KPI`}
        pills={[{ label: '● Gerçek Veri', variant: 'green' }, { label: '⚠ 3 KPI Kısıtlı', variant: 'amber' }]}
      />
      <div className={styles.content}>
        <div className={styles.statGrid}>
          <StatCard label="Operasyonel Verimlilik" value={avg('op')} sub="%35 ağırlık · 3 KPI" accent="blue" />
          <StatCard label="Müşteri Kalitesi"       value={avg('cu')} sub="%30 ağırlık · 3 KPI" accent="green" />
          <StatCard label="Servis Kapasitesi"      value={avg('sv')} sub="%20 ağırlık · 3 KPI" accent="amber" />
          <StatCard label="Kapsam & Değer"         value={avg('co')} sub="%15 ağırlık · 2 KPI" accent="red" />
        </div>
        <div className={styles.twoCol}>
          <div className={styles.card}>
            <div className={styles.cardHd}><h3>Segment Karşılaştırma</h3></div>
            <div className={styles.chartWrap}>
              <Bar
                data={{ labels: segs, datasets: [{ data: segAvg, backgroundColor: segs.map(s => SEGMENT_BG[s as keyof typeof SEGMENT_BG]), borderColor: segs.map(s => SEGMENT_COLORS[s as keyof typeof SEGMENT_COLORS]), borderWidth: 1.5, borderRadius: 7 }] }}
                options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8496b0',font:{size:10}}}, x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:11}}} } }}
              />
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHd}><h3>Top 10 Marka</h3><span className={styles.hint}>Genel skor</span></div>
            <div className={styles.hbarChart}>
              {brands.slice(0,10).map((b:any) => {
                const color = scoreColor(b.ov)
                return (
                  <div key={b.id} className={styles.hbarRow}>
                    <div className={styles.hbarLabel} style={{color: SEGMENT_COLORS[b.segment as keyof typeof SEGMENT_COLORS]}}>{b.name}</div>
                    <div className={styles.hbarTrack}>
                      <div className={styles.hbarFill} style={{width:`${b.ov}%`,background:`${color}44`,borderRight:`3px solid ${color}`}}/>
                      <span className={styles.hbarVal} style={{color}}>{fmt(b.ov)}</span>
                    </div>
                    <div className={styles.hbarScore} style={{color}}>{fmt(b.ov)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        {bolgeler.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHd}><h3>Bölge Skorları</h3></div>
            <div className={styles.hbarChart}>
              {bolgeler.map(b => {
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
        )}
      </div>
    </div>
  )
}
