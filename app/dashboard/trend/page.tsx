'use client'

import { useMemo, useState } from 'react'
import { useDashboardCtx } from '@/app/dashboard/DashboardClient'
import Topbar from '@/components/layout/Topbar'
import {
  KPI_META, SEGMENTLER, SEGMENT_COLORS, SEGMENT_BG, SEGMENT_HEX, SEGMENT_HEX_BG, CAT_COLORS,
  fmtKpi, getKpisFromCube, DONEMLER
} from '@/lib/kpi'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Tooltip, Legend
} from 'chart.js'
import styles from './page.module.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

// Q ve FY dönemlerini ayır
const Q_DONEMLER  = DONEMLER.filter(d=>d.includes('-Q')).sort()
const FY_DONEMLER = DONEMLER.filter(d=>d.includes('-FY')).sort()

// Önceki dönem hesapla
function prevDonem(donem: string): string {
  if (!donem) return ''
  if (donem.endsWith('-FY')) {
    const y = parseInt(donem)
    return `${y-1}-FY`
  }
  const [y,q] = donem.split('-Q').map(Number)
  if (q===1) return `${y-1}-Q4`
  return `${y}-Q${q-1}`
}

export default function TrendPage() {
  const { selSeg, selBolge, selYas, selDonem } = useDashboardCtx()
  const [selKpi,   setSelKpi]   = useState(4) // KPI5 default
  const [extraRef, setExtraRef] = useState<string[]>([]) // ek karşılaştırma dönemleri

  const activeSeg = selSeg || 'Mass'
  const activeDonem = selDonem || Q_DONEMLER[Q_DONEMLER.length-1] // son Q
  const prevD = prevDonem(activeDonem)

  // Ana veri — seçili dönem
  const currKpis = useMemo(() =>
    getKpisFromCube(selSeg, selBolge, selYas, activeDonem),
    [selSeg, selBolge, selYas, activeDonem])

  // Önceki dönem
  const prevKpis = useMemo(() =>
    getKpisFromCube(selSeg, selBolge, selYas, prevD),
    [selSeg, selBolge, selYas, prevD])

  // Ek referans dönemler
  const extraKpis = useMemo(() =>
    extraRef.map(d => ({
      donem: d,
      kpis: getKpisFromCube(selSeg, selBolge, selYas, d)
    })),
    [extraRef, selSeg, selBolge, selYas])

  // Tüm Q'lar için trend çizgisi
  const trendKpis = useMemo(() =>
    Q_DONEMLER.map(d => getKpisFromCube(selSeg, selBolge, selYas, d)[selKpi]),
    [selSeg, selBolge, selYas, selKpi])

  const meta = KPI_META[selKpi]
  const filterLabel = [selBolge||'Tüm TR', selSeg||'Tüm Seg.', selYas==='Tümü'?'Tüm Yaş':selYas+'y'].join(' · ')

  // Değişim hesabı
  function change(curr: number, prev: number): string {
    if(!prev||!curr) return '—'
    const pct = ((curr-prev)/prev*100)
    return (pct>=0?'+':'')+pct.toFixed(1)+'%'
  }
  function changeColor(curr: number, prev: number, lob: boolean): string {
    if(!prev||!curr) return 'var(--tx3)'
    const better = lob ? curr<prev : curr>prev
    return better ? '#10b981' : '#f87171'
  }

  function toggleExtra(d: string) {
    setExtraRef(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev,d])
  }

  return (
    <div className={styles.wrap}>
      <Topbar title="Dönemsel Trend" subtitle={`${filterLabel} · ${activeDonem} vs ${prevD||'—'}`}/>
      <div className={styles.content}>

        {/* Dönem seçici */}
        <div style={{background:'var(--surf2)',border:'1px solid var(--bd)',borderRadius:8,padding:'10px 14px',marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',marginBottom:8}}>
            Dönem Seçimi — Sidebar'dan seçilen dönem kullanılır, yoksa son Q aktif
          </div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
            {Q_DONEMLER.map(d=>(
              <span key={d} style={{padding:'3px 8px',borderRadius:4,fontSize:10,
                background:activeDonem===d?'rgba(59,130,246,.15)':'var(--surf3)',
                color:activeDonem===d?'var(--blue)':'var(--tx3)',
                border:`1px solid ${activeDonem===d?'var(--blue)':'var(--bd)'}`,fontWeight:activeDonem===d?700:400}}>
                {d}
              </span>
            ))}
            {FY_DONEMLER.map(d=>(
              <span key={d} style={{padding:'3px 8px',borderRadius:4,fontSize:10,
                background:activeDonem===d?'rgba(139,92,246,.15)':'var(--surf3)',
                color:activeDonem===d?'#8b5cf6':'var(--tx3)',
                border:`1px solid ${activeDonem===d?'#8b5cf6':'var(--bd)'}`,fontWeight:activeDonem===d?700:400}}>
                {d}
              </span>
            ))}
          </div>

          {/* Ek karşılaştırma dönem seçimi */}
          <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',marginBottom:6}}>
            + Ek Karşılaştırma Dönemleri Ekle
          </div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {[...Q_DONEMLER,...FY_DONEMLER].filter(d=>d!==activeDonem&&d!==prevD).map(d=>(
              <button key={d} onClick={()=>toggleExtra(d)}
                style={{padding:'3px 8px',borderRadius:4,fontSize:10,cursor:'pointer',
                  background:extraRef.includes(d)?'rgba(16,185,129,.15)':'var(--surf3)',
                  color:extraRef.includes(d)?'#10b981':'var(--tx3)',
                  border:`1px solid ${extraRef.includes(d)?'#10b981':'var(--bd)'}`}}>
                {extraRef.includes(d)?'✓ ':''}{d}
              </button>
            ))}
          </div>
        </div>

        {/* 12 KPI karşılaştırma tablosu */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>12 KPI Dönem Karşılaştırması</h3>
            <span className={styles.hint}>{activeDonem} vs {prevD||'—'} {extraRef.length>0?'+ '+extraRef.join(', '):''}</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:'var(--surf2)'}}>
                  <th style={thS}>KPI</th>
                  <th style={thS}>Ad</th>
                  <th style={{...thS,color:'var(--blue)'}}>{activeDonem}</th>
                  <th style={thS}>{prevD||'Önceki'}</th>
                  <th style={thS}>Değişim</th>
                  {extraKpis.map(e=>(
                    <th key={e.donem} style={{...thS,color:'#10b981'}}>{e.donem}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KPI_META.map((k,i)=>{
                  const curr = currKpis[i]
                  const prev = prevKpis[i]
                  const lob  = i===6
                  const chg  = change(curr,prev)
                  const chgColor = changeColor(curr,prev,lob)
                  return (
                    <tr key={k.no} onClick={()=>setSelKpi(i)}
                      style={{borderBottom:'1px solid var(--bd)',cursor:'pointer',
                        background:selKpi===i?'rgba(59,130,246,.04)':'transparent'}}>
                      <td style={{...tdS,fontWeight:700,color:CAT_COLORS[k.kat]||'var(--tx3)'}}>KPI {k.no}</td>
                      <td style={{...tdS,color:'var(--tx2)',fontSize:10}}>{k.ad}</td>
                      <td style={{...tdS,fontFamily:'var(--font-dm-mono)',fontWeight:700,color:'var(--blue)'}}>
                        {fmtKpi(curr,k.fmt)}
                      </td>
                      <td style={{...tdS,fontFamily:'var(--font-dm-mono)',color:'var(--tx2)'}}>
                        {fmtKpi(prev,k.fmt)}
                      </td>
                      <td style={{...tdS,fontFamily:'var(--font-dm-mono)',color:chgColor,fontWeight:600}}>
                        {chg}
                      </td>
                      {extraKpis.map(e=>(
                        <td key={e.donem} style={{...tdS,fontFamily:'var(--font-dm-mono)',color:'#10b981'}}>
                          {fmtKpi(e.kpis[i],k.fmt)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seçili KPI trend çizgisi */}
        <div className={styles.card}>
          <div className={styles.cardHd}>
            <h3>KPI {meta.no}: {meta.ad} — Çeyrek Trend</h3>
            <span className={styles.hint}>{filterLabel}</span>
          </div>
          <div className={styles.chartWrap} style={{height:260}}>
            <Line
              data={{
                labels: Q_DONEMLER,
                datasets:[{
                  label: meta.ad,
                  data: trendKpis,
                  borderColor:'#3b82f6',
                  backgroundColor:'rgba(59,130,246,.08)',
                  borderWidth:2,pointRadius:5,
                  pointBackgroundColor: Q_DONEMLER.map(d=>d===activeDonem?'#3b82f6':d===prevD?'#f59e0b':'#3b82f666'),
                  pointBorderColor: Q_DONEMLER.map(d=>d===activeDonem?'#fff':d===prevD?'#fff':'transparent'),
                  pointBorderWidth:2,
                  fill:true,tension:0.35
                }]
              }}
              options={{responsive:true,maintainAspectRatio:false,
                plugins:{legend:{display:false},
                  tooltip:{callbacks:{label:(ctx)=>`${ctx.label}: ${fmtKpi(ctx.parsed.y as number,meta.fmt)}`}}},
                scales:{
                  y:{grid:{color:'rgba(255,255,255,.05)'},
                    ticks:{color:'#8496b0',font:{size:9},callback:(v)=>fmtKpi(Number(v),meta.fmt)}},
                  x:{grid:{display:false},ticks:{color:'#8496b0',font:{size:9}}}}}}/>
          </div>
        </div>

      </div>
    </div>
  )
}

const thS: React.CSSProperties = {padding:'8px 10px',textAlign:'left',fontSize:9,fontWeight:700,color:'var(--tx3)',borderBottom:'1px solid var(--bd)',whiteSpace:'nowrap'}
const tdS: React.CSSProperties = {padding:'7px 10px',borderBottom:'1px solid var(--bd)'}
