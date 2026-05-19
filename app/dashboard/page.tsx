'use client'

import { useMemo, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import StatCard from '@/components/ui/StatCard'
import {
  MARKA_KPIS, BOLGE_KPIS, SEGMENT_KPIS, KPI_META,
  SEGMENT_COLORS, SEGMENT_BG, fmtKpi, overallScore, heatColor, isLowerBetter, segmentAvg
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Tooltip, Legend, LineElement, PointElement
} from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, LineElement, PointElement)

const SEGS = ['Mass','Premium','EV'] as const

export default function DashboardPage() {
  const [selSeg, setSelSeg] = useState<string>('')

  const markalar = useMemo(() => {
    const list = MARKA_KPIS.map(m => ({ ...m, ov: overallScore(m) }))
      .sort((a,b) => b.ov - a.ov)
    return selSeg ? list.filter(m => m.segment === selSeg) : list
  }, [selSeg])

  const segData = SEGMENT_KPIS
  const bolgeData = BOLGE_KPIS

  const segLabels = segData.map(s => s.segment)
  const segKpi5   = segData.map(s => s.kpis[4])
  const segKpi6   = segData.map(s => s.kpis[5])

  const totalIO     = MARKA_KPIS.reduce((a,m) => a+m.io_count, 0)
  const totalServis = MARKA_KPIS.reduce((a,m) => a+m.servis_count, 0)
  const avgKpi4     = (MARKA_KPIS.reduce((a,m)=>a+m.kpis[3],0)/MARKA_KPIS.length).toFixed(2)
  const avgKpi7     = (MARKA_KPIS.reduce((a,m)=>a+m.kpis[6],0)/MARKA_KPIS.length).toFixed(1)

  return (
    <div className={styles.wrap}>
      <Topbar
        title="SSH KPI Rekabet Skorkartı"
        subtitle={`${MARKA_KPIS.length} Marka · 7 Bölge · 12 KPI · ${totalIO.toLocaleString('tr-TR')} İş Emri`}
        pills={[
          { label: '● Gerçek Veri', variant: 'green' },
          { label: 'Ref: 2024–2025', variant: 'amber' },
        ]}
      />
      <div className={styles.content}>

        <div className={styles.statGrid}>
          <StatCard label="Toplam İş Emri"        value={totalIO.toLocaleString('tr-TR')} sub="2024–2025 dönemi"      accent="blue" />
          <StatCard label="Yetkili Servis"         value={totalServis}                      sub="Türkiye geneli"        accent="green" />
          <StatCard label="Ort. İşçilik Saati/İE"  value={avgKpi4 + ' sa'}                 sub="KPI 4 · tüm markalar"  accent="amber" />
          <StatCard label="Ort. Servis Süresi"     value={avgKpi7 + ' gün'}                sub="KPI 7 · açılış→fatura" accent="purple" />
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          {['', ...SEGS].map(s => (
            <button key={s} onClick={() => setSelSeg(s)}
              style={{
                padding:'5px 14px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid',
                background:   selSeg===s ? (s ? SEGMENT_BG[s]||'rgba(59,130,246,.2)' : 'rgba(59,130,246,.15)') : 'var(--surf2)',
                borderColor:  selSeg===s ? (s ? SEGMENT_COLORS[s]||'var(--blue)' : 'var(--blue)') : 'var(--bd)',
                color:        selSeg===s ? (s ? SEGMENT_COLORS[s]||'var(--blue)' : 'var(--blue)') : 'var(--tx2)',
                transition:'all .15s'
              }}>
              {s || 'Tüm Segmentler'}
            </button>
          ))}
        </div>

        <div className={styles.twoCol}>
          <div className={styles.card}>
            <div className={styles.cardHd}>
              <h3>Segment Karşılaştırması</h3>
              <span className={styles.hint}>İE başına tutar (₺)</span>
            </div>
            <div className={styles.chartWrap}>
              <Bar
                data={{
                  labels: segLabels,
                  datasets: [
                    {
                      label: 'İşçilik Tutarı (₺)',
                      data: segKpi5,
                      backgroundColor: segLabels.map(s => SEGMENT_BG[s]),
                      borderColor: segLabels.map(s => SEGMENT_COLORS[s]),
                      borderWidth: 1.5,
                      borderRadius: 7,
                    },
                    {
                      label: 'Parça Tutarı (₺)',
                      data: segKpi6,
                      backgroundColor: segLabels.map(s => SEGMENT_BG[s].replace('.35',',.15)')),
                      borderColor: segLabels.map(s => SEGMENT_COLORS[s]),
                      borderWidth: 1,
                      borderRadius: 7,
                    }
                  ]
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: true, position:'top', labels:{ color:'#8496b0', font:{size:10}, boxWidth:10 } },
                    tooltip: { callbacks: { label: (ctx) => `₺${Math.round(ctx.parsed.y).toLocaleString('tr-TR')}` } }
                  },
                  scales: {
                    y: { grid:{ color:'rgba(255,255,255,.05)' }, ticks:{ color:'#8496b0', font:{size:9}, callback:(v)=>`₺${Number(v).toLocaleString('tr-TR')}` } },
                    x: { grid:{ display:false }, ticks:{ color:'#8496b0', font:{size:11} } }
                  }
                }}
              />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginTop:12, paddingTop:12, borderTop:'1px solid var(--bd)' }}>
              {segData.map(s => (
                <div key={s.segment} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:9, color: SEGMENT_COLORS[s.segment], fontWeight:700, marginBottom:2 }}>{s.segment}</div>
                  <div style={{ fontSize:10, color:'var(--tx2)' }}>Ort. İşçilik: <b style={{color:'var(--tx)'}}>{fmtKpi(s.kpis[4],'tl0')}</b></div>
                  <div style={{ fontSize:10, color:'var(--tx2)' }}>Ort. Parça: <b style={{color:'var(--tx)'}}>{fmtKpi(s.kpis[5],'tl0')}</b></div>
                  <div style={{ fontSize:10, color:'var(--tx2)' }}>Ortalama Süre: <b style={{color:'var(--tx)'}}>{fmtKpi(s.kpis[6],'gun1')}</b></div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHd}>
              <h3>Marka Sıralaması</h3>
              <span className={styles.hint}>Normalize skor (segment ortalamasına göre)</span>
            </div>
            <div className={styles.hbarChart}>
              {markalar.slice(0,12).map((b, i) => {
                const color = b.ov>=70?'#10b981':b.ov>=55?'#3b82f6':b.ov>=40?'#f59e0b':'#ef4444'
                return (
                  <div key={b.marka} className={styles.hbarRow}>
                    <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:120 }}>
                      <span style={{ color:'var(--tx3)', fontSize:9, fontFamily:'var(--font-dm-mono)', width:14 }}>{i+1}</span>
                      <span className={styles.hbarLabel} style={{ color: SEGMENT_COLORS[b.segment] }}>{b.marka}</span>
                    </div>
                    <div className={styles.hbarTrack}>
                      <div className={styles.hbarFill} style={{ width:`${b.ov}%`, background:`${color}44`, borderRight:`3px solid ${color}` }}/>
                    </div>
                    <div className={styles.hbarScore} style={{ color }}>{b.ov}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>Bölge İş Emri Dağılımı</h3>
            <span className={styles.hint}>Toplam iş emri sayısı</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
            {bolgeData.map(b => {
              const maxIO = Math.max(...bolgeData.map(x=>x.io_count))
              const pct = (b.io_count/maxIO*100).toFixed(0)
              return (
                <div key={b.bolge} style={{ textAlign:'center', padding:12, background:'var(--surf2)', borderRadius:8, border:'1px solid var(--bd)' }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'var(--tx3)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>{b.bolge}</div>
                  <div style={{ height:50, display:'flex', alignItems:'flex-end', justifyContent:'center', marginBottom:4 }}>
                    <div style={{ width:24, background:'rgba(59,130,246,.35)', borderRadius:'3px 3px 0 0', height:`${pct}%`, borderTop:'2px solid #3b82f6', minHeight:6 }}/>
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--tx)', fontFamily:'var(--font-dm-mono)' }}>
                    {b.io_count.toLocaleString('tr-TR')}
                  </div>
                  <div style={{ fontSize:9, color:'var(--tx3)', marginTop:2 }}>iş emri</div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
