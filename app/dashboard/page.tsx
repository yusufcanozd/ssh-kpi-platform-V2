'use client'

import { useMemo } from 'react'
import { useDashboardCtx } from '@/context/DashboardContext'
import Topbar from '@/components/layout/Topbar'
import StatCard from '@/components/ui/StatCard'
import { groupByBrand, groupByBolge, fmt, scoreColor, SEGMENT_COLORS, SEGMENT_BG } from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend
} from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function DashboardPage() {
  const { scores, loading, filters, regions } = useDashboardCtx()

  const brands   = useMemo(() => groupByBrand(scores), [scores])
  const bolgeler = useMemo(() => groupByBolge(scores), [scores])

  const avg = (key: 'op'|'cu'|'sv'|'co') =>
    brands.length ? +(brands.reduce((s,b) => s + b[key], 0) / brands.length).toFixed(1) : 0

  const segs   = ['Premium','Mass','EV'].filter(s => brands.some(b => b.segment === s))
  const segAvg = segs.map(s => {
    const mb = brands.filter(b => b.segment === s)
    return mb.length ? +(mb.reduce((a,b) => a + b.ov, 0) / mb.length).toFixed(1) : 0
  })

  const regionName = regions.find(r => r.id === filters.regionId)?.name || 'Tüm Türkiye'
  const donem = filters.year ? (filters.quarter ? `${filters.year} ${filters.quarter}` : filters.year) : '2024–2025'

  return (
    <div className={styles.wrap}>
      <Topbar
        title="SSH KPI Rekabet Skorkartı"
        subtitle={`${brands.length} Marka · ${bolgeler.length} Bölge · 11 KPI · ${regionName} · ${donem}`}
        pills={[
          { label: '● Gerçek Veri', variant: 'green' },
          { label: '⚠ 3 KPI Kısıtlı', variant: 'amber' },
        ]}
      />
      <div className={styles.content}>
        {loading && (
          <div className={styles.loading}>
            <span className="loading-spin" /> Veriler yükleniyor...
          </div>
        )}
        {!loading && scores.length === 0 && (
          <div className={styles.noData}>⚠ Seçilen filtre için veri bulunamadı.</div>
        )}
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
                data={{
                  labels: segs,
                  datasets: [{
                    data: segAvg,
                    backgroundColor: segs.map(s => SEGMENT_BG[s as keyof typeof SEGMENT_BG]),
                    borderColor: segs.map(s => SEGMENT_COLORS[s as keyof typeof SEGMENT_COLORS]),
                    borderWidth: 1.5,
                    borderRadius: 7,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8496b0', font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { color: '#8496b0', font: { size: 11 } } },
                  },
                }}
              />
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHd}><h3>Top 10 Marka</h3><span className={styles.hint}>Genel skor</span></div>
            <div className={styles.hbarChart}>
              {brands.slice(0, 10).map(b => {
                const pct = Math.max(0, b.ov)
                const color = scoreColor(b.ov)
                return (
                  <div key={b.id} className={styles.hbarRow}>
                    <div className={styles.hbarLabel} style={{ color: SEGMENT_COLORS[b.segment as keyof typeof SEGMENT_COLORS] }}>{b.name}</div>
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
        </div>
        {bolgeler.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHd}><h3>Bölge Skorları</h3></div>
            <div className={styles.hbarChart}>
              {bolgeler.map(b => {
                const color = scoreColor(b.ov)
                return (
                  <div key={b.name} className={styles.hbarRow}>
                    <div className={styles.hbarLabel}>{b.name}</div>
                    <div className={styles.hbarTrack}>
                      <div className={styles.hbarFill} style={{ width: `${Math.max(0,b.ov)}%`, background: `${color}44`, borderRight: `3px solid ${color}` }} />
                      <span className={styles.hbarVal} style={{ color }}>{fmt(b.ov)}</span>
                    </div>
                    <div className={styles.hbarScore} style={{ color }}>{fmt(b.ov)}</div>
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
