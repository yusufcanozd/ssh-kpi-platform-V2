'use client'

import { useMemo } from 'react'
import { useDashboardCtx } from './DashboardClient'
import Topbar from '@/components/layout/Topbar'
import StatCard from '@/components/ui/StatCard'
import {
  MARKA_KPIS, BOLGE_KPIS, SEGMENT_KPIS, KPI_META,
  SEGMENT_COLORS, SEGMENT_BG, YAS_COLORS, YAS_STATS,
  fmtKpi, overallScore, getKpis
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function DashboardPage() {
  const { selSeg, selBolge, selYas } = useDashboardCtx()

  const markalar = useMemo(() => {
    let list = MARKA_KPIS.map(m => ({ ...m, ov: overallScore(m, selYas) }))
    if (selSeg)   list = list.filter(m => m.segment === selSeg)
    if (selBolge) list = list // bölge filtresi marka verisinde yok, bölge sayfasında var
    return list.sort((a,b) => b.ov - a.ov)
  }, [selSeg, selBolge, selYas])

  const segData   = useMemo(() =>
    SEGMENT_KPIS.filter(s => !selSeg || s.segment === selSeg),
    [selSeg])

  const bolgeData = useMemo(() =>
    BOLGE_KPIS.filter(b => !selBolge || b.bolge === selBolge),
    [selBolge])

  const totalIO     = MARKA_KPIS.reduce((a,m) => a + m.io_count, 0)
  const totalServis = MARKA_KPIS.reduce((a,m) => a + m.servis_count, 0)
  const yasIO       = selYas === 'Tümü' ? totalIO : (YAS_STATS[selYas] ?? 0)

  // Segment bar grafik
  const segLabels = segData.map(s => s.segment)
  const segKpi5   = segData.map(s => getKpis(s, selYas)[4] ?? 0)
  const segKpi6   = segData.map(s => getKpis(s, selYas)[5] ?? 0)

  const avgKpi4 = (MARKA_KPIS.reduce((a,m) => a + (getKpis(m, selYas)[3] ?? 0), 0) / MARKA_KPIS.length).toFixed(2)
  const avgKpi7 = (MARKA_KPIS.reduce((a,m) => a + (getKpis(m, selYas)[6] ?? 0), 0) / MARKA_KPIS.length).toFixed(1)

  return (
    <div className={styles.wrap}>
      <Topbar
        title="SSH KPI Rekabet Skorkartı"
        subtitle={`${MARKA_KPIS.length} Marka · 7 Bölge · 12 KPI · ${totalIO.toLocaleString('tr-TR')} İş Emri`}
        pills={[
          { label: `● ${selYas === 'Tümü' ? 'Tüm Yaşlar' : selYas + ' Yıl'}`, variant: 'green' },
          { label: selSeg || 'Tüm Segmentler', variant: 'amber' },
        ]}
      />
      <div className={styles.content}>

        {/* Yaş kırılımı özet */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:8 }}>
          {(['0-3','3-7','7+'] as const).map(yg => (
            <div key={yg} style={{
              background: selYas===yg ? `${YAS_COLORS[yg]}18` : 'var(--surf2)',
              border:`1px solid ${selYas===yg ? YAS_COLORS[yg] : 'var(--bd)'}`,
              borderRadius:8, padding:'10px 14px', textAlign:'center'
            }}>
              <div style={{ fontSize:9, fontWeight:700, color: YAS_COLORS[yg], marginBottom:3 }}>{yg} YIL</div>
              <div style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-dm-mono)', color:'var(--tx)' }}>
                {YAS_STATS[yg].toLocaleString('tr-TR')}
              </div>
              <div style={{ fontSize:9, color:'var(--tx3)' }}>iş emri</div>
              <div style={{ fontSize:9, color:'var(--tx3)' }}>
                %{((YAS_STATS[yg]/totalIO)*100).toFixed(1)}
              </div>
            </div>
          ))}
          <StatCard label="Toplam İş Emri" value={totalIO.toLocaleString('tr-TR')} sub="Tüm dönem" accent="blue" />
        </div>

        <div className={styles.statGrid}>
          <StatCard label="Yetkili Servis"         value={totalServis}        sub="Türkiye geneli"        accent="green" />
          <StatCard label="Ort. İşçilik Saati/İE"  value={avgKpi4 + ' sa'}   sub={`KPI 4 · ${selYas}`}  accent="amber" />
          <StatCard label="Ort. Servis Süresi"      value={avgKpi7 + ' gün'}  sub={`KPI 7 · ${selYas}`}  accent="purple" />
          <StatCard label="Seçili İş Emri"          value={yasIO.toLocaleString('tr-TR')} sub={selYas==='Tümü'?'Tüm yaşlar':selYas+' yıl grubu'} accent="blue" />
        </div>

        <div className={styles.twoCol}>
          {/* Segment Karşılaştırma */}
          <div className={styles.card}>
            <div className={styles.cardHd}>
              <h3>Segment Karşılaştırması</h3>
              <span className={styles.hint}>İE başına tutar · {selYas === 'Tümü' ? 'Tüm yaşlar' : selYas + ' yıl'}</span>
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
                      borderWidth: 1.5, borderRadius: 7,
                    },
                    {
                      label: 'Parça Tutarı (₺)',
                      data: segKpi6,
                      backgroundColor: segLabels.map(s => SEGMENT_BG[s].replace('.35', ',.12)')),
                      borderColor: segLabels.map(s => SEGMENT_COLORS[s]),
                      borderWidth: 1, borderRadius: 7,
                    }
                  ]
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: true, position:'top', labels:{ color:'#8496b0', font:{size:10}, boxWidth:10 } },
                    tooltip: { callbacks: { label: (ctx) => `₺${Math.round(ctx.parsed.y as number).toLocaleString('tr-TR')}` } }
                  },
                  scales: {
                    y: { grid:{ color:'rgba(255,255,255,.05)' }, ticks:{ color:'#8496b0', font:{size:9}, callback:(v) => `₺${Number(v).toLocaleString('tr-TR')}` } },
                    x: { grid:{ display:false }, ticks:{ color:'#8496b0', font:{size:11} } }
                  }
                }}
              />
            </div>
            {/* Yaş kırılımı özet — segment başına */}
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${segData.length},1fr)`, gap:6, marginTop:10, paddingTop:10, borderTop:'1px solid var(--bd)' }}>
              {segData.map(s => (
                <div key={s.segment} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:9, color: SEGMENT_COLORS[s.segment], fontWeight:700, marginBottom:3 }}>{s.segment}</div>
                  {['0-3','3-7','7+'].map(yg => (
                    <div key={yg} style={{ fontSize:9, color:'var(--tx3)', marginBottom:1 }}>
                      <span style={{ color: YAS_COLORS[yg] }}>{yg}y</span>{' '}
                      {fmtKpi(getKpis(s, yg)[4], 'tl0')}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Marka Sıralaması */}
          <div className={styles.card}>
            <div className={styles.cardHd}>
              <h3>Marka Sıralaması</h3>
              <span className={styles.hint}>Normalize skor · {selYas === 'Tümü' ? 'Tüm yaşlar' : selYas + ' yıl'}</span>
            </div>
            <div className={styles.hbarChart}>
              {markalar.slice(0,12).map((b, i) => {
                const color = b.ov>=70?'#10b981':b.ov>=55?'#3b82f6':b.ov>=40?'#f59e0b':'#ef4444'
                return (
                  <div key={b.marka} className={styles.hbarRow}>
                    <div style={{ display:'flex', alignItems:'center', gap:4, minWidth:110 }}>
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

        {/* Bölge Dağılımı */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>Bölge İş Emri Dağılımı</h3>
            <span className={styles.hint}>Toplam iş emri · {selBolge || 'Tüm Türkiye'}</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
            {bolgeData.map(b => {
              const maxIO = Math.max(...BOLGE_KPIS.map(x => x.io_count))
              const pct = (b.io_count / maxIO * 100).toFixed(0)
              return (
                <div key={b.bolge} style={{ textAlign:'center', padding:'10px 6px', background: selBolge===b.bolge?'rgba(59,130,246,.08)':'var(--surf2)', borderRadius:8, border:`1px solid ${selBolge===b.bolge?'var(--blue)':'var(--bd)'}` }}>
                  <div style={{ fontSize:8, fontWeight:700, color:'var(--tx3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'.04em', lineHeight:1.3 }}>{b.bolge}</div>
                  <div style={{ height:40, display:'flex', alignItems:'flex-end', justifyContent:'center', marginBottom:3 }}>
                    <div style={{ width:20, background:'rgba(59,130,246,.4)', borderRadius:'2px 2px 0 0', height:`${pct}%`, borderTop:'2px solid #3b82f6', minHeight:4 }}/>
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--tx)', fontFamily:'var(--font-dm-mono)' }}>
                    {b.io_count.toLocaleString('tr-TR')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
