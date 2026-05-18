'use client'
import { useMemo } from 'react'
import { useDashboardCtx } from '@/context/DashboardContext'
import Topbar from '@/components/layout/Topbar'
import { groupByPeriod, SEGMENT_COLORS, SEGMENT_BG } from '@/lib/kpi'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'
import styles from '../page.module.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function TrendPage() {
  const { scores, loading } = useDashboardCtx()
  const periods = useMemo(() => groupByPeriod(scores), [scores])
  const labels = periods.map(p => p.label)

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color:'#8496b0', font:{size:10}, boxWidth:10 } } },
    scales: {
      y: { min:0, max:100, grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'#8496b0',font:{size:10}} },
      x: { grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'#8496b0',font:{size:10}} },
    },
  }

  return (
    <div className={styles.wrap}>
      <Topbar title="Dönemsel Trend" subtitle="Kategori ve segment bazlı trend analizi" />
      <div className={styles.content}>
        {loading && <div className={styles.loading}><span className="loading-spin" /> Yükleniyor...</div>}

        <div className={styles.card}>
          <div className={styles.cardHd}><h3>Kategori Trendi</h3></div>
          <div className={styles.chartWrap} style={{height:280}}>
            <Line data={{
              labels,
              datasets: [
                { label:'Genel',         data:periods.map(p=>p.ov), borderColor:'#fff',       backgroundColor:'rgba(255,255,255,.08)', borderWidth:2.5, pointRadius:4, tension:.3 },
                { label:'Operasyonel',   data:periods.map(p=>p.op), borderColor:'#3b82f6',    backgroundColor:'rgba(59,130,246,.08)',  borderWidth:1.5, pointRadius:3, tension:.3 },
                { label:'Müşteri',       data:periods.map(p=>p.cu), borderColor:'#10b981',    backgroundColor:'rgba(16,185,129,.08)',  borderWidth:1.5, pointRadius:3, tension:.3 },
                { label:'Servis',        data:periods.map(p=>p.sv), borderColor:'#f59e0b',    backgroundColor:'rgba(245,158,11,.08)',  borderWidth:1.5, pointRadius:3, tension:.3 },
                { label:'Kapsam',        data:periods.map(p=>p.co), borderColor:'#ef4444',    backgroundColor:'rgba(239,68,68,.08)',   borderWidth:1.5, pointRadius:3, tension:.3 },
              ],
            }} options={chartOptions} />
          </div>
        </div>

        <div className={styles.card} style={{marginTop:14}}>
          <div className={styles.cardHd}><h3>Segment Trendi</h3></div>
          <div className={styles.chartWrap} style={{height:240}}>
            <Line data={{
              labels,
              datasets: ['Premium','Mass','EV'].map(seg => ({
                label: seg,
                data: periods.map(p => {
                  const sd = p.segs[seg]
                  return sd ? +(sd.ov/sd.n).toFixed(1) : null
                }),
                borderColor: SEGMENT_COLORS[seg as keyof typeof SEGMENT_COLORS],
                backgroundColor: SEGMENT_BG[seg as keyof typeof SEGMENT_BG],
                borderWidth: 2, pointRadius: 4, tension: .3, spanGaps: true,
              })),
            }} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  )
}
