'use client'

import { useState, useMemo } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  MARKA_KPIS, SEGMENT_KPIS, KPI_META, CAT_COLORS,
  SEGMENT_COLORS, SEGMENT_BG, YAS_COLORS,
  fmtKpi, isLowerBetter, getKpis
} from '@/lib/kpi'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function KpilerPage() {
  const { selSeg, selYas } = useDashboardCtx()
  const [selKpi, setSelKpi] = useState(0)

  const meta = KPI_META[selKpi]
  const lob  = isLowerBetter(selKpi)

  const markalar = useMemo(() => {
    let list = MARKA_KPIS.map(m => ({ ...m, kpis: getKpis(m, selYas) }))
    if (selSeg) list = list.filter(m => m.segment === selSeg)
    return [...list].sort((a,b) => lob ? a.kpis[selKpi]-b.kpis[selKpi] : b.kpis[selKpi]-a.kpis[selKpi])
  }, [selKpi, selSeg, selYas, lob])

  const segAvgLines = SEGMENT_KPIS
    .filter(s => !selSeg || s.segment === selSeg)
    .map(s => ({ segment: s.segment, avg: getKpis(s, selYas)[selKpi] ?? 0, color: SEGMENT_COLORS[s.segment] }))

  const chartData    = markalar.map(m => m.kpis[selKpi])
  const maxVal       = Math.max(...chartData, ...segAvgLines.map(s => s.avg), 0.001)

  return (
    <div className={styles.wrap}>
      <Topbar title="KPI Detay"
        subtitle={`12 KPI · ${selYas === 'Tümü' ? 'Tüm yaşlar' : selYas + ' yıl'} · ${selSeg || 'Tüm segmentler'}`} />
      <div className={styles.content}>

        {/* KPI Kartları */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
          {KPI_META.map((k,i) => {
            const allAvg = MARKA_KPIS.reduce((a,m) => a + (getKpis(m, selYas)[i] ?? 0), 0) / MARKA_KPIS.length
            return (
              <div key={k.no} onClick={() => setSelKpi(i)}
                style={{ background: selKpi===i?'rgba(59,130,246,.06)':'var(--surf)',
                  border:`1px solid ${selKpi===i?'var(--blue)':'var(--bd)'}`,
                  borderRadius:9, padding:'10px 12px', cursor:'pointer', transition:'all .12s' }}>
                <div style={{ fontSize:9, fontWeight:700, color: CAT_COLORS[k.kat]||'var(--tx3)', marginBottom:3, textTransform:'uppercase', letterSpacing:'.05em' }}>{k.kat}</div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--tx)', marginBottom:4, lineHeight:1.3 }}>KPI {k.no} · {k.ad}</div>
                <div style={{ fontSize:14, fontWeight:700, fontFamily:'var(--font-dm-mono)', color: selKpi===i?'var(--blue)':'var(--tx)' }}>
                  {fmtKpi(allAvg, k.fmt)}
                </div>
                {/* Yaş kırılımı mini */}
                <div style={{ display:'flex', gap:4, marginTop:4 }}>
                  {['0-3','3-7','7+'].map(yg => (
                    <div key={yg} style={{ flex:1, textAlign:'center' }}>
                      <div style={{ fontSize:7, color: YAS_COLORS[yg] }}>{yg}y</div>
                      <div style={{ fontSize:8, color:'var(--tx2)', fontFamily:'var(--font-dm-mono)' }}>
                        {fmtKpi(MARKA_KPIS.reduce((a,m) => a+(getKpis(m,yg)[i]??0), 0)/MARKA_KPIS.length, k.fmt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Seçili KPI grafik */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>KPI {meta.no}: {meta.ad}</h3>
            <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
              {lob && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:4, background:'rgba(16,185,129,.12)', color:'#10b981' }}>↓ Düşük daha iyi</span>}
            </div>
          </div>

          <div style={{ display:'flex', gap:16, marginBottom:10, flexWrap:'wrap' }}>
            {segAvgLines.map(s => (
              <div key={s.segment} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:22, borderTop:`2px dashed ${s.color}` }}/>
                <span style={{ fontSize:10, color:s.color, fontWeight:600 }}>
                  {s.segment} ort: {fmtKpi(s.avg, meta.fmt)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ position:'relative' }}>
            <div className={styles.chartWrap} style={{ height:280 }}>
              <Bar
                data={{
                  labels: markalar.map(m => m.marka),
                  datasets: [{
                    label: meta.ad,
                    data: chartData,
                    backgroundColor: markalar.map(m => SEGMENT_BG[m.segment]||'rgba(100,100,100,.35)'),
                    borderColor: markalar.map(m => SEGMENT_COLORS[m.segment]||'#aaa'),
                    borderWidth: 1, borderRadius: 3,
                  }]
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmtKpi(ctx.parsed.y as number, meta.fmt)}` } }
                  },
                  scales: {
                    y: { min:0, max: maxVal*1.15, grid:{ color:'rgba(255,255,255,.05)' }, ticks:{ color:'#8496b0', font:{size:9}, callback:(v) => fmtKpi(Number(v), meta.fmt) } },
                    x: { grid:{ display:false }, ticks:{ color:'#8496b0', font:{size:8}, maxRotation:45, autoSkip:false } }
                  }
                }}
              />
            </div>
            {segAvgLines.map(s => {
              const pct = maxVal > 0 ? (1 - s.avg / (maxVal*1.15)) * 100 : 50
              return (
                <div key={s.segment} style={{ position:'absolute', top:`${pct}%`, left:40, right:0, borderTop:`1.5px dashed ${s.color}`, pointerEvents:'none', zIndex:10 }}>
                  <span style={{ position:'absolute', right:4, top:-10, fontSize:9, color:s.color, fontWeight:700, background:'var(--surf)', padding:'1px 4px', borderRadius:3 }}>
                    {s.segment}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Segment × KPI × Yaş özet */}
        <div className={styles.card}>
          <div className={styles.cardHd}><h3>Segment × KPI × Yaş Grubu</h3></div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
              <thead>
                <tr style={{ background:'var(--surf2)' }}>
                  <th style={thS}>Segment</th>
                  <th style={thS}>Yaş</th>
                  {KPI_META.map(k => <th key={k.no} style={{ ...thS, textAlign:'center' }}>KPI {k.no}</th>)}
                </tr>
              </thead>
              <tbody>
                {SEGMENT_KPIS.filter(s => !selSeg || s.segment===selSeg).map(s =>
                  ['Tümü','0-3','3-7','7+'].map((yg, yi) => (
                    <tr key={s.segment+yg} style={{ borderBottom:'1px solid var(--bd)', background: yg==='Tümü'?'var(--surf2)':'transparent' }}>
                      {yi === 0 && <td rowSpan={4} style={{ padding:'8px 12px', fontWeight:700, color: SEGMENT_COLORS[s.segment], verticalAlign:'middle', borderBottom:'1px solid var(--bd)' }}>
                        <span style={{ background:SEGMENT_BG[s.segment], padding:'2px 8px', borderRadius:20, fontSize:10 }}>{s.segment}</span>
                      </td>}
                      <td style={{ padding:'5px 10px', color: yg==='Tümü'?'var(--tx2)':YAS_COLORS[yg], fontSize:9, fontWeight: yg==='Tümü'?400:600 }}>
                        {yg === 'Tümü' ? 'Tüm' : yg+'y'}
                      </td>
                      {getKpis(s, yg).map((v,i) => (
                        <td key={i} style={{ padding:'5px 7px', textAlign:'center', fontFamily:'var(--font-dm-mono)', fontSize:9, color:'var(--tx)', fontWeight: yg==='Tümü'?700:400 }}>
                          {fmtKpi(v, KPI_META[i].fmt)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

const thS: React.CSSProperties = { padding:'8px 10px', textAlign:'left', fontSize:8, fontWeight:700, color:'var(--tx3)', borderBottom:'1px solid var(--bd)', whiteSpace:'nowrap' }
