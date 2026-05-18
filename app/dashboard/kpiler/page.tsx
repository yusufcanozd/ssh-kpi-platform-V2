'use client'
import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/context/DashboardContext'
import Topbar from '@/components/layout/Topbar'
import { groupByBrand, fmt, scoreColor, SEGMENT_COLORS, SEGMENT_BG } from '@/lib/kpi'
import { KPI_CONFIG } from '@/types'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from '../page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function KpilerPage() {
  const { scores, loading } = useDashboardCtx()
  const brands = useMemo(() => groupByBrand(scores), [scores])
  const [selKpi, setSelKpi] = useState(0)

  const avgs = KPI_CONFIG.map((_, i) =>
    brands.length ? +(brands.reduce((s, b) => s + b.kpis[i], 0) / brands.length).toFixed(1) : 0
  )

  const catColor: Record<string, string> = {
    operational: '#3b82f6',
    customer: '#10b981',
    service: '#f59e0b',
    coverage: '#ef4444',
  }

  return (
    <div className={styles.wrap}>
      <Topbar title="KPI Detay" subtitle="11 KPI · Tıklayarak marka dağılımını görün" />
      <div className={styles.content}>
        {loading && <div className={styles.loading}><span className="loading-spin" /> Yükleniyor...</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {KPI_CONFIG.map((k, i) => {
            const isSelected = selKpi === i
            const bgColor = isSelected ? 'rgba(59,130,246,.06)' : 'var(--surf)'
            const borderColor = isSelected ? 'var(--blue)' : 'var(--bd)'
            return (
              <div
                key={k.key}
                onClick={() => setSelKpi(i)}
                style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 9, padding: 12, cursor: 'pointer', transition: 'all .12s' }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: catColor[k.category], marginBottom: 2 }}>{k.name}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-dm-mono)', color: scoreColor(avgs[i]) }}>{fmt(avgs[i])}</div>
                <div style={{ fontSize: 9, color: 'var(--tx3)', marginTop: 2 }}>%{(k.weight * 100).toFixed(1)}</div>
                {k.compliance && (
                  <span style={{ display: 'inline-block', fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4, marginTop: 4, background: 'rgba(239,68,68,.12)', color: '#f87171' }}>
                    Kısıtlı
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHd}><h3>{KPI_CONFIG[selKpi]?.name} — Marka Dağılımı</h3></div>
          <div className={styles.chartWrap}>
            <Bar
              data={{
                labels: brands.map(b => b.name),
                datasets: [{
                  data: brands.map(b => b.kpis[selKpi]),
                  backgroundColor: brands.map(b => SEGMENT_BG[b.segment as keyof typeof SEGMENT_BG]),
                  borderColor: brands.map(b => SEGMENT_COLORS[b.segment as keyof typeof SEGMENT_COLORS]),
                  borderWidth: 1,
                  borderRadius: 3,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8496b0', font: { size: 10 } } },
                  x: { grid: { display: false }, ticks: { color: '#8496b0', font: { size: 8 }, maxRotation: 45, autoSkip: false } },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
