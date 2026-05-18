'use client'
import { useDashboardCtx } from '../DashboardClient'
import Topbar from '@/components/layout/Topbar'
import { SEGMENT_COLORS, SEGMENT_BG } from '@/lib/kpi'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'
import styles from '../page.module.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function TrendPage() {
  const { trendScores } = useDashboardCtx()
  const labels = trendScores.map(p => `${p.year} ${p.quarter}`)
  const chartOpts = { responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:'#8496b0',font:{size:10},boxWidth:10}}}, scales:{ y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8496b0',font:{size:10}}}, x:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8496b0',font:{size:10}}} } }

  return (
    <div className={styles.wrap}>
      <Topbar title="Dönemsel Trend" subtitle="Kategori ve segment bazlı trend analizi" />
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHd}><h3>Kategori Trendi</h3></div>
          <div className={styles.chartWrap} style={{height:280}}>
            <Line data={{ labels, datasets:[
              {label:'Genel',       data:trendScores.map(p=>p.score_overall), borderColor:'#fff',    backgroundColor:'rgba(255,255,255,.08)', borderWidth:2.5, pointRadius:4, tension:.3},
              {label:'Operasyonel', data:trendScores.map(p=>p.score_op),      borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,.08)',  borderWidth:1.5, pointRadius:3, tension:.3},
              {label:'Müşteri',     data:trendScores.map(p=>p.score_cu),      borderColor:'#10b981', backgroundColor:'rgba(16,185,129,.08)',  borderWidth:1.5, pointRadius:3, tension:.3},
              {label:'Servis',      data:trendScores.map(p=>p.score_sv),      borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,.08)',  borderWidth:1.5, pointRadius:3, tension:.3},
            ]}} options={chartOpts as any} />
          </div>
        </div>
        <div className={styles.card} style={{marginTop:14}}>
          <div className={styles.cardHd}><h3>Segment Trendi</h3></div>
          <div className={styles.chartWrap} style={{height:240}}>
            <Line data={{ labels, datasets:[
              {label:'Premium', data:trendScores.map(p=>p.seg_premium), borderColor:SEGMENT_COLORS.Premium, backgroundColor:SEGMENT_BG.Premium, borderWidth:2, pointRadius:4, tension:.3, spanGaps:true},
              {label:'Mass',    data:trendScores.map(p=>p.seg_mass),    borderColor:SEGMENT_COLORS.Mass,    backgroundColor:SEGMENT_BG.Mass,    borderWidth:2, pointRadius:4, tension:.3, spanGaps:true},
              {label:'EV',      data:trendScores.map(p=>p.seg_ev),      borderColor:SEGMENT_COLORS.EV,      backgroundColor:SEGMENT_BG.EV,      borderWidth:2, pointRadius:4, tension:.3, spanGaps:true},
            ]}} options={chartOpts as any} />
          </div>
        </div>
      </div>
    </div>
  )
}
